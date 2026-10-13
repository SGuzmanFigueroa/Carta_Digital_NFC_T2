BEGIN;

-- Existing paid/delivered rows have no event timestamp. Preserve their best
-- available date but explicitly mark it as estimated in the report.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_date_estimated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completion_date_estimated boolean NOT NULL DEFAULT false;
UPDATE public.orders SET paid_at = coalesce(updated_at, created_at), payment_date_estimated = true
WHERE status = 'cobrado' AND paid_at IS NULL;
UPDATE public.orders SET completed_at = coalesce(updated_at, created_at), completion_date_estimated = true
WHERE status IN ('entregado', 'cobrado') AND completed_at IS NULL;

CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.stamp_order_report_events()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.paid_at := NULL; NEW.completed_at := NULL;
    NEW.payment_date_estimated := false; NEW.completion_date_estimated := false;
  ELSE
    -- Clients cannot replace timestamps on later edits or retries.
    NEW.paid_at := OLD.paid_at; NEW.completed_at := OLD.completed_at;
    NEW.payment_date_estimated := OLD.payment_date_estimated;
    NEW.completion_date_estimated := OLD.completion_date_estimated;
  END IF;
  IF NEW.status = 'cobrado' AND NEW.paid_at IS NULL THEN
    NEW.paid_at := statement_timestamp(); NEW.payment_date_estimated := false;
  END IF;
  IF NEW.status IN ('entregado', 'cobrado') AND NEW.completed_at IS NULL THEN
    NEW.completed_at := statement_timestamp(); NEW.completion_date_estimated := false;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER stamp_order_report_events BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION private.stamp_order_report_events();
CREATE INDEX IF NOT EXISTS orders_report_paid_idx ON public.orders(paid_at) WHERE status = 'cobrado';
CREATE INDEX IF NOT EXISTS orders_report_completed_idx ON public.orders(completed_at) WHERE status IN ('entregado', 'cobrado');
CREATE INDEX IF NOT EXISTS order_items_report_order_idx ON public.order_items(order_id);

-- Capture actual table state changes instead of manufacturing past occupancy.
CREATE TABLE private.report_occupancy_samples (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sampled_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  total_tables integer NOT NULL CHECK (total_tables >= 0),
  occupied_tables integer NOT NULL CHECK (occupied_tables BETWEEN 0 AND total_tables)
);
CREATE INDEX report_occupancy_time_idx ON private.report_occupancy_samples(sampled_at, id);
REVOKE ALL ON private.report_occupancy_samples FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION private.capture_report_occupancy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- Serialize snapshots, including concurrent table changes, per installation.
  PERFORM pg_advisory_xact_lock(251100);
  INSERT INTO private.report_occupancy_samples(sampled_at, total_tables, occupied_tables)
  SELECT clock_timestamp(), count(*)::integer,
    count(*) FILTER (WHERE status IN ('comiendo', 'demora', 'cuenta', 'qr'))::integer
  FROM public.restaurant_tables;
  RETURN NULL;
END $$;
CREATE TRIGGER capture_report_occupancy AFTER INSERT OR UPDATE OR DELETE ON public.restaurant_tables
FOR EACH STATEMENT EXECUTE FUNCTION private.capture_report_occupancy();
INSERT INTO private.report_occupancy_samples(total_tables, occupied_tables)
SELECT count(*)::integer, count(*) FILTER (WHERE status IN ('comiendo', 'demora', 'cuenta', 'qr'))::integer
FROM public.restaurant_tables;

