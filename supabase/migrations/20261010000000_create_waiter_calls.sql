-- ==========================================================
-- GastroPulse OS · CD-28 · "Llamar al Mozo / Asistencia en Mesa"
-- Tabla persistente de llamados de mesa + RLS estándar + Realtime.
--
-- ⚠️ EJECUCIÓN MANUAL: pegar este bloque completo en el SQL Editor
--    del Dashboard de Supabase (no se usa el CLI de migraciones).
--    Es 100% idempotente: puede re-ejecutarse sin efectos colaterales.
-- ==========================================================

-- ----------------------------------------------------------
-- 1. TABLA DE LLAMADOS DE MESA (capa NUEVA, no reemplaza nada)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.waiter_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number TEXT NOT NULL,
    reason TEXT NOT NULL CHECK (
        reason IN ('Traer cubiertos/servilletas', 'Consulta al mozo', 'Llamar mozo general')
    ),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'attended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- 1.1 ANTI-SPAM (UNIQUE parcial): máximo UN llamado abierto por mesa.
--     Un segundo INSERT mientras haya 'open' falla con SQLSTATE 23505 y el
--     servicio lo interpreta como éxito idempotente (la campanilla ya está sonando).
CREATE UNIQUE INDEX IF NOT EXISTS waiter_calls_one_open_per_table
    ON public.waiter_calls (table_number)
    WHERE status = 'open';

-- 1.2 Índice de lectura de los terminales (KDS / Salón): llamados abiertos más recientes.
CREATE INDEX IF NOT EXISTS waiter_calls_status_created_idx
    ON public.waiter_calls (status, created_at DESC);

-- ----------------------------------------------------------
-- 2. SEGURIDAD (RLS) — estándar del proyecto: FOR ALL USING (true)
-- ----------------------------------------------------------
ALTER TABLE public.waiter_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read waiter_calls" ON public.waiter_calls;
CREATE POLICY "Allow public read waiter_calls" ON public.waiter_calls FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write waiter_calls" ON public.waiter_calls;
CREATE POLICY "Allow public write waiter_calls" ON public.waiter_calls FOR ALL USING (true) WITH CHECK (true);

-- ----------------------------------------------------------
-- 3. REALTIME (idempotente): habilita postgres_changes sobre waiter_calls
--    para que KDS y Salón reciban el INSERT (llamado) y el UPDATE (atendido).
-- ----------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'waiter_calls'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.waiter_calls;
    END IF;
END $$;

-- ----------------------------------------------------------
-- 4. Verificación rápida (opcional): debe devolver 0 filas recién creada.
-- ----------------------------------------------------------
-- SELECT * FROM public.waiter_calls ORDER BY created_at DESC;
