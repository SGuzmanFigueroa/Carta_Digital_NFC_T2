-- ==========================================================
-- Fase 3 · Pagos Yape/Plin "pendientes de verificación" (Tarea 41)
-- ----------------------------------------------------------
-- Antes, al escribir cualquier código de 6 a 8 dígitos, la carta le decía al
-- comensal "pago registrado" y nadie lo comprobaba. Ahora:
-- - orders.payment_status: none · pending_verification · verified · rejected.
-- - Al pedir la cuenta con Yape o Plin, los pedidos abiertos de la mesa quedan
--   'pending_verification' con el código de operación como referencia.
-- - El personal confirma o rechaza con review_table_payment (queda en la
--   auditoría con su nombre). El comensal ve el estado al consultar su pedido.
-- ==========================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payment_claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_reviewed_by text,
  ADD COLUMN IF NOT EXISTS payment_reviewed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_status_check') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
      CHECK (payment_status IN ('none', 'pending_verification', 'verified', 'rejected'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS orders_payment_pending_idx ON public.orders (payment_status) WHERE payment_status = 'pending_verification';

-- ---------- Respuesta de pedido con el estado del pago ----------
CREATE OR REPLACE FUNCTION private.order_payload(p_order_id text)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'table_number', o.table_number,
    'pax', o.pax,
    'origin', o.origin,
    'status', o.status,
    'subtotal', o.subtotal,
    'total', o.total,
    'payment_status', o.payment_status,
    'created_at', o.created_at,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id,
        'dish_id', i.dish_id,
        'name', i.name,
        'quantity', i.quantity,
        'price', i.price,
        'notes', i.notes,
        'station', i.station
      ) ORDER BY i.line_no NULLS LAST, i.created_at, i.id)
      FROM public.order_items AS i
      WHERE i.order_id = o.id
    ), '[]'::jsonb)
  )
  FROM public.orders AS o
  WHERE o.id = p_order_id;
$$;

-- ---------- Pedir la cuenta: Yape/Plin queda por verificar ----------
DROP FUNCTION IF EXISTS public.diner_table_signal(text, text, text, text);
CREATE OR REPLACE FUNCTION public.diner_table_signal(
  p_table text,
  p_signal text,
  p_payment_method text DEFAULT NULL,
  p_table_token text DEFAULT NULL,
  p_payment_kind text DEFAULT NULL,
  p_operation_code text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits integer := nullif(regexp_replace(coalesce(p_table, ''), '[^0-9]', '', 'g'), '')::integer;
  v_method text := nullif(left(btrim(coalesce(p_payment_method, '')), 80), '');
  v_code text := nullif(regexp_replace(coalesce(p_operation_code, ''), '[^0-9]', '', 'g'), '');
  v_digital boolean := p_payment_kind IN ('yape', 'plin');
BEGIN
  IF p_payment_kind IS NOT NULL AND p_payment_kind NOT IN ('yape', 'plin', 'tarjeta', 'efectivo') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Método de pago no válido.';
  END IF;
  IF v_code IS NOT NULL AND length(v_code) NOT BETWEEN 6 AND 8 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'El código de operación debe tener entre 6 y 8 dígitos.';
  END IF;
  IF v_digits IS NULL OR p_signal NOT IN ('waiter', 'bill') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Mesa o aviso no válido.';
  END IF;
  IF public.current_staff_role() IS NULL AND NOT private.table_token_ok(p_table, p_table_token) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Escanea el código QR de tu mesa para continuar.';
  END IF;

  IF p_signal = 'bill' THEN
    UPDATE public.orders
    SET account_requested = true,
        payment_method = coalesce(v_method, payment_method),
        -- Yape/Plin: el comensal dice que pagó; el personal debe confirmarlo.
        payment_status = CASE WHEN v_digital THEN 'pending_verification' ELSE payment_status END,
        payment_reference = CASE WHEN v_digital THEN v_code ELSE payment_reference END,
        payment_claimed_at = CASE WHEN v_digital THEN now() ELSE payment_claimed_at END,
        updated_at = now()
    WHERE nullif(regexp_replace(table_number, '[^0-9]', '', 'g'), '')::integer = v_digits
      AND status NOT IN ('cobrado', 'cancelado');
  END IF;

  UPDATE public.restaurant_tables
  SET status = CASE WHEN p_signal = 'bill' THEN 'cuenta' ELSE 'demora' END,
      updated_at = now()
  WHERE nullif(regexp_replace(number, '[^0-9]', '', 'g'), '')::integer = v_digits;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.diner_table_signal(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.diner_table_signal(text, text, text, text, text, text) TO anon, authenticated;

-- ---------- El personal confirma o rechaza el pago de una mesa ----------
CREATE OR REPLACE FUNCTION public.review_table_payment(p_table text, p_approve boolean)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reviewer text;
  v_count integer;
  v_refs text;
  v_digits integer := private.table_number_of(p_table);
BEGIN
  IF public.current_staff_role() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Solo el personal puede verificar pagos.';
  END IF;
  IF v_digits IS NULL OR p_approve IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Mesa o decisión no válida.';
  END IF;
  SELECT name INTO v_reviewer FROM public.staff WHERE auth_user_id = auth.uid();

  UPDATE public.orders
  SET payment_status = CASE WHEN p_approve THEN 'verified' ELSE 'rejected' END,
      payment_reviewed_by = coalesce(v_reviewer, 'Personal'),
      payment_reviewed_at = now(),
      -- Rechazado: la cuenta vuelve a estar pendiente de pago.
      account_requested = CASE WHEN p_approve THEN account_requested ELSE false END,
      updated_at = now()
  WHERE private.table_number_of(table_number) = v_digits
    AND payment_status = 'pending_verification'
    AND status NOT IN ('cobrado', 'cancelado');
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count > 0 THEN
    SELECT string_agg(DISTINCT payment_reference, ', ') INTO v_refs
    FROM public.orders
    WHERE private.table_number_of(table_number) = v_digits AND payment_reviewed_at > now() - interval '1 minute';
    INSERT INTO public.staff_audit_logs (action, target, details, level, event_type)
    VALUES (
      CASE WHEN p_approve THEN 'Pago digital confirmado' ELSE 'Pago digital rechazado' END,
      'Mesa ' || v_digits,
      'Operación: ' || coalesce(v_refs, 'sin código') || ' · ' || v_count || ' pedido(s)',
      CASE WHEN p_approve THEN 'info' ELSE 'warning' END,
      CASE WHEN p_approve THEN 'PAYMENT_VERIFIED' ELSE 'PAYMENT_REJECTED' END
    );
  END IF;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.review_table_payment(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_table_payment(text, boolean) TO authenticated;
