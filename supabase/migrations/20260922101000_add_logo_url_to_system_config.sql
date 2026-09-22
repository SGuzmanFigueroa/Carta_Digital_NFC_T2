ALTER TABLE public.system_config 
    ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '/logo.png';
