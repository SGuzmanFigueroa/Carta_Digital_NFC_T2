-- ==========================================================
-- Fase 3 · QR firmado por mesa y geocerca en el servidor (Tareas 9 y 10)
-- ----------------------------------------------------------
-- Antes bastaba con cambiar "?mesa=4" en la URL (o conocer el número de
-- mesa) para pedir, pedir la cuenta o llamar al mozo desde cualquier lugar.
-- - Cada mesa tiene un código secreto de 128 bits (private.table_qr_tokens)
--   que va dentro de su QR: /menu?mesa=MESA%2004&t=<código>.
-- - place_order, diner_table_signal y create_waiter_call exigen ese código a
--   quien no tiene sesión de personal.
-- - Si la geocerca está activa (system_config.geofence_config.enabled), el
--   pedido del comensal debe venir con una ubicación dentro del radio.
-- - El admin obtiene los códigos con get_table_qr_tokens y puede invalidar
--   los QR impresos con rotate_table_qr_tokens.
-- ==========================================================

CREATE TABLE IF NOT EXISTS private.table_qr_tokens (
  table_number integer PRIMARY KEY CHECK (table_number BETWEEN 1 AND 999),
  token text NOT NULL UNIQUE,
  rotated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION private.new_qr_token()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = ''
AS $$
  SELECT rtrim(translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/', '-_'), '=');
$$;

CREATE OR REPLACE FUNCTION private.table_number_of(p_table text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT nullif(regexp_replace(coalesce(p_table, ''), '[^0-9]', '', 'g'), '')::integer;
$$;

-- ¿El código corresponde a esa mesa? (comparación en tiempo constante no es
-- necesaria aquí: el código no se deriva de ningún secreto reutilizable).
CREATE OR REPLACE FUNCTION private.table_token_ok(p_table text, p_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM private.table_qr_tokens
    WHERE table_number = private.table_number_of(p_table)
      AND token = btrim(coalesce(p_token, ''))
      AND length(btrim(coalesce(p_token, ''))) >= 20
  );
$$;

-- Geocerca: sin configurar o desactivada = permitido. Activa = la ubicación
-- debe caer dentro del radio (se concede como margen la precisión del GPS,
-- hasta 100 m). La ubicación la reporta el celular: frena el uso remoto
-- casual, no a alguien que falsifique su GPS a propósito.
CREATE OR REPLACE FUNCTION private.geofence_ok(p_lat double precision, p_lng double precision, p_accuracy double precision)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cfg jsonb;
  v_lat double precision;
  v_lng double precision;
  v_radius double precision;
  v_distance double precision;
BEGIN
  SELECT geofence_config INTO v_cfg FROM public.system_config WHERE id = 'primary';
  IF v_cfg IS NULL OR coalesce((v_cfg ->> 'enabled')::boolean, false) IS NOT TRUE THEN
    RETURN true;
  END IF;
  v_lat := (v_cfg ->> 'latitude')::double precision;
  v_lng := (v_cfg ->> 'longitude')::double precision;
  v_radius := coalesce((v_cfg ->> 'radiusMeters')::double precision, 150);
  IF v_lat IS NULL OR v_lng IS NULL THEN
    RETURN true;
  END IF;
  IF p_lat IS NULL OR p_lng IS NULL OR p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN
    RETURN false;
  END IF;
  -- Haversine (radio terrestre 6.371 km).
  v_distance := 2 * 6371000 * asin(sqrt(
    power(sin(radians(p_lat - v_lat) / 2), 2) +
    cos(radians(v_lat)) * cos(radians(p_lat)) * power(sin(radians(p_lng - v_lng) / 2), 2)
  ));
  RETURN v_distance <= v_radius + least(greatest(coalesce(p_accuracy, 0), 0), 100);
END;
$$;

-- ---------- Códigos para imprimir los QR (solo admin) ----------
CREATE OR REPLACE FUNCTION public.get_table_qr_tokens(p_count integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF public.current_staff_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Solo el administrador puede generar los QR de las mesas.';
  END IF;
  IF p_count IS NULL OR p_count NOT BETWEEN 1 AND 300 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Indica entre 1 y 300 mesas.';
  END IF;
  INSERT INTO private.table_qr_tokens (table_number, token)
  SELECT n, private.new_qr_token() FROM generate_series(1, p_count) AS n
  ON CONFLICT (table_number) DO NOTHING;
  RETURN (
    SELECT jsonb_agg(jsonb_build_object('table', table_number, 'token', token) ORDER BY table_number)
    FROM private.table_qr_tokens WHERE table_number <= p_count
  );
END;
$$;

-- Invalida los QR impresos (todas las mesas o las indicadas).
CREATE OR REPLACE FUNCTION public.rotate_table_qr_tokens(p_tables integer[] DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  IF public.current_staff_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Solo el administrador puede regenerar los QR.';
  END IF;
  UPDATE private.table_qr_tokens
  SET token = private.new_qr_token(), rotated_at = now()
  WHERE p_tables IS NULL OR table_number = ANY (p_tables);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.get_table_qr_tokens(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rotate_table_qr_tokens(integer[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_table_qr_tokens(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_table_qr_tokens(integer[]) TO authenticated;

-- ---------- Llamado al mozo: solo con el código de la mesa ----------
DROP POLICY IF EXISTS waiter_calls_create ON public.waiter_calls;
REVOKE INSERT ON public.waiter_calls FROM anon;
CREATE POLICY waiter_calls_staff_create ON public.waiter_calls FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_staff_role()) IS NOT NULL AND status = 'open' AND resolved_at IS NULL);

CREATE OR REPLACE FUNCTION public.create_waiter_call(p_table text, p_reason text, p_table_token text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_staff_role() IS NULL AND NOT private.table_token_ok(p_table, p_table_token) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Escanea el código QR de tu mesa para llamar al mozo.';
  END IF;
  INSERT INTO public.waiter_calls (table_number, reason, status)
  VALUES (left(upper(btrim(p_table)), 40), p_reason, 'open');
  RETURN true;
EXCEPTION WHEN unique_violation THEN
  -- Ya hay un llamado abierto para esa mesa: objetivo cumplido.
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.create_waiter_call(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_waiter_call(text, text, text) TO anon, authenticated;

-- ---------- place_order: código de mesa y geocerca ----------
-- Firma nueva (parámetros opcionales al final): se elimina la anterior para
-- que PostgREST no tenga dos versiones entre las que elegir.
DROP FUNCTION IF EXISTS public.place_order(text, jsonb, uuid, integer, text, text);
CREATE OR REPLACE FUNCTION public.place_order(
  p_table_number text,
  p_items jsonb,
  p_idempotency_key uuid,
  p_pax integer DEFAULT 2,
  p_origin text DEFAULT 'QR COMENSAL',
  p_waiter text DEFAULT NULL,
  p_table_token text DEFAULT NULL,
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL,
  p_accuracy double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id text;
  v_max_per_dish integer;
  v_max_per_order integer;
  v_pairing_price numeric(10,2);
  v_table text := upper(btrim(coalesce(p_table_number, '')));
  v_table_digits integer;
  v_number bigint;
  v_order_id text;
  v_item jsonb;
  v_dish record;
  v_discount numeric(5,2);
  v_qty integer;
  v_name text;
  v_price numeric(10,2);
  v_dish_id text;
  v_station text;
  v_notes text;
  v_key text;
  v_counts jsonb := '{}'::jsonb;
  v_units integer := 0;
  v_total numeric(10,2) := 0;
  v_line integer := 0;
BEGIN
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Falta la referencia del pedido.';
  END IF;

  SELECT id INTO v_existing_id FROM public.orders WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN private.order_payload(v_existing_id);
  END IF;

  IF p_origin NOT IN ('QR COMENSAL', 'GARZÓN') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Origen de pedido no válido.';
  END IF;
  -- Las comandas de sala entran directo a cocina: solo las puede crear el personal.
  IF p_origin = 'GARZÓN' AND public.current_staff_role() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Solo el personal puede registrar comandas de sala.';
  END IF;
  -- Comensal sin sesión: debe venir del QR de esa mesa y, con geocerca activa,
  -- estar en el restaurante.
  IF public.current_staff_role() IS NULL THEN
    IF NOT private.table_token_ok(p_table_number, p_table_token) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Escanea el código QR de tu mesa para hacer el pedido.';
    END IF;
    IF NOT private.geofence_ok(p_lat, p_lng, p_accuracy) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Para pedir debes estar en el restaurante. Activa la ubicación e inténtalo de nuevo.';
    END IF;
  END IF;
  IF length(v_table) NOT BETWEEN 1 AND 40 OR v_table !~ '[0-9]' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Indica una mesa válida.';
  END IF;
  IF p_pax IS NULL OR p_pax NOT BETWEEN 1 AND 24 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'El número de comensales debe estar entre 1 y 24.';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Agrega al menos un plato a la orden.';
  END IF;

  SELECT max_items_per_dish, max_items_per_order, pairing_price
    INTO v_max_per_dish, v_max_per_order, v_pairing_price
  FROM public.system_config WHERE id = 'primary';
  v_max_per_dish := coalesce(v_max_per_dish, 20);
  v_max_per_order := coalesce(v_max_per_order, 50);
  v_pairing_price := coalesce(v_pairing_price, 35.00);

  v_number := nextval(pg_get_serial_sequence('public.orders', 'order_number'));
  v_order_id := 'cmd-' || v_number;

  BEGIN
    INSERT INTO public.orders (id, order_number, table_number, pax, origin, status, waiter, subtotal, total, idempotency_key)
    VALUES (
      v_order_id, v_number, v_table, p_pax, p_origin,
      CASE WHEN p_origin = 'GARZÓN' THEN 'en-cocina' ELSE 'por-validar' END,
      nullif(left(btrim(coalesce(p_waiter, '')), 80), ''),
      0, 0, p_idempotency_key
    );
  EXCEPTION WHEN unique_violation THEN
    -- Dos envíos simultáneos con la misma clave: devuelve el que ganó.
    SELECT id INTO v_existing_id FROM public.orders WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN private.order_payload(v_existing_id);
    END IF;
    RAISE;
  END;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF jsonb_typeof(v_item) <> 'object' OR coalesce(v_item->>'quantity', '') !~ '^[1-9][0-9]{0,2}$' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Cada plato debe tener una cantidad válida.';
    END IF;
    v_qty := (v_item->>'quantity')::integer;
    v_notes := nullif(left(btrim(coalesce(v_item->>'notes', '')), 200), '');

    IF coalesce(v_item->>'dish_id', '') <> '' THEN
      SELECT d.id, d.name, d.price, d.category_id INTO v_dish
      FROM public.dishes AS d
      WHERE d.id = v_item->>'dish_id' AND coalesce(d.active, true);
      IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = '22023',
          MESSAGE = 'Uno de los platos ya no está disponible. Actualiza la carta e inténtalo de nuevo.';
      END IF;
      v_dish_id := v_dish.id;
      v_name := v_dish.name;
      v_price := v_dish.price;

      IF coalesce(v_item->>'promo_offer_id', '') <> '' THEN
        SELECT p.discount_percent INTO v_discount
        FROM public.promo_offers AS p
        WHERE p.id = v_item->>'promo_offer_id'
          AND p.main_dish_id = v_dish.id
          AND p.is_active
          AND (p.starts_at IS NULL OR p.starts_at <= now())
          AND (p.ends_at IS NULL OR p.ends_at > now());
        IF NOT FOUND THEN
          RAISE EXCEPTION USING ERRCODE = '22023',
            MESSAGE = 'Una de las ofertas ya no está vigente. Revisa tu pedido.';
        END IF;
        v_price := round(v_dish.price * (100 - v_discount) / 100, 2);
      END IF;
      v_station := CASE v_dish.category_id
        WHEN 'fondos' THEN 'wok_saute'
        WHEN 'entradas' THEN 'frio_nikkei'
        WHEN 'bebidas' THEN 'barra_mixologia'
        ELSE 'pasteleria'
      END;
      v_key := 'dish:' || v_dish_id;
    ELSIF length(btrim(coalesce(v_item->>'pairing_name', ''))) BETWEEN 1 AND 80 THEN
      v_dish_id := NULL;
      v_name := btrim(v_item->>'pairing_name');
      v_price := v_pairing_price;
      v_station := 'barra_mixologia';
      v_key := 'pairing:' || lower(v_name);
    ELSE
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Cada plato debe indicar qué se pidió.';
    END IF;

    IF v_item->>'station' IN ('wok_saute', 'fuego_grill', 'frio_nikkei', 'barra_mixologia', 'pasteleria') THEN
      v_station := v_item->>'station';
    END IF;

    v_counts := jsonb_set(v_counts, ARRAY[v_key], to_jsonb(coalesce((v_counts->>v_key)::integer, 0) + v_qty));
    IF (v_counts->>v_key)::integer > v_max_per_dish THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = format('Has alcanzado el límite máximo de %s unidades para este plato.', v_max_per_dish);
    END IF;
    v_units := v_units + v_qty;
    IF v_units > v_max_per_order THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = format('La orden no puede superar las %s unidades en total.', v_max_per_order);
    END IF;

    v_line := v_line + 1;
    INSERT INTO public.order_items (order_id, line_no, dish_id, name, quantity, price, notes, station, item_status, checked)
    VALUES (v_order_id, v_line, v_dish_id, v_name, v_qty, v_price, v_notes, v_station, 'pendiente', false);

    v_total := v_total + v_price * v_qty;
  END LOOP;

  UPDATE public.orders SET subtotal = v_total, total = v_total WHERE id = v_order_id;

  -- La cuenta de la mesa acumula cada ronda (antes se sobrescribía con la última).
  IF p_origin = 'QR COMENSAL' THEN
    v_table_digits := nullif(regexp_replace(v_table, '[^0-9]', '', 'g'), '')::integer;
    UPDATE public.restaurant_tables
    SET status = 'qr',
        amount = coalesce(amount, 0) + v_total,
        pax = p_pax,
        updated_at = now()
    WHERE nullif(regexp_replace(number, '[^0-9]', '', 'g'), '')::integer = v_table_digits;
  END IF;

  RETURN private.order_payload(v_order_id);
END;
$$;

REVOKE ALL ON FUNCTION public.place_order(text, jsonb, uuid, integer, text, text, text, double precision, double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(text, jsonb, uuid, integer, text, text, text, double precision, double precision, double precision) TO anon, authenticated;

-- ---------- diner_table_signal: código de mesa ----------
DROP FUNCTION IF EXISTS public.diner_table_signal(text, text, text);
CREATE OR REPLACE FUNCTION public.diner_table_signal(p_table text, p_signal text, p_payment_method text DEFAULT NULL, p_table_token text DEFAULT NULL)
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
  IF public.current_staff_role() IS NULL AND NOT private.table_token_ok(p_table, p_table_token) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Escanea el código QR de tu mesa para continuar.';
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

REVOKE ALL ON FUNCTION public.diner_table_signal(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.diner_table_signal(text, text, text, text) TO anon, authenticated;
