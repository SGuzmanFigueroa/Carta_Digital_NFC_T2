# CD-47: audio, curva del pase y previa de ofertas

## Cambios

- El KDS muestra el mensaje «Toca la pantalla para activar las alertas sonoras de cocina» mientras el audio habilitado no esté listo. Un gesto real de puntero, clic o teclado crea/reanuda AudioContext. El mensaje se oculta al confirmar estado running. Si el permiso falla, permanece y permite reintentar. Los listeners se retiran al activarse o desmontar el KDS; no cancelan los botones de despacho.
- prepareForPlayback devuelve una promesa booleana y captura errores. Los sonidos, notas, ganancias, tiempos y controles de silencio existentes se conservan. Preparar audio no desactiva el silencio ni reproduce un sonido extra.
- La curva usa un viewBox con margen para los extremos y el indicador; el trazo conserva grosor. Las horas se muestran como texto HTML en tres columnas alineadas, sin deformar su tipografía al variar la anchura.
- Una previa incompleta, sin plato válido o sin complemento obligatorio usa una oferta de ejemplo de S/ 40.00 con 15 %, final S/ 34.00. Se identifica como plantilla y no rellena el formulario ni publica datos. Una oferta completa conserva el motor de precios existente.
- El pop-up administrativo ahora recibe LanguageProvider: antes fallaba al abrir porque PromoDealModal requiere ese contexto de la carta.
- Se retiraron los emojis que ya había en comentarios de PromoOffersManager. No se agregaron emojis a los archivos ni a las interfaces de esta tarea.

## Validación

`npm test`: 28 pruebas aprobadas, incluyendo cinco nuevas en tests/kds-stability.test.cjs. Cubren audio, silencio, rechazos y falta de API, reintento y limpieza del banner, ofertas vacías e inválidas, las cuatro mecánicas con datos y el gráfico. `npm run build` aprobado; lint de audio, helper de previa y gráfico aprobado.

Verificación en navegador local:

1. Entrar con el acceso de demostración; abrir KDS y confirmar que el banner aparece.
2. Pulsar el banner: deja de mostrarse después de activar el contexto de audio.
3. Vista de tablet horizontal 1024 x 768: curva y horas 14:00, 14:30 y 14:48 visibles y alineadas.
4. Configuración, Ofertas, Vista Previa Móvil sin completar: plantilla identificada como ejemplo.
5. Seleccionar Chaufa de S/ 58.00 y vigencia sugerida: previa real al 15 %, final S/ 49.30 y ahorro S/ 8.70.

No se publicaron ofertas, no se despacharon comandas reales ni se cambió Supabase. No se verificó físicamente la salida de altavoces ni una sesión privada de un navegador móvil; los sonidos de despacho se comprobaron mediante el AudioContext simulado de las pruebas. Para la aceptación en hardware: abrir /kds en incógnito, tocar para activar y despachar una comanda de prueba autorizada con el dispositivo sin silencio.

Referencia: [Web Audio API: autoplay y gestos](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices).
