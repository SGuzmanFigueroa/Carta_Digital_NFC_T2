# CD-35: filtros de estado de cuenta en /pedidos

Las pastillas Todas, Por Cobrar / En Consumo y Cobradas / Finalizadas filtran inmediatamente las comandas cargadas, sin consultar la base al pulsarlas. Los contadores reflejan la búsqueda y la partida seleccionadas, y se recalculan cuando llegan órdenes o cobros nuevos.

`paymentStatus` es un campo del modelo frontend, derivado en `orderService` del estado existente de Supabase: cobrado = paid; los demás estados activos = pending. Entregado no equivale a cobrado. Las comandas canceladas no se muestran. Los tickets locales antiguos sin paymentStatus se consideran pendientes.

La consulta habitual `fetchOrdersFromDb()` conserva su filtro que excluye cobrado, para no mezclar historial en la carta ni en KDS. `/pedidos` solicita adicionalmente `fetchOrdersFromDb({ paymentStatus: 'paid', throwOnError: true })`. El historial se pagina para no truncar resultados en el límite de Supabase; sus artículos se consultan en lotes. Un registro de cobro confirmado sustituye por ID una copia activa antigua: reutilizar una mesa no marca sus nuevas comandas como pagadas.

El hook del historial escucha eventos de orders en un canal propio y lo retira al salir de /pedidos. Los canales core, callbacks de recepción y BroadcastChannel existentes no se modifican. También refresca al reconectar, volver a la pestaña o recuperar la conexión. Si falla, conserva el último historial y muestra un aviso; las comandas activas mantienen su flujo existente.

Las comandas entregadas y cobradas tienen una lista discreta debajo del kanban. El inspector solo muestra un registro que coincide con el filtro; si no hay registros se oculta. Las cobradas no reciben acciones para volver a cocina ni notas de cocina.

No se crean tablas, columnas, migraciones ni endpoints. Requiere el acceso de lectura y Realtime que el proyecto ya usa para orders/order_items. No cambia las reglas de acceso existentes.

Verificación: `node --test tests/order-payment-filter.test.cjs` cubre cobro, entrega pendiente, nueva ronda en la misma mesa, contadores, servicio paginado, filtros renderizados, detalle vacío y limpieza de la suscripción. Los eventos y las consultas se simulan: esta prueba no cobra ni crea pedidos reales en Supabase.
