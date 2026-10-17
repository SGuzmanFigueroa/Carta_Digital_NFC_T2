-- ==========================================================
-- Fase 1 · Pedidos (Tareas 8, 12, 18 y 19)
-- ----------------------------------------------------------
-- 1. place_order(): crea la comanda y sus platos en UNA transacción.
--    El cliente solo envía IDs de plato y cantidades; el precio, el nombre
--    y el total salen de public.dishes (Tarea 8). Si un plato falla, no
--    queda una comanda huérfana (Tarea 18).
-- 2. El número de comanda sale de la secuencia de orders.order_number en
--    lugar de Math.random() en el navegador (Tarea 12). El id conserva el
--    formato 'cmd-<número>' del que depende la interfaz.
-- 3. Idempotencia: reintentar con la misma clave (doble toque, cola
--    offline) devuelve la comanda ya creada en vez de duplicarla.
-- 4. Los límites por plato/orden del prototipo cd4 pasan a system_config
--    y el prototipo se archiva (Tarea 19).
-- ==========================================================

CREATE SCHEMA IF NOT EXISTS private;

-- ---------- Configuración de límites y maridajes ----------
ALTER TABLE public.system_config
  ADD COLUMN IF NOT EXISTS max_items_per_dish integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS max_items_per_order integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS pairing_price numeric(10,2) NOT NULL DEFAULT 35.00;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_config_order_limits_check') THEN
    ALTER TABLE public.system_config ADD CONSTRAINT system_config_order_limits_check
      CHECK (max_items_per_dish > 0 AND max_items_per_order >= max_items_per_dish AND pairing_price >= 0);
  END IF;
END $$;

-- Conserva los límites que se hubieran configurado en el prototipo cd4.
DO $$
BEGIN
  IF to_regclass('public.cd4_restaurant_order_settings') IS NOT NULL THEN
    UPDATE public.system_config AS cfg
    SET max_items_per_dish = s.max_items_per_dish,
        max_items_per_order = s.max_items_per_order
    FROM (
      SELECT max_items_per_dish, max_items_per_order
      FROM public.cd4_restaurant_order_settings
      ORDER BY updated_at DESC
      LIMIT 1
    ) AS s
    WHERE cfg.id = 'primary';
  END IF;
END $$;

-- ---------- Idempotencia ----------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key uuid;
CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_key
  ON public.orders (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ---------- Numeración ----------
-- Los clientes antiguos generaban 'cmd-100'..'cmd-9999' al azar. La secuencia
-- arranca por encima de cualquier id existente y de ese rango legado.
SELECT setval(
  pg_get_serial_sequence('public.orders', 'order_number'),
  GREATEST(
    10000,
    COALESCE((SELECT max(order_number) FROM public.orders), 0),
    COALESCE((SELECT max(substring(id FROM '^cmd-([0-9]{1,15})$')::bigint) FROM public.orders), 0)
  ) + 1,
  false
);

-- ---------- Respuesta común (comanda + platos) ----------
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
      ) ORDER BY i.created_at, i.id)
      FROM public.order_items AS i
      WHERE i.order_id = o.id
    ), '[]'::jsonb)
  )
  FROM public.orders AS o
  WHERE o.id = p_order_id;
$$;

-- ---------- place_order ----------
-- p_items: [{ "dish_id": "lomo-saltado", "quantity": 2, "notes": "sin cebolla", "station": "fuego_grill" }, ...]
--          o, para maridajes que no están en la carta: { "pairing_name": "Pisco Sour", "quantity": 1 }
--          `station` es solo una sugerencia de enrutamiento a cocina; nunca afecta al precio.
-- p_origin: 'QR COMENSAL' (queda 'por-validar') o 'GARZÓN' (entra directo 'en-cocina').
-- NOTA (Fase 2): hoy cualquier cliente puede pedir origen 'GARZÓN'. Cuando el
-- personal use Supabase Auth, ese origen se restringirá a roles de staff.
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

    INSERT INTO public.order_items (order_id, dish_id, name, quantity, price, notes, station, item_status, checked)
    VALUES (v_order_id, v_dish_id, v_name, v_qty, v_price, v_notes, v_station, 'pendiente', false);

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

REVOKE ALL ON FUNCTION private.order_payload(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.place_order(text, jsonb, uuid, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(text, jsonb, uuid, integer, text, text) TO anon, authenticated;

-- ---------- Archivo del prototipo cd4 (Tarea 19) ----------
-- No se borran datos: las tablas pasan al esquema `archive`, que PostgREST no
-- expone. Para eliminarlas definitivamente basta un DROP SCHEMA archive CASCADE.
CREATE SCHEMA IF NOT EXISTS archive;
REVOKE ALL ON SCHEMA archive FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['cd4_order_items', 'cd4_orders', 'cd4_restaurant_order_settings'] LOOP
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
    END IF;
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS cd4_order_item_limits ON public.%I', t);
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA archive', t);
    END IF;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.create_cd4_order(uuid, text, uuid, jsonb);
DROP FUNCTION IF EXISTS public.update_cd4_order(uuid, text, integer);
DROP FUNCTION IF EXISTS public.get_cd4_order_limits(uuid);
DROP FUNCTION IF EXISTS public.set_cd4_order_limits(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.enforce_cd4_order_item_limits();
