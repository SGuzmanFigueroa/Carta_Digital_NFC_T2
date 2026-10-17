-- ==========================================================
-- Fase 2A · Cierre de la tabla staff (Tareas 1 y 2)
-- ----------------------------------------------------------
-- Se aplica DESPUÉS de crear las cuentas de Supabase Auth
-- (scripts/provision-staff-auth.mjs) y de desplegar el login nuevo.
-- - Re-copia los PIN por si alguno cambió desde 20261018000000.
-- - Borra staff.pin y staff.password (texto plano).
-- - staff deja de ser pública: la lee solo el personal con sesión y la escribe
--   solo el servidor (/api/staff con service_role).
-- ==========================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff' AND column_name = 'pin') THEN
    INSERT INTO private.staff_pins (staff_id, pin_hash)
    SELECT s.id, extensions.crypt(s.pin, extensions.gen_salt('bf', 10))
    FROM public.staff AS s
    LEFT JOIN private.staff_pins AS p ON p.staff_id = s.id
    WHERE s.pin ~ '^[0-9]{4,8}$'
      AND (p.staff_id IS NULL OR extensions.crypt(s.pin, p.pin_hash) <> p.pin_hash)
    ON CONFLICT (staff_id) DO UPDATE
      SET pin_hash = EXCLUDED.pin_hash, failed_attempts = 0, locked_until = NULL, updated_at = now();
  END IF;
END $$;

ALTER TABLE public.staff DROP COLUMN IF EXISTS password;
DROP INDEX IF EXISTS public.idx_staff_pin;
ALTER TABLE public.staff DROP COLUMN IF EXISTS pin;

-- ---------- La tabla staff deja de ser pública ----------
DROP POLICY IF EXISTS "Allow public read staff" ON public.staff;
DROP POLICY IF EXISTS "Allow public write staff" ON public.staff;
DROP POLICY IF EXISTS staff_read_by_staff ON public.staff;
-- Cualquier colaborador con sesión ve la lista (sala elige mozo, KDS muestra
-- runners). Las altas, bajas y cambios van por /api/staff con service_role.
CREATE POLICY staff_read_by_staff ON public.staff FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'staff_role') IS NOT NULL);

REVOKE ALL ON public.staff FROM anon, authenticated;
GRANT SELECT ON public.staff TO authenticated;
