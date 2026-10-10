-- ==========================================================
-- GastroPulse OS · CD-28 · FIX N2 · Habilita Realtime para `staff` y `system_config`
--
-- ── POR QUÉ ────────────────────────────────────────────────
-- El servidor de Realtime RECHAZA TODAS las suscripciones `postgres_changes`
-- de un canal cuando UNA de ellas apunta a una tabla que no está en la
-- publicación `supabase_realtime`. Lo comunica con un evento `system`
-- ("Unable to subscribe to changes with given parameters…") que el callback de
-- `.subscribe()` NO recibe: el canal queda en SUBSCRIBED pero CIEGO.
--
-- El canal único de RestaurantContext suscribía `staff` y `system_config` junto a
-- `orders` / `waiter_calls` → TODO el realtime de la app quedaba muerto y los
-- llamados de mesa solo aparecían al recargar con F5 (bug CD-28).
--
-- El frontend ya está blindado (un canal por dominio), así que esta migración NO
-- es necesaria para que los llamados de mesa funcionen en vivo; sirve para
-- recuperar los avisos en tiempo real de "Personal / Configuración actualizada"
-- (las tablas que demuestran el defecto).
--
-- ⚠️ EJECUCIÓN MANUAL: pegar en el SQL Editor del Dashboard de Supabase.
--    Idempotente y auto-protegido: solo actúa si la tabla existe y tiene
--    PRIMARY KEY (REPLICA IDENTITY por defecto, requisito de PostgreSQL).
-- ==========================================================

DO $$
DECLARE
    target TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    FOREACH target IN ARRAY ARRAY['staff', 'system_config'] LOOP
        -- 1) La tabla debe existir.
        IF to_regclass(format('public.%I', target)) IS NULL THEN
            RAISE NOTICE 'Omitida %: la tabla no existe en el esquema public.', target;
            CONTINUE;
        END IF;

        -- 2) Debe tener PRIMARY KEY (REPLICA IDENTITY por defecto).
        IF NOT EXISTS (
            SELECT 1
            FROM pg_index i
            JOIN pg_class c ON c.oid = i.indrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relname = target
              AND i.indisprimary
        ) THEN
            RAISE NOTICE 'Omitida %: no tiene PRIMARY KEY, no se puede publicar.', target;
            CONTINUE;
        END IF;

        -- 3) Alta idempotente en la publicación de Realtime.
        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename = target
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', target);
            RAISE NOTICE 'Realtime habilitado para public.%.', target;
        ELSE
            RAISE NOTICE 'public.% ya estaba en la publicación.', target;
        END IF;
    END LOOP;
END $$;

-- ----------------------------------------------------------
-- Verificación: debe listar todas las tablas publicadas.
-- ----------------------------------------------------------
-- SELECT schemaname, tablename
-- FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime'
-- ORDER BY schemaname, tablename;
