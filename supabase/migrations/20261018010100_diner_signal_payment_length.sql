-- La carta envía el método con detalle ("Efectivo (Monto Exacto: S/ 45.00)")
-- y el límite de 30 caracteres lo cortaba. Se amplía a 80.
CREATE OR REPLACE FUNCTION public.diner_table_signal(p_table text, p_signal text, p_payment_method text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits integer := nullif(regexp_replace(coalesce(p_table, ''), '[^0-9]', '', 'g'), '')::integer;
  v_method text := nullif(left(btrim(coalesce(p_payment_method, '')), 80), '');
BEGIN
  IF v_digits IS NULL OR p_signal NOT IN ('waiter', 'bill') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Mesa o aviso no válido.';
  END IF;

  IF p_signal = 'bill' THEN
    UPDATE public.orders
    SET account_requested = true,
        payment_method = coalesce(v_method, payment_method),
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
