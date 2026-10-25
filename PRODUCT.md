# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Comensal:** abre la carta digital desde el QR/NFC de su mesa, en su celular, dentro del restaurante (app Next.js, `src/`).
- **Administrador del restaurante:** mantiene los datos maestros (categorías, platos, mesas, personal) desde el panel Angular de la T2 (`frontend-angular/`).
- **Audiencia actual del panel T2:** es una entrega académica (curso, entregable T2). Hoy se usa sobre todo como demo en una exposición proyectada, frente al profesor y al grupo.

## Product Purpose

GastroPulse es una carta digital con pedido desde la mesa para restaurantes. El panel de tablas maestras permite registrar, consultar, editar y eliminar los catálogos que alimentan la carta: categorías, platos, mesas y personal. Éxito para la T2: el CRUD funciona contra MySQL a través de la API Spring Boot y se entiende en una demostración.

## Positioning

La carta del comensal combina foto HD, modelos 3D/AR y pedido desde la mesa; el panel administra los datos que esa carta muestra. Mismo producto, dos caras.

## Operating Context

- Demo local: Angular en `localhost:4200`, API Spring Boot en `localhost:8080/api`, MySQL local (`carta_digital_t2`).
- La carta del comensal (Next.js + Supabase) es una implementación separada; sus datos no están integrados con el backend T2.

## Capabilities and Constraints

- Cuatro tablas maestras con CRUD completo; filtro de platos por categoría.
- Reglas: nombres de categoría, números de mesa y usuarios únicos (409); no se elimina una categoría con platos (409); validación por campo (400).
- Valores fijos: zonas `salon|terraza|barra|vip`; estados de mesa `disponible|ocupada|reservada|mantenimiento`; roles `admin|kitchen|floor|bar|runner`; estado del personal `Activo|Inactivo`.
- Sin autenticación en la API T2 (pendiente).
- Stack del panel: Angular 21 (standalone, signals, formularios reactivos).

## Brand Commitments

- El panel debe sentirse de la misma familia que la carta del comensal GastroPulse (cartadigital3d.netlify.app), decidido por el usuario.
- El rediseño no debe parecer una plantilla genérica de administración.

## Evidence on Hand

- Datos de ejemplo del script `backend/carta_digital_t2.sql` (4 categorías, 5 platos, 4 mesas, 3 trabajadores): son de demostración.
- No hay clientes, métricas ni testimonios reales; no inventarlos.

## Product Principles

1. El dato maestro es la fuente de la carta: el panel muestra cómo se verá cada cambio para el comensal.
2. Rápido de operar: editar un precio o la disponibilidad de un plato debe tomar segundos.
3. Honesto con el alcance: lo que no está integrado no se presenta como integrado.
4. Legible en proyección: el panel debe leerse bien en una sala.
