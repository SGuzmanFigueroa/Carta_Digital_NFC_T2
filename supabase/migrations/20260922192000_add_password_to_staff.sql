-- Agregar columna password a la tabla staff
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS password TEXT;
