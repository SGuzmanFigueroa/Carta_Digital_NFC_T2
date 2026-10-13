/**
 * GastroPulse OS · CD-31
 * Diccionario único de traducciones de la CARTA DIGITAL DEL COMENSAL (/menu).
 *
 * Decisiones de arquitectura:
 *  - Objeto plano `es` / `en` + interpolación de `{placeholders}`. Sin librerías i18n:
 *    ~2 KB de bundle, cero overhead de runtime y árbol 100% estático.
 *  - `es` es la fuente de verdad del TIPADO: `TranslationKey` se deriva de sus claves,
 *    así que si a `en` le falta una traducción TypeScript falla en build (no en runtime).
 *  - Aquí viven SOLO las cadenas de INTERFAZ de la vista del comensal. Los textos de
 *    datos del negocio (nombres/descripciones de platos, categorías, badges de la BD)
 *    se resuelven en `src/i18n/menuContent.ts` (adaptador + diccionario simulado ES→EN).
 *  - Convención de claves: `dominio.subdominio` en camelCase, agrupadas por sección.
 */

/** Idiomas soportados por la carta del comensal. */
export type MenuLanguage = 'es' | 'en';

/** Lista canónica de idiomas (para el selector [ES | EN]). */
export const MENU_LANGUAGES: readonly MenuLanguage[] = ['es', 'en'];

/** Valores admitidos en `{placeholders}` de una traducción. */
export type TranslationParams = Record<string, string | number>;

/**
 * Diccionario base (Español). Es también el contrato de claves: añadir una clave aquí
 * OBLIGA a traducirla en `en` (TypeScript lo exige en build).
 */
