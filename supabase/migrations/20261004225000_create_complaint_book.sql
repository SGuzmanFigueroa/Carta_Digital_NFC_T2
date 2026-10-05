-- ==========================================================
-- GastroPulse OS - Libro de Reclamaciones Virtual
-- Conforme al Reglamento de INDECOPI (D.S. N° 011-2011-PCM)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.complaint_book (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- 1. Datos del Consumidor Reclamante
    full_name TEXT NOT NULL,
    doc_type TEXT NOT NULL CHECK (doc_type IN ('DNI', 'CE', 'PASAPORTE', 'RUC')),
    doc_number TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT NOT NULL,
    is_minor BOOLEAN DEFAULT false,
    parent_name TEXT,
    
    -- 2. Identificación del Bien Contratado
    contracted_good_type TEXT NOT NULL CHECK (contracted_good_type IN ('PRODUCTO', 'SERVICIO')),
    claimed_amount NUMERIC(10,2) DEFAULT 0.00,
    good_description TEXT,
    table_number TEXT,
    
    -- 3. Detalle de la Reclamación
    claim_type TEXT NOT NULL CHECK (claim_type IN ('RECLAMO', 'QUEJA')),
    detail TEXT NOT NULL,
    consumer_request TEXT NOT NULL,
    
    -- 4. Gestión y Estado Administrativo
    status TEXT DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'EN_PROCESO', 'ATENDIDO')),
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    branch_id TEXT DEFAULT 'primary'
);

-- Habilitar RLS
ALTER TABLE public.complaint_book ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert complaint_book" ON public.complaint_book;
CREATE POLICY "Allow public insert complaint_book" ON public.complaint_book FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read complaint_book" ON public.complaint_book;
CREATE POLICY "Allow authenticated read complaint_book" ON public.complaint_book FOR SELECT USING (true);

-- Índice para búsquedas rápidas por código correlativo y correo
CREATE INDEX IF NOT EXISTS idx_complaint_claim_code ON public.complaint_book(claim_code);
CREATE INDEX IF NOT EXISTS idx_complaint_email ON public.complaint_book(email);