CREATE OR REPLACE FUNCTION public.get_daily_sales_report(p_date date DEFAULT (now() AT TIME ZONE 'America/Lima')::date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  day_start timestamptz; day_end timestamptz; cutoff timestamptz;
  revenue numeric; completed bigint; best_dish jsonb;
  occupied_average numeric; observed numeric; elapsed numeric;
  estimated_paid bigint; estimated_completed bigint;
BEGIN
  IF coalesce(auth.jwt()->'app_metadata'->>'reports_role', '') <> 'admin'
     OR coalesce(auth.jwt()->'app_metadata'->>'reports_scope', '') <> 'primary' THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;
  IF p_date IS NULL OR p_date < DATE '2000-01-01' OR p_date > DATE '2099-12-31'
     OR p_date > (now() AT TIME ZONE 'America/Lima')::date THEN
    RAISE EXCEPTION 'Fecha inválida' USING ERRCODE = '22023';
  END IF;
  day_start := p_date::timestamp AT TIME ZONE 'America/Lima';
  day_end := (p_date + 1)::timestamp AT TIME ZONE 'America/Lima';
  cutoff := least(day_end, now());
  elapsed := extract(epoch FROM cutoff - day_start);

  SELECT coalesce(sum(total), 0), count(*) FILTER (WHERE payment_date_estimated)
    INTO revenue, estimated_paid FROM public.orders
    WHERE status = 'cobrado' AND paid_at >= day_start AND paid_at < day_end AND paid_at <= cutoff;
  SELECT count(*), count(*) FILTER (WHERE completion_date_estimated)
    INTO completed, estimated_completed FROM public.orders
    WHERE status IN ('entregado', 'cobrado') AND completed_at >= day_start
      AND completed_at < day_end AND completed_at <= cutoff;

  -- Aggregate item units separately so joins cannot multiply order totals.
  SELECT jsonb_build_object('id', dish_id, 'name', name, 'units', units) INTO best_dish
  FROM (
    SELECT i.dish_id, min(i.name) AS name, sum(i.quantity) AS units
    FROM public.order_items i JOIN public.orders o ON o.id = i.order_id
    WHERE o.status = 'cobrado' AND o.paid_at >= day_start AND o.paid_at < day_end AND o.paid_at <= cutoff
    GROUP BY i.dish_id, CASE WHEN i.dish_id IS NULL THEN i.name ELSE NULL END
  ) ranked ORDER BY units DESC, name ASC, dish_id ASC NULLS LAST LIMIT 1;

  WITH points AS (
    (SELECT * FROM private.report_occupancy_samples WHERE sampled_at <= day_start
      ORDER BY sampled_at DESC, id DESC LIMIT 1)
    UNION ALL
    SELECT * FROM private.report_occupancy_samples WHERE sampled_at > day_start AND sampled_at < cutoff
  ), intervals AS (
    SELECT total_tables, occupied_tables,
      extract(epoch FROM least(coalesce(lead(sampled_at) OVER (ORDER BY sampled_at, id), cutoff), cutoff)
        - greatest(sampled_at, day_start)) AS seconds
    FROM points
  )
  SELECT coalesce(sum(seconds), 0),
    round(sum(100.0 * occupied_tables / nullif(total_tables, 0) * seconds) / nullif(sum(seconds), 0), 2)
    INTO observed, occupied_average FROM intervals WHERE seconds > 0 AND total_tables > 0;

  RETURN jsonb_build_object(
    'date', to_char(p_date, 'YYYY-MM-DD'), 'timezone', 'America/Lima', 'currency', 'PEN',
    'totalRevenue', round(revenue, 2), 'completedOrders', completed,
    'bestSellingDish', best_dish, 'averageOccupancyPercent', occupied_average,
    'occupancy', jsonb_build_object('observedSeconds', round(observed, 3), 'elapsedSeconds', round(elapsed, 3),
      'coveragePercent', CASE WHEN elapsed > 0 THEN round(100.0 * observed / elapsed, 2) ELSE 0 END),
    'dataQuality', jsonb_build_object('estimatedPaymentDates', estimated_paid, 'estimatedCompletionDates', estimated_completed)
  );
END $$;
REVOKE ALL ON FUNCTION public.get_daily_sales_report(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_daily_sales_report(date) TO authenticated;
REVOKE ALL ON FUNCTION private.capture_report_occupancy() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.stamp_order_report_events() FROM PUBLIC, anon, authenticated;
COMMIT;
