-- ==========================================================
-- GastroPulse OS - Complete Database Migration
-- PostgreSQL Schema, Initial Seed Data & Realtime Setup
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INT DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. DISHES (MENU ITEMS) TABLE
CREATE TABLE IF NOT EXISTS public.dishes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    category_id TEXT REFERENCES public.categories(id) ON UPDATE CASCADE,
    image TEXT,
    rating NUMERIC(2,1) DEFAULT 5.0,
    reviews_count INT DEFAULT 0,
    badge TEXT,
    tag TEXT,
    dietary TEXT,
    pairing TEXT,
    has_3d BOOLEAN DEFAULT false,
    prep_time TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RESTAURANT TABLES (CONTROL DE SALA)
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    id TEXT PRIMARY KEY,
    number TEXT UNIQUE NOT NULL,
    capacity INT NOT NULL DEFAULT 4,
    pax INT DEFAULT 0,
    zone TEXT NOT NULL DEFAULT 'salon',
    status TEXT NOT NULL DEFAULT 'disponible',
    waiter TEXT,
    amount NUMERIC(10,2) DEFAULT 0.00,
    time_active TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. STAFF (USUARIOS Y PIN)
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'kitchen', 'floor', 'bar', 'runner')),
    role_title TEXT,
    pin TEXT NOT NULL,
    status TEXT DEFAULT 'Activo',
    station TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ORDERS (COMANDAS CENTRALES)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    order_number SERIAL,
    table_number TEXT NOT NULL,
    pax INT DEFAULT 2,
    origin TEXT DEFAULT 'QR COMENSAL',
    status TEXT NOT NULL DEFAULT 'por-validar' CHECK (status IN ('por-validar', 'en-cocina', 'pase-listo', 'entregado', 'cobrado', 'cancelado')),
    waiter TEXT,
    runner_assigned TEXT,
    is_critical BOOLEAN DEFAULT false,
    preparation_percent INT DEFAULT 0,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    payment_method TEXT,
    account_requested BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. ORDER ITEMS (DETALLE DE COCINA)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
    dish_id TEXT REFERENCES public.dishes(id) ON UPDATE CASCADE,
    name TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price NUMERIC(10,2) NOT NULL,
    notes TEXT,
    station TEXT DEFAULT 'wok_saute',
    item_status TEXT DEFAULT 'pendiente' CHECK (item_status IN ('pendiente', 'en_montaje', 'listo_plancha', 'listo')),
    checked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. SYSTEM CONFIG TABLE