export const es = {
  // ── Cabecera del comensal ───────────────────────────────────────────────────
  'header.changeTable': 'Cambiar Mesa',
  'header.changeTableAria': 'Cambiar mesa, mesa actual {table}',
  'header.autoOrderActive': 'Auto-pedido QR activo',
  'header.openCart': 'Abrir mi pedido',

  // ── Buscador y pestañas de categoría ────────────────────────────────────────
  'search.placeholder': 'Buscar plato de autor, insumo o maridaje...',
  'search.clear': 'Limpiar búsqueda',
  'search.categoriesPrev': 'Ver categorías anteriores',
  'search.categoriesNext': 'Ver más categorías',

  // ── Carta: grilla de especialidades ─────────────────────────────────────────
  'grid.title': 'Nuestra Carta de Especialidades',
  'grid.countOne': '{count} opción',
  'grid.countOther': '{count} opciones',
  'grid.nativeArSubhead': 'AR nativo en Android · modelos GLB listos para mesa',
  'grid.emptyTitle': 'No se encontraron platos',
  'grid.emptyBody':
    'No encontramos ningún resultado para "{query}". Prueba con otro ingrediente o limpia los filtros.',
  'grid.emptyAction': 'Ver toda la carta',

  // ── Platos: tarjetas, visores y ficha técnica ───────────────────────────────
  'dish.photoHd': 'Foto HD',
  'dish.view3d360': '3D 360°',
  'dish.interact3d': 'Interactuar en 3D',
  'dish.hdSheet': 'Descripción',
  'dish.arViewer': 'Visor AR',
  'dish.add': 'Agregar',
  'dish.addPrice': 'Agregar • {price}',
  'dish.orderPrice': 'Pedir Plato • {price}',
  'dish.orderThisDish': 'Pedir este Plato',
  'dish.viewIn3d': 'Ver en 3D',
  'dish.viewIn3dTitle': 'Ver plato en 3D interactivo',
  'dish.projectArTitle': 'Proyectar con cámara AR',
  'dish.projectArTableTitle': 'Proyectar plato con cámara en tu mesa',
  'dish.openNativeArAndroid': 'Abrir AR nativo Android',
  'dish.openDetails': 'Ver ficha técnica de {dish}',
  'dish.openHeroDetails': 'Abrir ficha técnica de {dish}',
  'dish.openHeroHd': 'Abrir descripción de {dish}',
  'dish.igvNote': 'Incluye IGV 18%',
  'dish.reviewsCount': '{count} reseñas',
  'dish.ratingsCount': '({count} valoraciones)',
  'dish.threeDTitle': '{dish} (3D)',
  'dish.threeDViewTitle': 'Vista 3D interactiva de {dish}',
  'dish.description': 'Descripción',
  'dish.allergens': 'Alérgenos',
  'dish.allergensEmpty': 'Información de alérgenos no disponible para este plato.',
  'dish.pairing': 'Maridaje recomendado',
  'dish.closeDetail': 'Cerrar ficha del plato',
  'dish.loading3d': 'Cargando motor 3D...',

  'cart.aria': 'Ver pedido, {count} {dishes}',
  'unit.dishOne': 'plato',
  'unit.dishOther': 'platos',
  'cart.title': 'Tu Pedido • {table}',
  'cart.totalWithCount': 'Total ({count} {dishes}):',
  'cart.viewOrder': 'Ver Pedido',
  'cart.send': 'Enviar',
  'cart.close': 'Cerrar mi pedido',
  'cart.keepOrdering': 'Seguir Pidiendo',
  'cart.confirmSend': 'Confirmar y Enviar',
  'cart.subtotalNoIgv': 'SUBTOTAL (SIN IGV)',
  'cart.igv': 'IGV (18%)',
  'cart.totalToPay': 'TOTAL A PAGAR',
  'cart.notePlaceholder': 'Nota de cocina (ej. Sin cebolla, término medio...)',
  'cart.increase': 'Aumentar cantidad',
  'cart.decrease': 'Disminuir cantidad',
  'cart.requestAccount': 'Pedir la Cuenta / Pagar con Yape o Plin QR',

  // ── Tracker de la comanda activa ────────────────────────────────────────────
  'tracker.orderLabel': 'Comanda #{id} • {table}',
  'tracker.received': 'Recibido',
  'tracker.inKitchen': 'En Cocina',
  'tracker.ready': 'Listo en Pase',
  'tracker.served': 'Servido en Mesa',
  'tracker.readyTitle': '¡Tu comanda está lista en el pase!',
  'tracker.readyBody': 'Ya sale a tu mesa.',
  'tracker.itemsInProgress': '{count} platos en marcha',
  'tracker.total': 'Total: {amount}',
  'tracker.requestBill': 'Pedir Cuenta / Pagar QR',
  'tracker.requestBillTitle': 'Pedir la cuenta y pagar con Yape o Plin QR',

  // ── Cliente frecuente (repetir pedido) ──────────────────────────────────────
  'welcome.kicker': 'Cliente Frecuente',
  'welcome.title': '¡Qué gusto tenerte de nuevo en mesa!',
  'welcome.bodyPrefix': 'En tu visita anterior disfrutaste de:',
  'welcome.bodySuffix': '¿Deseas repetir tu combinación favorita hoy?',
  'welcome.repeat': 'Repetir este Pedido • {amount}',
  'welcome.explore': 'Explorar Otros Platos',
  'welcome.dismiss': 'Descartar recordatorio',

  // ── Selector de mesa ────────────────────────────────────────────────────────
  'table.title': 'Selecciona tu Mesa',
  'table.help':
    'Indica la mesa donde te encuentras para despachar tu comanda a la estación de cocina correspondiente:',
  'table.confirm': 'Confirmar',
  'table.label': 'Mesa {number}',
  'table.barLabel': 'Barra {number}',
  'table.terraceLabel': 'Terraza {number}',

  // ── Barra de navegación inferior ────────────────────────────────────────────
  'nav.aria': 'Navegación de la carta digital',
  'nav.menu': 'Carta',
  'nav.search': 'Buscar',
  'nav.order': 'Pedido',
  'nav.payQr': 'Pagar QR',
  'nav.payQrTitle': 'Pedir la cuenta y pagar con Yape o Plin QR',
  'nav.waiter': 'Garzón',
  'nav.waiterCalling': 'Llamando',

  // ── Pie legal del restaurante ───────────────────────────────────────────────
  'footer.cuisine': 'Gastronomía Peruana de Autor',
  'footer.complaints': 'Libro de Reclamaciones',
  'footer.complaintsTitle': 'Libro de Reclamaciones Oficial conforme a ley INDECOPI',
  'footer.legal':
    'Conforme al D.S. N° 011-2011-PCM / Ley N° 29571 Código de Protección y Defensa del Consumidor.',

  // ── Visor AR en mesa ────────────────────────────────────────────────────────
  'ar.title': 'Visor AR en Mesa',
  'ar.waiting': 'Esperando cámara',
  'ar.openingNative': 'Abriendo AR nativo: {dish}',
  'ar.activating': 'Activando cámara',
  'ar.anchored': 'Plato fijado en mesa:',
  'ar.realScale': 'Escala Real en Mesa:',
  'ar.requestingPermission': 'Solicitando permiso de cámara...',
  'ar.tapToActivate': 'Toca Activar cámara para ver el plato en tu mesa.',
  'ar.nativeFallbackTitle': 'Si el AR nativo no detectó la mesa, usa el modo asistido.',
  'ar.nativeFallbackHelp': 'Activa la cámara, apunta a la mesa y toca donde quieres colocar el plato.',
  'ar.permissionOnce': 'El navegador puede pedir permiso de cámara una sola vez.',
  'ar.blocked': 'No se pudo activar la cámara.',
  'ar.blockedHelp':
    'Chrome denegó el acceso. Toca Reintentar cámara y, si aparece el permiso, selecciona Permitir.',
  'ar.failedHelp': 'Cierra otras apps que usen la cámara y vuelve a intentar.',
  'ar.noCamera': 'No se encontró una cámara disponible.',
  'ar.noCameraHelp': 'Cierra Zoom, Meet, OBS u otra app que esté usando la cámara y vuelve a intentar.',
  'ar.activateCamera': 'Activar cámara',
  'ar.retryCamera': 'Reintentar cámara',
  'ar.activatingCamera': 'Activando cámara...',
  'ar.close': 'Cerrar visor AR',
  'ar.scaleDown': 'Reducir tamaño del plato',
  'ar.scaleUp': 'Aumentar tamaño del plato',

  // ── Oferta Flash: tira, pop-up y cuenta regresiva ───────────────────────────
  'promo.tickerLabel': 'Oferta Flash · -{percent}% del día',
  'promo.tickerBadge': 'Oferta Flash · {badge}',
  'promo.savingsInline': 'Ahorras {amount}',
  'promo.savings': 'Ahorra {amount}',
  'promo.specialOffer': '¡Oferta Especial!',
  'promo.applyDiscount': 'Aplicar Descuento',
  'promo.endsIn': '¡Termina en {time}!',
  'promo.roledescription': 'oferta',
  'promo.offerPosition': 'Oferta {index} de {total}: {dish}',
  'promo.viewOffer': 'Ver oferta {index} de {total}: {dish}',
  'promo.carouselAria': 'Carrusel de ofertas: {count} disponibles',
  'promo.activeAria': 'Oferta activa: {dish}',
  'promo.photosAria': 'Fotos de la oferta: {dish}',
  'promo.secondDish': 'Segundo plato de la oferta',
  'promo.secondDishNamed': '{dish} (segundo plato de la oferta)',
  'promo.close': 'Cerrar oferta flash',
  'promo.counter': '({index} de {total} ofertas)',
  'promo.mechanicDiscount': '{discount} de descuento en el {dish}',
  'promo.mechanicTwoForOne': '2x1 en {dish}',
  'promo.mechanicSecondUnit': 'Lleva {main} y obtén {discount} de dcto en el {complement}',
  'promo.mechanicCombo': '{discount} de descuento en combo: {main} + {complement}',

  // ── Pasarela de pago + reseñas post-pago ────────────────────────────────────
  'pay.title': 'Pedir la Cuenta y Pagar',
  'pay.tableTotal': '{table} • Total: {amount}',
  'pay.paused':
    'Los cobros digitales están temporalmente pausados. El garzón se acercará a tu mesa para coordinar el cobro.',
  'pay.methodYape': 'Yape QR',
  'pay.methodPlin': 'Plin QR',
  'pay.methodCard': 'Tarjeta',
  'pay.methodCash': 'Efectivo',
  'pay.payWithYape': 'Paga con Yape',
  'pay.payWithPlin': 'Paga con Plin',
  'pay.officialQr': 'QR Oficial del Restaurante',
  'pay.qrAltYape': 'QR Oficial Yape',
  'pay.qrAltPlin': 'QR Oficial Plin',
  'pay.totalToPay': 'Total a pagar: {amount}',
  'pay.copy': 'Copiar',
  'pay.copyToast': 'Número copiado al portapapeles',
  'pay.opLabel': 'Código de Operación o Voucher:',
  'pay.autofill': 'Autocompletar de prueba',
  'pay.opPlaceholder': 'Ej. 481920 (6 u 8 dígitos numéricos)',
  'pay.opValid': 'Código de operación válido ({count} dígitos)',
  'pay.voucherOk': 'Captura de comprobante adjuntada correctamente',
  'pay.opMissingDigits': 'Faltan dígitos: se requieren entre 6 y 8 números (llevas {count})',
  'pay.opHint': 'Digita los 6 u 8 números del comprobante o adjunta la foto del voucher.',
  'pay.uploadCta': 'Subir captura de pago',
  'pay.uploaded': 'Voucher adjuntado',
  'pay.removeVoucher': 'Quitar comprobante',
  'pay.voucherAttached': 'Comprobante adjuntado correctamente',
  'pay.voucherSimulated': 'Voucher simulado con código bancario OP-{code}',
  'pay.posTitle': 'Cobro con POS Inalámbrico en Mesa',
  'pay.posBody':
    'Aceptamos Visa, Mastercard, Diners y Amex. Al confirmar, el garzón asignado a {table} se acercará con el terminal inalámbrico.',
  'pay.cashTitle': '¿Con qué billete o importe vas a pagar?',
  'pay.cashExact': 'Monto Exacto',
  'pay.cashBill50': 'Billete S/ 50',
  'pay.cashBill100': 'Billete S/ 100',
  'pay.cashBill200': 'Billete S/ 200',
  'pay.cashChange': 'Vuelto: {amount}',
  'pay.cashInsufficient': 'Insuficiente',
  'pay.cashCustom': 'Otro billete/monto:',
  'pay.cashChangeTitle': 'Vuelto que te traerá el garzón:',
  'pay.cashTotal': 'Total: {amount}',
  'pay.cashGiven': 'Pagas con: {amount}',
  'pay.cashShort':
    'El billete indicado ({given}) no cubre el total de la comanda ({total}). Te faltan {missing}.',
  'pay.confirm': 'Confirmar Pago Realizado • {amount}',
  'pay.confirming': 'Confirmando Pago...',
  'pay.needOp': 'Ingresa código OP o adjunta voucher',
  'pay.needCash': 'Selecciona billete suficiente',
  'pay.errorDigits': 'Ingresa los 6 u 8 dígitos del código de operación o adjunta el voucher',
  'pay.errorCash': 'El importe con el que pagarás debe cubrir el total de la cuenta',
  'pay.errorConfirm': 'No se pudo confirmar el pago. Reintente.',
  'pay.paid': 'Pago con {method} registrado. ¡Gracias!',
  'pay.accountRequested': 'Cuenta solicitada ({method}). Garzón en camino con el comprobante.',
  'pay.doneKicker': '¡PAGO CONFIRMADO CON ÉXITO!',
  'pay.feedbackQuestion': '¿Qué tal estuvo tu experiencia en Áurea Bistro?',
  'pay.feedbackSubtitle': '{table} • Tus comentarios nos ayudan a seguir perfeccionando cada plato.',
  'pay.rating1': 'Necesita mejorar',
  'pay.rating2': 'Regular',
  'pay.rating3': 'Bueno',
  'pay.rating4': '¡Muy bueno!',
  'pay.rating5': '¡Extraordinario!',
  'pay.tipLabel': 'Propina para el equipo de cocina y sala (opcional):',
  'pay.tipNone': 'Sin propina',
  'pay.commentsLabel': 'Comentarios o felicitaciones al Chef:',
  'pay.commentsPlaceholder': 'El Arroz Chaufa Wok estuvo insuperable y el maridaje perfecto...',
  'pay.submitReview': 'Enviar Calificación y Finalizar',
  'pay.savingReview': 'Guardando Reseña...',
  'pay.reviewThanks': '¡Gracias por tus comentarios y propina!',
  'pay.thanksTitle': '¡Muchas Gracias por tu Visita!',
  'pay.thanksBody':
    'Tu comanda de {table} ha sido completada. Ha sido un honor atenderte hoy en Áurea Bistro.',
  'pay.closeBack': 'Cerrar y Volver a la Carta',

  // ── Libro de Reclamaciones (INDECOPI) ───────────────────────────────────────
  'claim.title': 'Libro de Reclamaciones Virtual',
  'claim.info':
    'Conforme a la ley de protección al consumidor de Perú (INDECOPI), el establecimiento dará respuesta formal a esta hoja en un plazo no mayor a {days} días hábiles mediante el correo electrónico proporcionado.',
  'claim.section1': '1. Identificación del Consumidor Reclamante',
  'claim.fullName': 'Nombres y Apellidos *',
  'claim.fullNamePlaceholder': 'Ej. Juan Pérez Quispe',
  'claim.doc': 'Doc. *',
  'claim.docNumber': 'N° de Documento *',
  'claim.docNumberPlaceholder': 'N° documento',
  'claim.email': 'Correo Electrónico (para respuesta) *',
  'claim.emailPlaceholder': 'correo@ejemplo.com',
  'claim.phone': 'Teléfono / WhatsApp *',
  'claim.address': 'Domicilio / Dirección Completa *',
  'claim.addressPlaceholder': 'Av. Principal 123, Distrito, Ciudad',
  'claim.minor': 'El reclamante es menor de edad',
  'claim.parentNamePlaceholder': 'Nombre completo del padre, madre o apoderado',
  'claim.section2': '2. Identificación del Bien Contratado',
  'claim.goodType': 'Tipo de Bien',
  'claim.product': 'Producto',
  'claim.service': 'Servicio',
  'claim.amount': 'Monto Reclamado (S/)',
  'claim.reference': 'Referencia o Mesa',
  'claim.section3': '3. Detalle de la Reclamación y Pedido',
  'claim.classification': 'Clasificación de la Reclamación:',
  'claim.typeClaim': 'RECLAMO',
  'claim.typeClaimDesc':
    'Disconformidad relacionada a los productos o servicios (ej. cobro erróneo, plato en mal estado).',
  'claim.typeComplaint': 'QUEJA',
  'claim.typeComplaintDesc':
    'Disconformidad referida a la mala atención al público o malestar con el personal.',
  'claim.detail': 'Detalle del Hecho o Motivo *',
  'claim.detailPlaceholder': 'Explica detalladamente lo ocurrido...',
  'claim.request': 'Pedido Concreto del Consumidor *',
  'claim.requestPlaceholder':
    'Qué solución o medida solicita al restaurante (ej. Devolución, cambio de plato, disculpas)...',
  'claim.oath':
    'Declaro bajo juramento que los datos ingresados son verídicos y autorizo al establecimiento a comunicarse conmigo al correo electrónico brindado conforme al Código de Protección al Consumidor (Ley N° 29571).',
  'claim.cancel': 'Cancelar',
  'claim.submit': 'Registrar Reclamación',
  'claim.submitting': 'Registrando...',
  'claim.successKicker': 'Constancia Legal de Registro',
  'claim.successTitle': 'Hoja de Reclamación Registrada',
  'claim.codeLabel': 'Código: {code}',
  'claim.issuedAt': 'Fecha de emisión:',
  'claim.claimant': 'Reclamante:',
  'claim.classificationLabel': 'Clasificación:',
  'claim.dueDate': 'Plazo de respuesta:',
  'claim.dueDateValue': 'Hasta {days} días hábiles',
  'claim.successBody':
    'Una copia de esta hoja ha sido generada para tu constancia. Puedes guardar una captura o imprimir esta constancia legal.',
  'claim.print': 'Imprimir Constancia',
  'claim.backToMenu': 'Volver a la Carta',
  'claim.errorRequired': 'Por favor completa todos los campos obligatorios (*).',
  'claim.errorTerms': 'Debes aceptar la declaración jurada para registrar la hoja.',
  'claim.errorSubmit': 'Ocurrió un error al procesar el registro.',
  'claim.registered': 'Hoja {code} registrada exitosamente.',

  // ── Geo-cerca GPS antifraude (CD-19) ────────────────────────────────────────
  'geofence.modalTitle': 'Verificación de Ubicación en Mesa',
  'geofence.modalSubtitle': 'Seguridad Antifraude del Restaurante',
  'geofence.distance': 'Distancia detectada:',
  'geofence.limit': 'Límite de mesa:',
  'geofence.body':
    'Para garantizar la frescura de tus platos y evitar órdenes involuntarias, los pedidos por QR requieren que te encuentres en el establecimiento.',
  'geofence.retry': 'Reintentar Ubicación',
  'geofence.callWaiter': 'Llamar al Mozo',
  'geofence.close': 'Cerrar',
  'geofence.disabled': 'Geocerca desactivada por la administración del restaurante.',
  'geofence.sandbox': 'Modo Desarrollo / Simulación Local: Pedido autorizado sin restricción GPS.',
  'geofence.noGps': 'Dispositivo sin GPS nativo. Aprobado en entorno de pruebas.',
  'geofence.unsupported': 'Tu navegador no soporta geolocalización para validar pedidos en mesa.',
  'geofence.verified': 'Ubicación verificada en el local (a {distance}m de la sede).',
  'geofence.outside':
    'Estás a {distance}m del restaurante. El límite máximo permitido en mesa es {limit}m.',
  'geofence.deniedBypass': 'Permiso GPS no concedido, pero autorizado por Bypass de Desarrollo.',
  'geofence.permissionDenied': 'Necesitamos tu ubicación para validar que estás en el restaurante.',
  'geofence.timeout': 'No pudimos obtener tu ubicación a tiempo. Vuelve a intentarlo.',

  // ── Avisos (toasts) del comensal ────────────────────────────────────────────
  'toast.added': 'Agregado: {dish}',
  'toast.orderSent': '¡Comanda enviada a Cocina KDS desde {table}!',
  'toast.tableSet': 'Mesa configurada: {table}',
  'toast.tableLinked': 'Mesa vinculada automáticamente por QR: {table}',
  'toast.promoApplied': 'Oferta aplicada: {dish} a {price} (-{percent}%)',
  'toast.repeatLoaded': '¡Comanda favorita cargada en tu pedido!',
  'toast.opening3d': 'Abriendo modelo 3D: {dish}',
  'toast.loading3dViewer': 'Cargando plato en visor 3D interactivo',
  'toast.rotating': 'Rotando {dish}',
  'toast.inspecting': 'Inspeccionando {dish}',
  'toast.cameraOn': 'Cámara AR activada: apunta hacia la mesa',
  'toast.cameraNotActivated': 'La cámara no se activó; puedes reintentar',
  'toast.nativeArFallbackReady': 'Modo asistido listo si el AR nativo no detectó la mesa',
  'toast.geofenceVerified': 'Ubicación verificada en mesa (±{accuracy}m)',
  'toast.waiterNotified': 'Mozo notificado para asistir tu mesa',
  'toast.waiterAlerted': '¡Garzón alertado! Un miembro del salón se acerca a tu mesa.',
  'toast.online': 'Conectado a la red del restaurante.',
  'toast.offlineMode': 'Modo Offline: Puedes seguir pidiendo normalmente.',
  'toast.synced': '¡Conexión restablecida! {count} pedido(s) sincronizados con cocina.',
  'offline.banner':
    'Modo Sin Conexión activo — Puedes seguir ordenando. Tus pedidos se enviarán solos al volver la red.',

  // ── Toggle de tema Sol/Luna (solo textos accesibles) ────────────────────────
  'theme.aria': 'Alternar tema claro u oscuro de la carta',
  'theme.toLight': 'Cambiar a tema claro',
  'theme.toDark': 'Cambiar a tema oscuro',

  // ── Selector de idioma [ES | EN] ────────────────────────────────────────────
  'lang.aria': 'Cambiar el idioma de la carta',
  'lang.toEnglish': 'Cambiar idioma a inglés (English)',
  'lang.toSpanish': 'Cambiar idioma a español (Spanish)'
} as const;

