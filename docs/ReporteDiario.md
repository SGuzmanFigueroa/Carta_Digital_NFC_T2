# CD-25: reporte diario de ventas

`GET /api/reports/daily` devuelve el día actual de Lima. `?date=2026-10-10` consulta un día anterior (YYYY-MM-DD, 2000–2099, sin fechas futuras). Se responde JSON tipado en `src/features/reports/daily.ts`, sin caché.

## Activación

1. Aplicar `supabase/migrations/20261011000000_daily_sales_report.sql` en el proyecto que contiene `orders`, `order_items` y `restaurant_tables`. No aplicar automáticamente en producción.
2. Mantener `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` configuradas. No necesita service_role en el navegador ni en este endpoint.
3. Asignar desde Supabase Admin, en **app_metadata** del usuario administrador de Supabase Auth, `reports_role: "admin"` y `reports_scope: "primary"`. La cookie antigua de la aplicación y user_metadata no autorizan este reporte.
4. Enviar `Authorization: Bearer <access_token>` de ese usuario. El dashboard puede consumirlo con su sesión de Supabase Auth; esta tarea no cambia las tarjetas actuales ni su inicio de sesión antiguo.

Este esquema de main es de una instalación: orders/restaurant_tables no tienen restaurant_id. El reporte es para la instalación completa (primary); no inventa aislamiento por restaurante. Para compartir una base entre restaurantes es necesario integrar primero el esquema multi-tenant y filtrar sus tablas.

## Cálculos

- `totalRevenue`: suma NUMERIC de `orders.total` con estado cobrado y fecha de cobro dentro del día. No suma entregados sin cobrar, cancelados ni artículos por separado. PEN representa Soles.
- `completedOrders`: número de comandas entregadas o cobradas, por su primera fecha de finalización. Entregar y luego cobrar no cuenta dos finalizaciones. No es el número de pagos ni mesas.
- `bestSellingDish`: plato con más unidades en comandas cobradas ese día. Agrupa por dish_id (o nombre si no tiene ID); desempata por nombre e ID. null cuando no hay ventas.
- `averageOccupancyPercent`: promedio de mesas ocupadas / mesas totales, ponderado por segundos. Ocupadas = comiendo, demora, cuenta, qr; disponibles y reservas no ocupadas. Se registra cada cambio de mesas con un trigger de base de datos. Cambios de cantidad de mesas actualizan el denominador.
- `occupancy`: tiempo observado y cobertura del tiempo transcurrido del día (hasta ahora para hoy, 24 horas para días cerrados). null en promedio si no existe historial o no hay mesas; no se inventa ocupación cero. El día de activación normalmente tiene cobertura parcial.
- `dataQuality`: número de fechas de cobro/finalización estimadas. Antes de esta migración no se guardaban estos eventos: se usa updated_at, o created_at si falta, marcado como estimación. Los nuevos eventos usan el reloj de PostgreSQL y se conservan frente a ediciones/reintentos.

El total representa importes de comandas marcadas como cobradas por el flujo existente; no verifica una pasarela bancaria, propinas, pagos parciales o reembolsos que el esquema actual no almacena. Los datos dependen de que el cobro se haya guardado en Supabase, no de las cifras simuladas del navegador. No modifica las políticas antiguas de orders/restaurant_tables; la RPC de reporte sí comprueba permisos independientemente.

Se corrigió `settleOrdersForTableInDb` para excluir estados cobrado y cancelado: liberar una mesa ya no convierte una comanda cancelada en una venta cobrada.

## Respuesta de ejemplo

```json
{
  "date": "2026-10-10",
  "timezone": "America/Lima",
  "currency": "PEN",
  "totalRevenue": 50.3,
  "completedOrders": 3,
  "bestSellingDish": { "id": "chaufa", "name": "Chaufa", "units": 5 },
  "averageOccupancyPercent": 62.5,
  "occupancy": { "observedSeconds": 86400, "elapsedSeconds": 86400, "coveragePercent": 100 },
  "dataQuality": { "estimatedPaymentDates": 0, "estimatedCompletionDates": 0 }
}
```

Errores: 400 fecha inválida; 401 falta sesión o token inválido; 403 sin permisos; 502 reporte mal formado; 503 configuración/migración/conexión no disponible. No se devuelven mensajes privados de PostgreSQL ni se sustituye un error por ventas cero.

Pruebas: `node --test tests/daily-reports.test.cjs`. Ejecutan la migración real en PostgreSQL embebido, comprueban permisos, medianoche en Lima, sumas sin duplicación por joins, platos por unidades, eventos, cobertura parcial y fechas estimadas. No escriben en Supabase remoto.

Referencias: [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser) y [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route).