CREATE TABLE IF NOT EXISTS public.system_config (
    id TEXT PRIMARY KEY DEFAULT 'primary',
    branch_name TEXT NOT NULL DEFAULT 'Aurea Bistro & Wok',
    branch_ruc TEXT DEFAULT '20608945231',
    manager_name TEXT DEFAULT 'Carlos Mendoza',
    email TEXT DEFAULT 'contacto@aureabistro.pe',
    phone TEXT DEFAULT '+51 984 231 450',
    sound_alerts BOOLEAN DEFAULT true,
    delay_alerts BOOLEAN DEFAULT true,
    theme_mode TEXT DEFAULT 'obsidian',
    currency TEXT DEFAULT 'S/',
    timezone TEXT DEFAULT 'America/Lima',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES (IDEMPOTENT)
-- ==========================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read categories" ON public.categories;
CREATE POLICY "Allow public read categories" ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write categories" ON public.categories;
CREATE POLICY "Allow public write categories" ON public.categories FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read dishes" ON public.dishes;
CREATE POLICY "Allow public read dishes" ON public.dishes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write dishes" ON public.dishes;
CREATE POLICY "Allow public write dishes" ON public.dishes FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read restaurant_tables" ON public.restaurant_tables;
CREATE POLICY "Allow public read restaurant_tables" ON public.restaurant_tables FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write restaurant_tables" ON public.restaurant_tables;
CREATE POLICY "Allow public write restaurant_tables" ON public.restaurant_tables FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read staff" ON public.staff;
CREATE POLICY "Allow public read staff" ON public.staff FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write staff" ON public.staff;
CREATE POLICY "Allow public write staff" ON public.staff FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read orders" ON public.orders;
CREATE POLICY "Allow public read orders" ON public.orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write orders" ON public.orders;
CREATE POLICY "Allow public write orders" ON public.orders FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read order_items" ON public.order_items;
CREATE POLICY "Allow public read order_items" ON public.order_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write order_items" ON public.order_items;
CREATE POLICY "Allow public write order_items" ON public.order_items FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read system_config" ON public.system_config;
CREATE POLICY "Allow public read system_config" ON public.system_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write system_config" ON public.system_config;
CREATE POLICY "Allow public write system_config" ON public.system_config FOR ALL USING (true);

-- ==========================================================
-- REALTIME PUBLICATION ENABLEMENT (IDEMPOTENT)
-- ==========================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'order_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'restaurant_tables'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_tables;
    END IF;
END $$;

-- ==========================================================
-- INITIAL SEED DATA
-- ==========================================================

-- Categorías
INSERT INTO public.categories (id, name, sort_order) VALUES
('fondos', 'Fondos & Wok', 1),
('entradas', 'Entradas Nikkei', 2),
('postres', 'Postres de Autor', 3),
('bebidas', 'Bebidas Signature', 4)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Platos gourmet
INSERT INTO public.dishes (id, name, description, price, category_id, image, rating, reviews_count, badge, tag, dietary, pairing, has_3d, prep_time) VALUES
('chaufa-wok', 'Arroz Chaufa Especial Wok de Autor', 'Arroz de grano largo salteado al wok a fuego vivo con panceta Char Siu confitada, langostinos jumbo, tortilla de huevo dorado, cebollita china crujiente y toque ahumado de aceite de ajonjolí tostado.', 58.00, 'fondos', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDcYPFrcetdgC1dazh0ANWzgwRHx4V-L3cnceNamoMrs5PbK6Pj0OxoLpB3w9BBpc-2x3NTwXneDFMMfHNl2qNkle7Y1vbe6ziJYqyI84o_9MSrl4zNTm-VJKLATujDUKDux_S5dT5aDZ4eKuxcyNs-D4iIMfoEElxRqe49eBMjs0yIVqMaNq_iYLU5IJf8tPiNhU1LTXAGOUwV9q6fYDF9ZXhbcu1x3Ou4VX1ebIGsV9pHlD-fwZNFJQ', 5.0, 310, 'NUEVO LANZAMIENTO', 'WOK DE AUTOR', 'Wok Hei 60 FPS', 'Cerveza artesanal o Té Jazmín', true, 'Salteado: 4 min'),
('wagyu-a5', 'Wagyu Ribeye A5 Trufado', 'Corte sellado a la leña con reducción de oporto y lascas de trufa negra fresca, mousseline de chirivía.', 115.00, 'fondos', 'https://lh3.googleusercontent.com/aida-public/AB6AXuAsuX-oMvRCVEG-2XXQw3CI41kEEXkH_kkKwomfeLKSGAtgdEvt40ObuRfs9T5tQ4CKxIcWqx2Ixp3rIf87k3_X9JMT6lEhaODsh3pNltRoKxBCEr9rvmDaJFg8tEOhpTdBD7sCd02qdWV40F3tHE-UcyEvRWmuqWBa3A7qK2BuNCnhc7jUVhAVnqaSDRfRM0n7w2Hpvu_AVvLw1HZ_JCcXrNV2gDiH-hzJRV94lq4P04fN4x6MiDwNKA', 4.9, 184, 'CHEF CHOICE', 'A5 MIYAZAKI', 'Gluten Free', 'Pinot Noir', true, 'Parrilla: 14 min'),
('lomo-saltado', 'Lomo Saltado al Wok de Autor', 'Lomo fino saltado a fuego vivo con cebolla morada glaseada, tomates cherry, papas nativas crocantes y jugo de reducción al pisco.', 68.00, 'fondos', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCG8U8wjqtkNywYW5SViNtiOewo0on_DNwCO1vtyigp9SUyFzFb_ElBeuuUcS4meggmUfeq3lIguhhSVOBnhdmBn24N_i7a7Br6N7R823cSHQl106XxGmQmChJmDXoRW9mHyHQFltqUR6gymqIV3CE3BXqr9_Dqu80S_mZg_81AW_IR--rcoFDLElmjmeEnh57bJvqza_JIoLmmPozPwjsBxq5fWnNuZdnCiVLL20Mhr0QEvQVqZHZrJA', 4.9, 240, 'CLÁSICO GOURMET', 'WOK HEI', 'Wok Hei', 'Malbec Reserva', true, 'Salteado: 6 min'),
('pulpo-brasa', 'Pulpo Anticuchero a la Brasa', 'Tentáculos de pulpo en salsa anticuchera sobre papas doradas rústicas y chimichurri nikkei.', 72.00, 'fondos', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCVzP9V6zQ_2lE5_7H_m9P4bUfH-c-R1Y4q1N8f9o_A', 4.8, 142, 'RECOMENDADO', 'PARRILLA CARBÓN', 'Gluten Free', 'Chardonnay Roble', true, 'Brasa: 10 min'),
('tartar-nikkei', 'Tartar de Salmón & Atún Nikkei', 'Cubos marinados con ponzu trufado, palta hass en texturas y chips de nori crocante.', 52.00, 'entradas', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCVzP9V6zQ_2lE5_7H_m9P4bUfH-c-R1Y4q1N8f9o_B', 4.9, 195, 'FAVORITO', 'RAW BAR', 'Pescado Fresco', 'Sake Junmai', true, 'Armado: 5 min'),
('causa-limena', 'Causa Limeña de Cangrejo Real', 'Masa suave de papa amarilla al ají amarillo, palta madura y pulpa de cangrejo real.', 48.00, 'entradas', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCVzP9V6zQ_2lE5_7H_m9P4bUfH-c-R1Y4q1N8f9o_C', 4.7, 110, 'TRADICIÓN', 'CLÁSICO LIMA', 'Fresco', 'Sauvignon Blanc', true, 'Armado: 4 min'),
('esfera-chocolate', 'Esfera de Chocolate Valrhona 70%', 'Domo relleno de mousse de gianduja con baño caliente de caramelo salado a la mesa.', 42.00, 'postres', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCVzP9V6zQ_2lE5_7H_m9P4bUfH-c-R1Y4q1N8f9o_D', 4.9, 215, 'SIGNATURE', 'CHOCOLATERÍA', 'Veggie', 'Oporto Tawny', true, 'Montaje: 3 min'),
('smoked-old-fashioned', 'Smoked Old Fashioned con Bourbon', 'Bourbon infusionado con cáscara de naranja, amargo de angostura y humo de roble americano.', 45.00, 'bebidas', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCVzP9V6zQ_2lE5_7H_m9P4bUfH-c-R1Y4q1N8f9o_E', 5.0, 160, 'COCKTAIL SHOW', 'MIXOLOGÍA', 'Alcohol 18°', 'Humo de Roble', true, 'Barra: 2 min')
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, name = EXCLUDED.name, description = EXCLUDED.description;

-- Mesas del restaurante
INSERT INTO public.restaurant_tables (id, number, capacity, pax, zone, status, waiter, amount) VALUES
('m-01', 'Mesa 01', 2, 2, 'salon', 'comiendo', 'Sofía Valdivia', 86.00),
('m-02', 'Mesa 02', 4, 4, 'salon', 'demora', 'Diego Salas', 184.00),
('m-03', 'Mesa 03', 6, 5, 'terraza', 'cuenta', 'Sofía Valdivia', 242.00),
('m-04', 'Mesa 04', 4, 2, 'salon', 'disponible', 'Diego Salas', 0.00),
('m-05', 'Mesa 05', 2, 0, 'terraza', 'disponible', NULL, 0.00),
('m-06', 'Mesa 06', 4, 0, 'salon', 'disponible', NULL, 0.00),
('m-07', 'Mesa 07', 8, 0, 'salon', 'disponible', NULL, 0.00),
('m-08', 'Mesa 08', 2, 0, 'barra', 'disponible', NULL, 0.00),
('m-09', 'Mesa 09', 2, 0, 'barra', 'disponible', NULL, 0.00),
('m-10', 'Mesa 10', 4, 0, 'terraza', 'disponible', NULL, 0.00),
('m-11', 'Mesa 11', 6, 0, 'terraza', 'disponible', NULL, 0.00),
('m-12', 'Mesa 12', 4, 0, 'salon', 'disponible', NULL, 0.00)
ON CONFLICT (id) DO UPDATE SET number = EXCLUDED.number;

-- Personal y Roles
INSERT INTO public.staff (name, username, role, role_title, pin, status, station) VALUES
('Carlos Mendoza', 'admin', 'admin', 'Administrador General', '8080', 'Activo', 'Gerencia & Caja'),
('Kenji Takahashi', 'chef_kenji', 'kitchen', 'Jefe Ejecutivo de Cocina', '1042', 'En Cocina KDS', 'Wok & Pase'),
('Sofía Valdivia', 'garzon_sofia', 'floor', 'Capitana de Salón', '2045', 'En Turno Activo', 'Salón Central'),
('Diego Salas', 'garzon_diego', 'floor', 'Mesero Senior', '2046', 'En Turno Activo', 'Terraza'),
('Mateo Rivas', 'runner_mateo', 'runner', 'Runner Pase Central', '3012', 'Libre en Pase', 'Pase Despacho'),
('Lucas Alarcón', 'bar_lucas', 'bar', 'Head Bartender', '4099', 'En Turno Activo', 'Barra Mixología')
ON CONFLICT (username) DO UPDATE SET pin = EXCLUDED.pin, role = EXCLUDED.role;

-- Configuración del sistema
INSERT INTO public.system_config (id, branch_name, branch_ruc, manager_name, email, phone)
VALUES ('primary', 'Aurea Bistro & Wok', '20608945231', 'Carlos Mendoza', 'contacto@aureabistro.pe', '+51 984 231 450')
ON CONFLICT (id) DO NOTHING;