/** Clave de traducción válida (derivada del diccionario base). */
export type TranslationKey = keyof typeof es;

/** Traducción al Inglés. Debe cubrir EXACTAMENTE las claves de `es`. */
export const en: Record<TranslationKey, string> = {
  // ── Diner header ────────────────────────────────────────────────────────────
  'header.changeTable': 'Change Table',
  'header.changeTableAria': 'Change table, current table {table}',
  'header.autoOrderActive': 'QR self-order active',
  'header.openCart': 'Open my order',

  // ── Search & category tabs ──────────────────────────────────────────────────
  'search.placeholder': 'Search signature dishes, ingredients or pairings...',
  'search.clear': 'Clear search',
  'search.categoriesPrev': 'View previous categories',
  'search.categoriesNext': 'View more categories',

  // ── Menu: specialities grid ─────────────────────────────────────────────────
  'grid.title': 'Our Signature Menu',
  'grid.countOne': '{count} option',
  'grid.countOther': '{count} options',
  'grid.nativeArSubhead': 'Native AR on Android · GLB models ready for the table',
  'grid.emptyTitle': 'No dishes found',
  'grid.emptyBody': 'We found no results for "{query}". Try another ingredient or clear the filters.',
  'grid.emptyAction': 'View the full menu',

  // ── Dishes: cards, viewers & detail sheet ───────────────────────────────────
  'dish.photoHd': 'HD Photo',
  'dish.view3d360': '3D 360°',
  'dish.interact3d': 'Interact in 3D',
  'dish.hdSheet': 'Description',
  'dish.arViewer': 'AR Viewer',
  'dish.add': 'Add',
  'dish.addPrice': 'Add • {price}',
  'dish.orderPrice': 'Order Dish • {price}',
  'dish.orderThisDish': 'Order this Dish',
  'dish.viewIn3d': 'View in 3D',
  'dish.viewIn3dTitle': 'View this dish in interactive 3D',
  'dish.projectArTitle': 'Project with the AR camera',
  'dish.projectArTableTitle': 'Project this dish with the camera on your table',
  'dish.openNativeArAndroid': 'Open native Android AR',
  'dish.openDetails': 'View details for {dish}',
  'dish.openHeroDetails': 'Open details for {dish}',
  'dish.openHeroHd': 'Open description for {dish}',
  'dish.igvNote': 'VAT 18% included',
  'dish.reviewsCount': '{count} reviews',
  'dish.ratingsCount': '({count} reviews)',
  'dish.threeDTitle': '{dish} (3D)',
  'dish.threeDViewTitle': 'Interactive 3D view of {dish}',
  'dish.description': 'Description',
  'dish.allergens': 'Allergens',
  'dish.allergensEmpty': 'Allergen information is not available for this dish.',
  'dish.pairing': 'Recommended pairing',
  'dish.closeDetail': 'Close dish details',
  'dish.loading3d': 'Loading 3D engine...',

  // ── Cart ────────────────────────────────────────────────────────────────────
  'cart.aria': 'View order, {count} {dishes}',
  'unit.dishOne': 'dish',
  'unit.dishOther': 'dishes',
  'cart.title': 'Your Order • {table}',
  'cart.totalWithCount': 'Total ({count} {dishes}):',
  'cart.viewOrder': 'View Order',
  'cart.send': 'Send',
  'cart.close': 'Close my order',
  'cart.keepOrdering': 'Keep Ordering',
  'cart.confirmSend': 'Confirm & Send',
  'cart.subtotalNoIgv': 'SUBTOTAL (EXCLUDING VAT)',
  'cart.igv': 'VAT (18%)',
  'cart.totalToPay': 'TOTAL TO PAY',
  'cart.notePlaceholder': 'Kitchen note (e.g. no onion, medium rare...)',
  'cart.increase': 'Increase quantity',
  'cart.decrease': 'Decrease quantity',
  'cart.requestAccount': 'Request the Bill / Pay with Yape or Plin QR',

  // ── Live order tracker ──────────────────────────────────────────────────────
  'tracker.orderLabel': 'Order #{id} • {table}',
  'tracker.received': 'Received',
  'tracker.inKitchen': 'In Kitchen',
  'tracker.ready': 'Ready at the pass',
  'tracker.served': 'Served at table',
  'tracker.readyTitle': 'Your order is ready at the pass!',
  'tracker.readyBody': 'It is on its way to your table.',
  'tracker.itemsInProgress': '{count} dishes in progress',
  'tracker.total': 'Total: {amount}',
  'tracker.requestBill': 'Request Bill / Pay QR',
  'tracker.requestBillTitle': 'Request the bill and pay with Yape or Plin QR',

  // ── Returning guest (repeat order) ──────────────────────────────────────────
  'welcome.kicker': 'Returning Guest',
  'welcome.title': 'So good to have you back at your table!',
  'welcome.bodyPrefix': 'On your last visit you enjoyed:',
  'welcome.bodySuffix': 'Would you like to repeat your favourite combination today?',
  'welcome.repeat': 'Repeat this Order • {amount}',
  'welcome.explore': 'Explore Other Dishes',
  'welcome.dismiss': 'Dismiss reminder',

  // ── Table selector ──────────────────────────────────────────────────────────
  'table.title': 'Select your Table',
  'table.help':
    'Tell us which table you are at so we can send your order to the right kitchen station:',
  'table.confirm': 'Confirm',
  'table.label': 'Table {number}',
  'table.barLabel': 'Bar {number}',
  'table.terraceLabel': 'Terrace {number}',

  // ── Bottom navigation ───────────────────────────────────────────────────────
  'nav.aria': 'Digital menu navigation',
  'nav.menu': 'Menu',
  'nav.search': 'Search',
  'nav.order': 'Order',
  'nav.payQr': 'Pay QR',
  'nav.payQrTitle': 'Request the bill and pay with Yape or Plin QR',
  'nav.waiter': 'Waiter',
  'nav.waiterCalling': 'Calling',

  // ── Restaurant legal footer ─────────────────────────────────────────────────
  'footer.cuisine': 'Peruvian Signature Cuisine',
  'footer.complaints': 'Complaints Book',
  'footer.complaintsTitle': 'Official Complaints Book under INDECOPI law',
  'footer.legal':
    'In accordance with Supreme Decree No. 011-2011-PCM / Law No. 29571, Consumer Protection and Defence Code.',

  // ── Table AR viewer ─────────────────────────────────────────────────────────
  'ar.title': 'Table AR Viewer',
  'ar.waiting': 'Waiting for camera',
  'ar.openingNative': 'Opening native AR: {dish}',
  'ar.activating': 'Activating camera',
  'ar.anchored': 'Dish anchored to table:',
  'ar.realScale': 'Real Scale at Table:',
  'ar.requestingPermission': 'Requesting camera permission...',
  'ar.tapToActivate': 'Tap Activate camera to see the dish on your table.',
  'ar.nativeFallbackTitle': 'If native AR did not detect the table, use assisted mode.',
  'ar.nativeFallbackHelp': 'Activate the camera, point at the table, and tap where you want to place the dish.',
  'ar.permissionOnce': 'Your browser may ask for camera permission only once.',
  'ar.blocked': 'The camera could not be activated.',
  'ar.blockedHelp':
    'Chrome denied access. Tap Retry camera and, if the prompt appears, choose Allow.',
  'ar.failedHelp': 'Close other apps that use the camera and try again.',
  'ar.noCamera': 'No camera was found on this device.',
  'ar.noCameraHelp': 'Close Zoom, Meet, OBS or any other app using the camera, then try again.',
  'ar.activateCamera': 'Activate camera',
  'ar.retryCamera': 'Retry camera',
  'ar.activatingCamera': 'Activating camera...',
  'ar.close': 'Close AR viewer',
  'ar.scaleDown': 'Make the dish smaller',
  'ar.scaleUp': 'Make the dish larger',

  // ── Flash deal: ticker, pop-up & countdown ──────────────────────────────────
  'promo.tickerLabel': 'Flash Deal · -{percent}% today',
  'promo.tickerBadge': 'Flash Deal · {badge}',
  'promo.savingsInline': 'You save {amount}',
  'promo.savings': 'Save {amount}',
  'promo.specialOffer': 'Special Offer!',
  'promo.applyDiscount': 'Apply Discount',
  'promo.endsIn': 'Ends in {time}!',
  'promo.roledescription': 'deal',
  'promo.offerPosition': 'Deal {index} of {total}: {dish}',
  'promo.viewOffer': 'View deal {index} of {total}: {dish}',
  'promo.carouselAria': 'Deals carousel: {count} available',
  'promo.activeAria': 'Active deal: {dish}',
  'promo.photosAria': 'Deal photos: {dish}',
  'promo.secondDish': 'Second dish of the deal',
  'promo.secondDishNamed': '{dish} (second dish of the deal)',
  'promo.close': 'Close flash deal',
  'promo.counter': '({index} of {total} deals)',
  'promo.mechanicDiscount': '{discount} off the {dish}',
  'promo.mechanicTwoForOne': '2 for 1 on {dish}',
  'promo.mechanicSecondUnit': 'Get {main} and {discount} off the {complement}',
  'promo.mechanicCombo': '{discount} off the combo: {main} + {complement}',

  // ── Payment gateway + post-payment review ───────────────────────────────────
  'pay.title': 'Request the Bill and Pay',
  'pay.tableTotal': '{table} • Total: {amount}',
  'pay.paused':
    'Digital payments are temporarily paused. Your waiter will come to your table to arrange the payment.',
  'pay.methodYape': 'Yape QR',
  'pay.methodPlin': 'Plin QR',
  'pay.methodCard': 'Card',
  'pay.methodCash': 'Cash',
  'pay.payWithYape': 'Pay with Yape',
  'pay.payWithPlin': 'Pay with Plin',
  'pay.officialQr': 'Official Restaurant QR',
  'pay.qrAltYape': 'Official Yape QR',
  'pay.qrAltPlin': 'Official Plin QR',
  'pay.totalToPay': 'Total to pay: {amount}',
  'pay.copy': 'Copy',
  'pay.copyToast': 'Number copied to the clipboard',
  'pay.opLabel': 'Operation Code or Voucher:',
  'pay.autofill': 'Autofill (test)',
  'pay.opPlaceholder': 'E.g. 481920 (6 or 8 numeric digits)',
  'pay.opValid': 'Valid operation code ({count} digits)',
  'pay.voucherOk': 'Payment screenshot attached successfully',
  'pay.opMissingDigits': 'Missing digits: 6 to 8 numbers required (you have {count})',
  'pay.opHint': 'Enter the 6 or 8 digits from your receipt or attach a photo of the voucher.',
  'pay.uploadCta': 'Upload payment screenshot',
  'pay.uploaded': 'Voucher attached',
  'pay.removeVoucher': 'Remove voucher',
  'pay.voucherAttached': 'Voucher attached successfully',
  'pay.voucherSimulated': 'Simulated voucher with bank code OP-{code}',
  'pay.posTitle': 'Card Payment with Wireless POS at Table',
  'pay.posBody':
    'We accept Visa, Mastercard, Diners and Amex. Once confirmed, the waiter assigned to {table} will come with the wireless terminal.',
  'pay.cashTitle': 'Which bill or amount will you pay with?',
  'pay.cashExact': 'Exact Amount',
  'pay.cashBill50': 'S/ 50 bill',
  'pay.cashBill100': 'S/ 100 bill',
  'pay.cashBill200': 'S/ 200 bill',
  'pay.cashChange': 'Change: {amount}',
  'pay.cashInsufficient': 'Insufficient',
  'pay.cashCustom': 'Other bill/amount:',
  'pay.cashChangeTitle': 'Change your waiter will bring:',
  'pay.cashTotal': 'Total: {amount}',
  'pay.cashGiven': 'You pay with: {amount}',
  'pay.cashShort':
    'The amount entered ({given}) does not cover the order total ({total}). You are short {missing}.',
  'pay.confirm': 'Confirm Payment Made • {amount}',
  'pay.confirming': 'Confirming Payment...',
  'pay.needOp': 'Enter the OP code or attach a voucher',
  'pay.needCash': 'Select a sufficient bill',
  'pay.errorDigits': 'Enter the 6 or 8 digits of the operation code or attach the voucher',
  'pay.errorCash': 'The amount you pay with must cover the total bill',
  'pay.errorConfirm': 'The payment could not be confirmed. Please try again.',
  'pay.paid': 'Payment with {method} registered. Thank you!',
  'pay.accountRequested': 'Bill requested ({method}). Your waiter is on the way with the receipt.',
  'pay.doneKicker': 'PAYMENT CONFIRMED SUCCESSFULLY!',
  'pay.feedbackQuestion': 'How was your experience at Áurea Bistro?',
  'pay.feedbackSubtitle': '{table} • Your comments help us keep perfecting every dish.',
  'pay.rating1': 'Needs improvement',
  'pay.rating2': 'Fair',
  'pay.rating3': 'Good',
  'pay.rating4': 'Very good!',
  'pay.rating5': 'Outstanding!',
  'pay.tipLabel': 'Tip for the kitchen and service team (optional):',
  'pay.tipNone': 'No tip',
  'pay.commentsLabel': 'Comments or compliments for the Chef:',
  'pay.commentsPlaceholder': 'The Wok Fried Rice was unbeatable and the pairing was perfect...',
  'pay.submitReview': 'Send Rating & Finish',
  'pay.savingReview': 'Saving Review...',
  'pay.reviewThanks': 'Thanks for your comments and tip!',
  'pay.thanksTitle': 'Thank You Very Much for Your Visit!',
  'pay.thanksBody':
    'Your order at {table} has been completed. It has been an honour to serve you today at Áurea Bistro.',
  'pay.closeBack': 'Close and Return to the Menu',

  // ── Complaints Book (INDECOPI) ──────────────────────────────────────────────
  'claim.title': 'Virtual Complaints Book',
  'claim.info':
    'Under Peru\'s consumer protection law (INDECOPI), the establishment will formally answer this sheet within no more than {days} business days via the email address provided.',
  'claim.section1': '1. Identification of the Claimant Consumer',
  'claim.fullName': 'Full Name *',
  'claim.fullNamePlaceholder': 'E.g. John Smith',
  'claim.doc': 'Doc. *',
  'claim.docNumber': 'Document No. *',
  'claim.docNumberPlaceholder': 'Document No.',
  'claim.email': 'Email Address (for the reply) *',
  'claim.emailPlaceholder': 'name@example.com',
  'claim.phone': 'Phone / WhatsApp *',
  'claim.address': 'Full Address *',
  'claim.addressPlaceholder': '123 Main Street, District, City',
  'claim.minor': 'The claimant is a minor',
  'claim.parentNamePlaceholder': 'Full name of the parent or legal guardian',
  'claim.section2': '2. Identification of the Contracted Good',
  'claim.goodType': 'Type of Good',
  'claim.product': 'Product',
  'claim.service': 'Service',
  'claim.amount': 'Claimed Amount (S/)',
  'claim.reference': 'Reference or Table',
  'claim.section3': '3. Details of the Claim and Request',
  'claim.classification': 'Claim Classification:',
  'claim.typeClaim': 'CLAIM',
  'claim.typeClaimDesc':
    'Disagreement related to the products or services (e.g. wrong charge, dish not in good condition).',
  'claim.typeComplaint': 'COMPLAINT',
  'claim.typeComplaintDesc':
    'Dissatisfaction regarding customer service or any other aspect not related to the product (e.g. slow service).',
  'claim.detail': 'Details of what happened *',
  'claim.detailPlaceholder':
    'Describe precisely what happened, including date, time and the staff involved...',
  'claim.request': 'Specific Request of the Consumer *',
  'claim.requestPlaceholder':
    'What solution or action you request from the restaurant (e.g. refund, dish replacement, apology)...',
  'claim.oath':
    'I declare under oath that the information provided is truthful and I authorise the establishment to contact me at the email address provided, in accordance with the Consumer Protection Code (Law No. 29571).',
  'claim.cancel': 'Cancel',
  'claim.submit': 'Register Claim',
  'claim.submitting': 'Registering...',
  'claim.successKicker': 'Legal Registration Record',
  'claim.successTitle': 'Complaint Sheet Registered',
  'claim.codeLabel': 'Code: {code}',
  'claim.issuedAt': 'Issued on:',
  'claim.claimant': 'Claimant:',
  'claim.classificationLabel': 'Classification:',
  'claim.dueDate': 'Response deadline:',
  'claim.dueDateValue': 'Up to {days} business days',
  'claim.successBody':
    'A copy of this sheet has been generated for your records. You can take a screenshot or print this legal record.',
  'claim.print': 'Print Record',
  'claim.backToMenu': 'Back to the Menu',
  'claim.errorRequired': 'Please complete all required fields (*).',
  'claim.errorTerms': 'You must accept the sworn statement to register the sheet.',
  'claim.errorSubmit': 'An error occurred while processing the registration.',
  'claim.registered': 'Sheet {code} registered successfully.',

  // ── GPS anti-fraud geofence (CD-19) ─────────────────────────────────────────
  'geofence.modalTitle': 'Table Location Verification',
  'geofence.modalSubtitle': 'Restaurant Anti-Fraud Security',
  'geofence.distance': 'Distance detected:',
  'geofence.limit': 'Table limit:',
  'geofence.body':
    'To guarantee the freshness of your dishes and avoid unintended orders, QR orders require you to be inside the venue.',
  'geofence.retry': 'Retry Location',
  'geofence.callWaiter': 'Call the Waiter',
  'geofence.close': 'Close',
  'geofence.disabled': 'Geofence disabled by the restaurant administration.',
  'geofence.sandbox': 'Development / Local Simulation Mode: order authorised with no GPS restriction.',
  'geofence.noGps': 'Device without native GPS. Approved in the testing environment.',
  'geofence.unsupported': 'Your browser does not support geolocation to validate table orders.',
  'geofence.verified': 'Location verified inside the venue ({distance}m from the restaurant).',
  'geofence.outside':
    'You are {distance}m away from the restaurant. The maximum allowed at the table is {limit}m.',
  'geofence.deniedBypass': 'GPS permission not granted, but authorised by the Development Bypass.',
  'geofence.permissionDenied': 'We need your location to confirm you are inside the restaurant.',
  'geofence.timeout': 'We could not get your location in time. Please try again.',

  // ── Diner toasts ────────────────────────────────────────────────────────────
  'toast.added': 'Added: {dish}',
  'toast.orderSent': 'Order sent to the KDS kitchen from {table}!',
  'toast.tableSet': 'Table set: {table}',
  'toast.tableLinked': 'Table automatically linked via QR: {table}',
  'toast.promoApplied': 'Deal applied: {dish} at {price} (-{percent}%)',
  'toast.repeatLoaded': 'Your favourite order has been loaded!',
  'toast.opening3d': 'Opening 3D model: {dish}',
  'toast.loading3dViewer': 'Loading dish in the interactive 3D viewer',
  'toast.rotating': 'Rotating {dish}',
  'toast.inspecting': 'Inspecting {dish}',
  'toast.cameraOn': 'AR camera on: point it at your table',
  'toast.cameraNotActivated': 'The camera did not start; you can retry',
  'toast.nativeArFallbackReady': 'Assisted mode is ready if native AR did not detect the table',
  'toast.geofenceVerified': 'Location verified at your table (±{accuracy}m)',
  'toast.waiterNotified': 'Waiter notified to assist your table',
  'toast.waiterAlerted': 'Waiter alerted! A member of the floor team is on the way to your table.',
  'toast.online': 'Connected to the restaurant network.',
  'toast.offlineMode': 'Offline mode: you can keep ordering normally.',
  'toast.synced': 'Connection restored! {count} order(s) synced with the kitchen.',
  'offline.banner':
    'Offline mode is active — You can keep ordering. Your orders will be sent automatically once the network returns.',

  // ── Light/Dark theme toggle (accessible text only) ──────────────────────────
  'theme.aria': 'Toggle light or dark theme of the menu',
  'theme.toLight': 'Switch to light theme',
  'theme.toDark': 'Switch to dark theme',

  // ── Language selector [ES | EN] ─────────────────────────────────────────────
  'lang.aria': 'Change the menu language',
  'lang.toEnglish': 'Switch language to English',
  'lang.toSpanish': 'Switch language to Spanish (Español)'
};

/** Índice de diccionarios por idioma. */
export const MENU_DICTIONARIES: Record<MenuLanguage, Record<TranslationKey, string>> = { es, en };

/**
 * Reemplaza los `{placeholders}` de una plantilla ya traducida.
 * Si un parámetro no llega, se conserva el `{placeholder}` literal (nunca imprime `undefined`).
 */
export function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value === undefined || value === null ? match : String(value);
  });
}

/**
 * Traduce una clave sin depender de React (utilidades puras y árboles fuera de
 * componentes, como el adaptador de contenido dinámico de la carta).
 */
export function translate(
  language: MenuLanguage,
  key: TranslationKey,
  params?: TranslationParams
): string {
  return interpolate(MENU_DICTIONARIES[language][key], params);
}
