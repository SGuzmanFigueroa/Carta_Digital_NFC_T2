-- =====================================================================
-- T2 · Carta Digital NFC · Tablas maestras
-- Script MySQL 8: crea la base, las 4 tablas y datos de ejemplo.
-- Ejecutar completo en MySQL Workbench (rayo) o con:
--   mysql -u root -p < carta_digital_t2.sql
-- =====================================================================

DROP DATABASE IF EXISTS carta_digital_t2;
CREATE DATABASE carta_digital_t2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE carta_digital_t2;

-- ---------------------------------------------------------------------
-- Categorías de la carta
-- ---------------------------------------------------------------------
CREATE TABLE categories (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    name        VARCHAR(80)  NOT NULL,
    sort_order  INT          NOT NULL DEFAULT 0,
    active      BIT(1)       NOT NULL DEFAULT b'1',
    PRIMARY KEY (id),
    UNIQUE KEY uk_categories_name (name),
    CONSTRAINT ck_categories_sort_order CHECK (sort_order >= 0)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Platos (cada uno pertenece a una categoría)
-- ---------------------------------------------------------------------
CREATE TABLE dishes (
    id           BIGINT         NOT NULL AUTO_INCREMENT,
    name         VARCHAR(120)   NOT NULL,
    description  VARCHAR(500)   NULL,
    price        DECIMAL(10, 2) NOT NULL,
    category_id  BIGINT         NOT NULL,
    image        VARCHAR(300)   NULL,
    prep_time    VARCHAR(30)    NULL,
    dietary      VARCHAR(60)    NULL,
    active       BIT(1)         NOT NULL DEFAULT b'1',
    PRIMARY KEY (id),
    KEY ix_dishes_category (category_id),
    CONSTRAINT fk_dishes_category FOREIGN KEY (category_id) REFERENCES categories (id),
    CONSTRAINT ck_dishes_price CHECK (price >= 0)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Mesas del restaurante
-- ---------------------------------------------------------------------
CREATE TABLE restaurant_tables (
    id        BIGINT       NOT NULL AUTO_INCREMENT,
    number    VARCHAR(10)  NOT NULL,
    capacity  INT          NOT NULL DEFAULT 4,
    zone      VARCHAR(20)  NOT NULL DEFAULT 'salon',
    status    VARCHAR(20)  NOT NULL DEFAULT 'disponible',
    PRIMARY KEY (id),
    UNIQUE KEY uk_restaurant_tables_number (number),
    CONSTRAINT ck_tables_capacity CHECK (capacity BETWEEN 1 AND 30),
    CONSTRAINT ck_tables_zone     CHECK (zone IN ('salon', 'terraza', 'barra', 'vip')),
    CONSTRAINT ck_tables_status   CHECK (status IN ('disponible', 'ocupada', 'reservada', 'mantenimiento'))
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Personal
-- ---------------------------------------------------------------------
CREATE TABLE staff (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL,
    username    VARCHAR(40)  NOT NULL,
    role        VARCHAR(20)  NOT NULL,
    role_title  VARCHAR(60)  NULL,
    status      VARCHAR(20)  NOT NULL DEFAULT 'Activo',
    station     VARCHAR(60)  NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_staff_username (username),
    CONSTRAINT ck_staff_role   CHECK (role IN ('admin', 'kitchen', 'floor', 'bar', 'runner')),
    CONSTRAINT ck_staff_status CHECK (status IN ('Activo', 'Inactivo'))
) ENGINE = InnoDB;

-- =====================================================================
-- Datos de ejemplo
-- =====================================================================
INSERT INTO categories (name, sort_order, active) VALUES
    ('Entradas',        1, b'1'),
    ('Platos de fondo', 2, b'1'),
    ('Bebidas',         3, b'1'),
    ('Postres',         4, b'1');

INSERT INTO dishes (name, description, price, category_id, prep_time, active) VALUES
    ('Ceviche clásico', 'Pescado del día en leche de tigre', 38.00, 1, '10 min', b'1'),
    ('Causa limeña',    'Papa amarilla, pollo y palta',      24.00, 1, '8 min',  b'1'),
    ('Lomo saltado',    'Lomo fino al wok con papas fritas', 45.00, 2, '15 min', b'1'),
    ('Ají de gallina',  'Con arroz y huevo',                 32.00, 2, '12 min', b'1'),
    ('Chicha morada',   'Jarra de 1 litro',                  15.00, 3, '2 min',  b'1');

INSERT INTO restaurant_tables (number, capacity, zone, status) VALUES
    ('M01', 4, 'salon',   'disponible'),
    ('M02', 2, 'salon',   'disponible'),
    ('T01', 6, 'terraza', 'disponible'),
    ('B01', 2, 'barra',   'disponible');

INSERT INTO staff (name, username, role, role_title, status, station) VALUES
    ('Ana Torres',  'ana.torres',  'admin',   'Administradora', 'Activo', NULL),
    ('Luis Quispe', 'luis.quispe', 'kitchen', 'Chef principal', 'Activo', 'Cocina caliente'),
    ('María Rojas', 'maria.rojas', 'floor',   'Mozo',           'Activo', 'Salón');

-- Verificación rápida
SELECT 'categories' AS tabla, COUNT(*) AS filas FROM categories
UNION ALL SELECT 'dishes', COUNT(*) FROM dishes
UNION ALL SELECT 'restaurant_tables', COUNT(*) FROM restaurant_tables
UNION ALL SELECT 'staff', COUNT(*) FROM staff;
