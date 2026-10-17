-- ==========================================================
-- Datos de demostración (solo desarrollo local / entornos de prueba)
-- ----------------------------------------------------------
-- `supabase db reset` carga este archivo DESPUÉS de todas las migraciones
-- (ver [db.seed] en config.toml). No se aplica con `supabase db push`, así
-- que nunca llega a producción. Los PIN de abajo son ficticios.
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

-- Libro de Reclamaciones: misma fila que creaba la migración
-- 20261009010000_secure_complaint_book a partir de system_config. Sin
-- dirección: se completa desde el panel antes de activarlo.
INSERT INTO public.complaint_books (id, provider_name, provider_ruc)
SELECT 'primary', branch_name, branch_ruc FROM public.system_config
WHERE id = 'primary' AND branch_ruc ~ '^[0-9]{11}$'
ON CONFLICT (id) DO NOTHING;

-- Ofertas flash de demostración (mismas que INITIAL_ACTIVE_PROMO_OFFERS).
-- El precio promocional lo calcula place_order con discount_percent.
INSERT INTO public.promo_offers (id, mechanic, main_dish_id, complementary_dish_id, discount_percent, priority, display) VALUES
('promo-wagyu-15', 'discount', 'wagyu-a5', NULL, 15, 1,
  '{"badge":"-15% OFF","kicker":"PLATO DEL CHEF","timingLabel":"Termina en 12:35 (Hoy)","title":"Wagyu Ribeye A5 Trufado","subtitle":"280g corte japonés con escamas de sal marina","image":"/images/pulpo-anticuchero.jpg","note":"Ahorro S/ 17.25"}'),
('promo-tartar-2da', 'second_unit', 'tartar-nikkei', 'causa-limena', 50, 2,
  '{"badge":"2da -50%","kicker":"2DA UNIDAD","timingLabel":"Termina en 08:45 (Hoy)","title":"Tartar & Ceviche Nikkei","subtitle":"Atún rojo, leche de tigre al ají amarillo y palta","image":"/images/tartar-salmon.jpg","note":"2da al 50%"}'),
('promo-pisco-2x1', 'two_for_one', 'smoked-old-fashioned', NULL, 50, 2,
  '{"badge":"2x1 FLASH","kicker":"HAPPY HOUR BAR","timingLabel":"Hasta 21:00","title":"2x1 Pisco Sour & Cócteles","subtitle":"Destilados premium de autor en barra principal","image":"/images/smoked-old-fashioned.jpg","note":"Lleva 2 x 1"}'),
('promo-volcan-pack', 'combo', 'esfera-chocolate', 'smoked-old-fashioned', 25, 3,
  '{"badge":"MARIDAJE","kicker":"POSTRE + DIGESTIVO","timingLabel":"Turno Cena","title":"Volcán Belga + Maridaje","subtitle":"Volcán 70% cacao + Copa de Oporto o Amaro","image":"/images/esfera-chocolate.jpg","note":"-25% Pack"}')
ON CONFLICT (id) DO NOTHING;
