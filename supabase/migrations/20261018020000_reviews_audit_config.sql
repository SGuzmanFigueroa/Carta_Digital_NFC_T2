-- ==========================================================
-- Fase 2C · Reseñas, auditoría inmutable y configuración compartida
--           (Tareas 13 y 29)
-- ----------------------------------------------------------
-- 1. customer_reviews: las reseñas nunca se guardaban (la tabla no existía y
--    el error se ignoraba). El comensal las envía por submit_review; si prueba
--    que el pedido es suyo (clave del pedido) quedan verificadas, una por pedido.
-- 2. staff_audit_logs inmutable: quién hizo la acción lo pone la base según el
--    JWT (no el navegador) y ninguna fila se puede editar ni borrar.
-- 3. system_config.payment_config / geofence_config: los datos de pago (Yape,
--    Plin) y la ubicación de la geocerca vivían solo en el localStorage del
--    admin, así que en el celular del comensal se usaban valores por defecto.
-- ==========================================================

-- ---------- 1. Reseñas ----------
CREATE TABLE IF NOT EXISTS public.customer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text REFERENCES public.orders(id) ON DELETE SET NULL,
  table_number text NOT NULL CHECK (length(table_number) BETWEEN 1 AND 40),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  tip_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (tip_amount BETWEEN 0 AND 1000),
  comments text CHECK (length(comments) <= 1000),
  payment_method text CHECK (length(payment_method) <= 40),
  operation_code text CHECK (length(operation_code) <= 20),
  voucher_uploaded boolean NOT NULL DEFAULT false,
  -- true = el comensal probó con la clave del pedido que la reseña es suya.
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customer_reviews_one_per_order ON public.customer_reviews (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS customer_reviews_created_idx ON public.customer_reviews (created_at DESC);

ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_reviews FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.customer_reviews FROM authenticated;
DROP POLICY IF EXISTS customer_reviews_admin_read ON public.customer_reviews;
CREATE POLICY customer_reviews_admin_read ON public.customer_reviews FOR SELECT TO authenticated
  USING ((SELECT public.current_staff_role()) = 'admin');

CREATE OR REPLACE FUNCTION public.submit_review(
  p_table_number text,
  p_rating integer,
  p_tip_amount numeric DEFAULT 0,
  p_comments text DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_operation_code text DEFAULT NULL,
  p_voucher_uploaded boolean DEFAULT false,
  p_order_id text DEFAULT NULL,
  p_order_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id text;
  v_id uuid;
BEGIN
  IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'La calificación debe ser de 1 a 5.';
  END IF;
  IF coalesce(p_tip_amount, 0) NOT BETWEEN 0 AND 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Propina no válida.';
  END IF;

  -- Solo se vincula al pedido si la clave coincide (pedido del propio comensal).
  IF p_order_id IS NOT NULL AND p_order_key IS NOT NULL THEN
    SELECT id INTO v_order_id
    FROM public.orders
    WHERE id = p_order_id AND idempotency_key::text = lower(p_order_key);
  END IF;

  INSERT INTO public.customer_reviews
    (order_id, table_number, rating, tip_amount, comments, payment_method, operation_code, voucher_uploaded, verified)
  VALUES (
    v_order_id,
    left(upper(btrim(coalesce(p_table_number, 'SIN MESA'))), 40),
    p_rating,
    coalesce(p_tip_amount, 0),
    nullif(left(btrim(coalesce(p_comments, '')), 1000), ''),
    nullif(left(btrim(coalesce(p_payment_method, '')), 40), ''),
    nullif(left(btrim(coalesce(p_operation_code, '')), 20), ''),
    coalesce(p_voucher_uploaded, false),
    v_order_id IS NOT NULL
  )
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Este pedido ya tiene una reseña. ¡Gracias!';
END;
$$;
REVOKE ALL ON FUNCTION public.submit_review(text, integer, numeric, text, text, text, boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_review(text, integer, numeric, text, text, text, boolean, text, text) TO anon, authenticated;

-- ---------- 2. Auditoría inmutable ----------
ALTER TABLE public.staff_audit_logs
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS actor_auth_id uuid,
  ADD COLUMN IF NOT EXISTS actor_role text,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- El navegador no decide quién firmó el registro: con sesión de personal, la
-- base pone su nombre, rol y cuenta. Sin sesión (rutas del servidor con
-- service_role) se respeta performed_by.
CREATE OR REPLACE FUNCTION private.stamp_staff_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name text;
BEGIN
  NEW.created_at := now();
  NEW.actor_auth_id := auth.uid();
  NEW.actor_role := public.current_staff_role();
  IF NEW.actor_auth_id IS NOT NULL THEN
    SELECT name INTO v_name FROM public.staff WHERE auth_user_id = NEW.actor_auth_id;
    NEW.performed_by := coalesce(v_name, 'Cuenta sin colaborador');
  END IF;
  NEW.action := left(btrim(NEW.action), 120);
  NEW.details := left(NEW.details, 1000);
  NEW.target := left(NEW.target, 160);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.forbid_audit_log_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'La auditoría no se puede modificar ni borrar.';
END;
$$;

DROP TRIGGER IF EXISTS stamp_staff_audit_log ON public.staff_audit_logs;
CREATE TRIGGER stamp_staff_audit_log BEFORE INSERT ON public.staff_audit_logs
  FOR EACH ROW EXECUTE FUNCTION private.stamp_staff_audit_log();
DROP TRIGGER IF EXISTS forbid_audit_log_changes ON public.staff_audit_logs;
CREATE TRIGGER forbid_audit_log_changes BEFORE UPDATE OR DELETE ON public.staff_audit_logs
  FOR EACH ROW EXECUTE FUNCTION private.forbid_audit_log_changes();
CREATE INDEX IF NOT EXISTS staff_audit_logs_created_idx ON public.staff_audit_logs (created_at DESC);

-- ---------- 3. Configuración compartida ----------
ALTER TABLE public.system_config
  ADD COLUMN IF NOT EXISTS payment_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS geofence_config jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  -- Los QR de Yape/Plin se guardan como imagen en base64: tope de ~1,5 MB.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_config_payment_config_size') THEN
    ALTER TABLE public.system_config ADD CONSTRAINT system_config_payment_config_size
      CHECK (pg_column_size(payment_config) < 1500000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_config_geofence_config_size') THEN
    ALTER TABLE public.system_config ADD CONSTRAINT system_config_geofence_config_size
      CHECK (pg_column_size(geofence_config) < 10000);
  END IF;
END $$;
