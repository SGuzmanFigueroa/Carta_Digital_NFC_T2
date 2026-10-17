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

-- Los datos de demostración (categorías, platos, mesas, personal y
-- system_config) viven en supabase/seed.sql.
