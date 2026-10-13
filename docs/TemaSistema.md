# CD-33: tema automático del comensal

Se mantienen las paletas, el diseño y ThemeToggle.tsx. El botón Sol/Luna sigue transparente, sin fondo, borde ni sombra. No se agregan controles ni tarjetas.

- La primera carga de `/menu` (también `/`, que muestra la misma carta) ejecuta un script síncrono en `<head>` antes del cuerpo: elección guardada válida, o `matchMedia('(prefers-color-scheme: dark)').matches`. Aplica las clases existentes y color-scheme antes de pintar.
- Durante la sesión se escucha `addEventListener('change')` del MediaQueryList. Safari antiguo usa addListener si no existe addEventListener. Se retira el listener al salir.
- Solo una elección manual escribe `gastropulse_menu_theme` en localStorage. El modo detectado automáticamente no se guarda: una recarga sigue usando el sistema si nunca se pulsó el botón.
- Si localStorage está bloqueado, se sigue detectando el sistema; una elección manual prevalece en memoria durante esa sesión, aunque no puede conservarse tras recargar.
- El tema administrativo deja de aplicar sus overrides en la carta y se restaura al desmontarla. Se mantiene el acento existente del restaurante. El provider sincroniza antes de pintar también cuando se entra mediante navegación del cliente.

## Verificación

`node --test tests/menu-theme.test.cjs` comprueba resolución inicial, script previo al cuerpo, cambios del SO, prioridad manual, recarga, limpieza, storage bloqueado y listener antiguo de Safari. Estas pruebas simulan las preferencias del dispositivo; no reemplazan una prueba en un Android o iPhone físico.

La compilación y ESLint de los archivos modificados se verificaron. En el navegador local se comprobó el cambio claro/oscuro con el botón y la permanencia del modo claro después de recargar, sin errores de hidratación observados. Los avisos existentes de Realtime en Supabase no pertenecen al tema.

Para comprobar en un celular: abrir sin elección manual previa; cambiar claro/oscuro en los ajustes del sistema con la carta abierta; después pulsar Sol/Luna y recargar para verificar prioridad manual. Para volver a probar la detección automática, quitar únicamente `gastropulse_menu_theme` de los datos del sitio de prueba.

Referencia: [MediaQueryList change](https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList/change_event).
