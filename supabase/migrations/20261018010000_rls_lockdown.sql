-- ==========================================================
-- Fase 2B · Cerrar el acceso público (Tarea 1)
-- ----------------------------------------------------------
-- Hasta aquí casi todas las tablas tenían "FOR ALL USING (true)": con la
-- clave pública cualquiera podía leer y modificar pedidos, precios, mesas o
-- la configuración. Ahora:
--   · Carta (dishes, categories, promo_offers) y system_config: lectura
--     pública, escritura solo del admin.
--   · restaurant_tables: lectura pública, escritura solo del personal.
--   · orders / order_items: solo el personal los ve y edita. Se crean
--     únicamente con place_order (que valida precios).
--   · waiter_calls: el comensal crea llamados (validados); solo el personal
--     los ve y atiende.
--   · role_permissions: lectura del personal, cambios del admin.
--   · staff_audit_logs: el personal registra, solo el admin lee; nadie edita
--     ni borra.
-- El comensal no tiene sesión: lo que necesita lo hace con RPCs acotadas
-- (get_diner_orders, diner_table_signal).
-- ==========================================================

-- ---------- Rol del colaborador según el JWT firmado ----------
CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT nullif(auth.jwt() -> 'app_metadata' ->> 'staff_role', '');
$$;
GRANT EXECUTE ON FUNCTION public.current_staff_role() TO anon, authenticated;

-- ---------- Limpieza de las políticas abiertas ----------
DO $$
DECLARE
  t text;
  p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['categories', 'dishes', 'promo_offers', 'system_config', 'restaurant_tables',
                           'orders', 'order_items', 'waiter_calls', 'role_permissions', 'staff_audit_logs'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    -- El público solo puede leer; cualquier escritura la autoriza una política.
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.%I FROM anon', t);
  END LOOP;
END $$;

-- ---------- Carta y configuración: lectura pública, escritura admin ----------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['categories', 'dishes', 'promo_offers', 'system_config'] LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)', t || '_read', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ((SELECT public.current_staff_role()) = ''admin'') WITH CHECK ((SELECT public.current_staff_role()) = ''admin'')',
      t || '_admin_write', t);
  END LOOP;
END $$;

-- ---------- Mesas: lectura pública, escritura del personal ----------
CREATE POLICY restaurant_tables_read ON public.restaurant_tables FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY restaurant_tables_staff_write ON public.restaurant_tables FOR ALL TO authenticated
  USING ((SELECT public.current_staff_role()) IS NOT NULL)
  WITH CHECK ((SELECT public.current_staff_role()) IS NOT NULL);

-- ---------- Pedidos: solo personal (se crean con place_order) ----------
REVOKE INSERT, DELETE, TRUNCATE ON public.orders, public.order_items FROM authenticated;
CREATE POLICY orders_staff_read ON public.orders FOR SELECT TO authenticated
  USING ((SELECT public.current_staff_role()) IS NOT NULL);
CREATE POLICY orders_staff_update ON public.orders FOR UPDATE TO authenticated
  USING ((SELECT public.current_staff_role()) IS NOT NULL)
  WITH CHECK ((SELECT public.current_staff_role()) IS NOT NULL);
CREATE POLICY order_items_staff_read ON public.order_items FOR SELECT TO authenticated
  USING ((SELECT public.current_staff_role()) IS NOT NULL);
CREATE POLICY order_items_staff_update ON public.order_items FOR UPDATE TO authenticated
  USING ((SELECT public.current_staff_role()) IS NOT NULL)
  WITH CHECK ((SELECT public.current_staff_role()) IS NOT NULL);

-- ---------- Llamados de mesa ----------
GRANT INSERT ON public.waiter_calls TO anon;
CREATE POLICY waiter_calls_create ON public.waiter_calls FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'open' AND resolved_at IS NULL AND length(table_number) BETWEEN 1 AND 40);
CREATE POLICY waiter_calls_staff_read ON public.waiter_calls FOR SELECT TO authenticated
  USING ((SELECT public.current_staff_role()) IS NOT NULL);
CREATE POLICY waiter_calls_staff_update ON public.waiter_calls FOR UPDATE TO authenticated
  USING ((SELECT public.current_staff_role()) IS NOT NULL)
  WITH CHECK ((SELECT public.current_staff_role()) IS NOT NULL);

-- ---------- Permisos por rol ----------
CREATE POLICY role_permissions_staff_read ON public.role_permissions FOR SELECT TO authenticated
  USING ((SELECT public.current_staff_role()) IS NOT NULL);
CREATE POLICY role_permissions_admin_write ON public.role_permissions FOR UPDATE TO authenticated
  USING ((SELECT public.current_staff_role()) = 'admin')
  WITH CHECK ((SELECT public.current_staff_role()) = 'admin');

-- ---------- Auditoría: se escribe, no se edita ----------
REVOKE UPDATE, DELETE, TRUNCATE ON public.staff_audit_logs FROM authenticated;
CREATE POLICY staff_audit_logs_staff_insert ON public.staff_audit_logs FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_staff_role()) IS NOT NULL);
CREATE POLICY staff_audit_logs_admin_read ON public.staff_audit_logs FOR SELECT TO authenticated
  USING ((SELECT public.current_staff_role()) = 'admin');

-- ---------- RPC del comensal: estado de SUS pedidos ----------
-- El comensal no tiene cuenta: prueba que el pedido es suyo con la clave de
-- idempotencia que generó su celular al enviarlo (UUID imposible de adivinar).
-- p_refs: [{ "id": "cmd-10001", "key": "<uuid>" }, ...] (máximo 50)
CREATE OR REPLACE FUNCTION public.get_diner_orders(p_refs jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(private.order_payload(o.id)), '[]'::jsonb)
  FROM (
    SELECT value FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(p_refs) = 'array' THEN p_refs ELSE '[]'::jsonb END
    ) LIMIT 50
  ) AS ref
  JOIN public.orders AS o
    ON o.id = ref.value ->> 'id'
   AND o.idempotency_key::text = lower(ref.value ->> 'key');
$$;
REVOKE ALL ON FUNCTION public.get_diner_orders(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_diner_orders(jsonb) TO anon, authenticated;

-- ---------- RPC del comensal: pedir la cuenta / llamar al mozo ----------
-- Solo cambia el estado de la mesa y marca la cuenta pedida en sus pedidos
-- abiertos; no toca montos ni platos.
CREATE OR REPLACE FUNCTION public.diner_table_signal(p_table text, p_signal text, p_payment_method text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits integer := nullif(regexp_replace(coalesce(p_table, ''), '[^0-9]', '', 'g'), '')::integer;
  v_method text := nullif(left(btrim(coalesce(p_payment_method, '')), 30), '');
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
REVOKE ALL ON FUNCTION public.diner_table_signal(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.diner_table_signal(text, text, text) TO anon, authenticated;

-- ---------- place_order: origen GARZÓN solo para el personal ----------
-- (Pendiente anotado en 20261017000000.) Misma función, con un control más.
CREATE OR REPLACE FUNCTION public.place_order(
  p_table_number text,
  p_items jsonb,
  p_idempotency_key uuid,
  p_pax integer DEFAULT 2,
  p_origin text DEFAULT 'QR COMENSAL',
  p_waiter text DEFAULT NULL
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
