-- Agregar columnas de email y custom_permissions a la tabla staff
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS custom_permissions JSONB;
