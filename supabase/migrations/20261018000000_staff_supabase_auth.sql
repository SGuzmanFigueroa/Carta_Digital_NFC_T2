-- ==========================================================
-- Fase 2A · Personal con Supabase Auth (Tareas 2, 3, 4, 5, 6 y 11)
-- ----------------------------------------------------------
-- - Cada colaborador tiene una cuenta en auth.users (staff.auth_user_id). La
--   contraseña la guarda y hashea Supabase Auth; el rol viaja firmado en el
--   JWT (app_metadata.staff_role), nunca en una cookie editable.
-- - El PIN se copia a private.staff_pins con bcrypt y solo sirve para desbloquear la terminal
--   de quien ya inició sesión (verify_my_pin, con bloqueo tras 5 fallos).
-- - El login pasa por /api/auth/login, que limita intentos por usuario e IP
--   con private.login_attempts.
-- - Migración ADITIVA: no borra nada, así el login anterior sigue funcionando
--   mientras se crean las cuentas y se despliega el código nuevo. El cierre
--   (borrar pin/password y quitar el acceso público a staff) está en
--   20261018000100_staff_lockdown.sql.
-- ==========================================================

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

-- ---------- Vínculo con Supabase Auth ----------
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

-- Las altas nuevas (/api/staff) ya no envían pin: deja de ser obligatorio.
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff' AND column_name = 'pin') THEN
    ALTER TABLE public.staff ALTER COLUMN pin DROP NOT NULL;
  END IF;
END $do$;

-- ---------- PIN de desbloqueo (bcrypt, fuera del esquema público) ----------
CREATE TABLE IF NOT EXISTS private.staff_pins (
  staff_id uuid PRIMARY KEY REFERENCES public.staff(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff' AND column_name = 'pin') THEN
    INSERT INTO private.staff_pins (staff_id, pin_hash)
    SELECT id, extensions.crypt(pin, extensions.gen_salt('bf', 10))
    FROM public.staff
    WHERE pin ~ '^[0-9]{4,8}$'
    ON CONFLICT (staff_id) DO NOTHING;
  END IF;
END $$;


-- ---------- Intentos de login ----------
CREATE TABLE IF NOT EXISTS private.login_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identifier text NOT NULL,
  ip text NOT NULL,
  success boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_identifier_idx ON private.login_attempts (identifier, created_at DESC);
CREATE INDEX IF NOT EXISTS login_attempts_ip_idx ON private.login_attempts (ip, created_at DESC);

-- Devuelve los segundos que faltan para poder reintentar (0 = permitido).
-- Límite: 5 fallos por usuario o 20 por IP en 15 minutos.
CREATE OR REPLACE FUNCTION public.login_retry_after(p_identifier text, p_ip text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH recent AS (
    SELECT identifier, ip, created_at
    FROM private.login_attempts
    WHERE NOT success
      AND created_at > now() - interval '15 minutes'
      AND (identifier = lower(btrim(p_identifier)) OR ip = p_ip)
  ),
  blocking AS (
    SELECT max(created_at) AS last_failure
    FROM recent
    HAVING count(*) FILTER (WHERE identifier = lower(btrim(p_identifier))) >= 5
        OR count(*) FILTER (WHERE ip = p_ip) >= 20
  )
  SELECT coalesce(
    (SELECT greatest(0, ceil(extract(epoch FROM last_failure + interval '15 minutes' - now())))::integer FROM blocking),
    0
  );
$$;

CREATE OR REPLACE FUNCTION public.record_login_attempt(p_identifier text, p_ip text, p_success boolean)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO private.login_attempts (identifier, ip, success)
  VALUES (lower(btrim(p_identifier)), coalesce(nullif(p_ip, ''), 'desconocida'), p_success);
  -- Un login correcto limpia los fallos de ese usuario.
  DELETE FROM private.login_attempts
  WHERE p_success AND identifier = lower(btrim(p_identifier)) AND NOT success;
  DELETE FROM private.login_attempts WHERE created_at < now() - interval '1 day';
$$;

-- ---------- PIN: fijar (servidor) y verificar (el propio usuario) ----------
CREATE OR REPLACE FUNCTION public.admin_set_staff_pin(p_staff_id uuid, p_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4,8}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'El PIN debe tener entre 4 y 8 dígitos.';
  END IF;
  INSERT INTO private.staff_pins (staff_id, pin_hash)
  VALUES (p_staff_id, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)))
  ON CONFLICT (staff_id) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash, failed_attempts = 0, locked_until = NULL, updated_at = now();
END;
$$;

-- Desbloqueo de terminal: solo compara el PIN de quien ya tiene sesión.
-- 5 fallos seguidos bloquean el PIN 5 minutos (hay que volver a iniciar sesión).
CREATE OR REPLACE FUNCTION public.verify_my_pin(p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_staff_id uuid;
  v_row private.staff_pins%ROWTYPE;
  v_ok boolean;
BEGIN
  SELECT id INTO v_staff_id FROM public.staff WHERE auth_user_id = auth.uid();
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Inicia sesión para desbloquear la terminal.';
  END IF;

  SELECT * INTO v_row FROM private.staff_pins WHERE staff_id = v_staff_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_pin');
  END IF;
  IF v_row.locked_until IS NOT NULL AND v_row.locked_until > now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'locked', 'locked_until', v_row.locked_until);
  END IF;

  v_ok := p_pin IS NOT NULL AND extensions.crypt(p_pin, v_row.pin_hash) = v_row.pin_hash;
  IF v_ok THEN
    UPDATE private.staff_pins SET failed_attempts = 0, locked_until = NULL WHERE staff_id = v_staff_id;
    RETURN jsonb_build_object('ok', true);
  END IF;

  UPDATE private.staff_pins
  SET failed_attempts = failed_attempts + 1,
      locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN now() + interval '5 minutes' END
  WHERE staff_id = v_staff_id
  RETURNING * INTO v_row;
  RETURN jsonb_build_object(
    'ok', false,
    'reason', CASE WHEN v_row.locked_until IS NOT NULL THEN 'locked' ELSE 'wrong_pin' END,
    'remaining', greatest(0, 5 - v_row.failed_attempts),
    'locked_until', v_row.locked_until
  );
END;
$$;

REVOKE ALL ON FUNCTION public.login_retry_after(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_login_attempt(text, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_staff_pin(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_my_pin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.login_retry_after(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_staff_pin(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_my_pin(text) TO authenticated;
