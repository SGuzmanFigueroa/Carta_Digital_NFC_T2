CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id TEXT UNIQUE NOT NULL,
    role_title TEXT NOT NULL,
    role_description TEXT,
    panel_admin TEXT NOT NULL DEFAULT 'deny' CHECK (panel_admin IN ('allow', 'read', 'deny')),
    kds_cocina TEXT NOT NULL DEFAULT 'deny' CHECK (kds_cocina IN ('allow', 'read', 'deny')),
    edicion_menu TEXT NOT NULL DEFAULT 'deny' CHECK (edicion_menu IN ('allow', 'read', 'deny')),
    cobro_pos TEXT NOT NULL DEFAULT 'deny' CHECK (cobro_pos IN ('allow', 'read', 'deny')),
    anulacion_comandas TEXT NOT NULL DEFAULT 'deny' CHECK (anulacion_comandas IN ('allow', 'read', 'deny')),
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.role_permissions (role_id, role_title, role_description, panel_admin, kds_cocina, edicion_menu, cobro_pos, anulacion_comandas)
VALUES
    ('admin', 'Administrador General', 'Control absoluto y cierres financieros', 'allow', 'allow', 'allow', 'allow', 'allow'),
    ('sous_chef', 'Jefe de Cocina / Sous Chef', 'Gestion de tiempos y stock de comandas', 'deny', 'allow', 'read', 'deny', 'deny'),
    ('waiter', 'Camarero / Sala', 'Apertura y cobro en comensales de salon', 'deny', 'deny', 'deny', 'allow', 'deny'),
    ('bartender', 'Bartender Principal', 'KDS Barra y control de stock de bodega rapida', 'deny', 'allow', 'deny', 'allow', 'deny'),
    ('runner', 'Runner / Entrega', 'Despacho de platillos desde el pase', 'deny', 'read', 'deny', 'deny', 'deny')
ON CONFLICT (role_id) DO UPDATE SET
    role_title = EXCLUDED.role_title,
    role_description = EXCLUDED.role_description,
    panel_admin = EXCLUDED.panel_admin,
    kds_cocina = EXCLUDED.kds_cocina,
    edicion_menu = EXCLUDED.edicion_menu,
    cobro_pos = EXCLUDED.cobro_pos,
    anulacion_comandas = EXCLUDED.anulacion_comandas,
    updated_at = now();

CREATE TABLE IF NOT EXISTS public.staff_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    performed_by TEXT DEFAULT 'Chef Ejecutivo',
    target TEXT,
    details TEXT,
    level TEXT DEFAULT 'info' CHECK (level IN ('info', 'warning', 'critical')),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read role_permissions" ON public.role_permissions;
CREATE POLICY "Allow public read role_permissions" ON public.role_permissions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write role_permissions" ON public.role_permissions;
CREATE POLICY "Allow public write role_permissions" ON public.role_permissions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read staff_audit_logs" ON public.staff_audit_logs;
CREATE POLICY "Allow public read staff_audit_logs" ON public.staff_audit_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write staff_audit_logs" ON public.staff_audit_logs;
CREATE POLICY "Allow public write staff_audit_logs" ON public.staff_audit_logs FOR ALL USING (true);
