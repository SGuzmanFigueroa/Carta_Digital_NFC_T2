# CD-52: variables obligatorias del cliente Supabase

`src/lib/supabase.ts` ya no tiene una URL ni una clave anon de respaldo. Lee directamente `process.env.NEXT_PUBLIC_SUPABASE_URL` y `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`, como requiere el empaquetado del cliente de Next.js.

Ambas deben estar configuradas y no estar vacías ni contener solo espacios. Si falta alguna, el módulo lanza un error al inicializarse, antes de llamar a createBrowserClient. El mensaje nombra las variables ausentes y pide configurarlas en .env.local o en el despliegue; no imprime sus valores. No se conecta a un proyecto alternativo.

Se conservan createBrowserClient de @supabase/ssr, sus sesiones en cookies y la configuración Realtime existente. No se modifican credenciales, esquemas, políticas ni datos de Supabase.

## Configuración y pruebas

- Local: mantener ambas variables en .env.local y reiniciar el servidor después de cambiarlas.
- Despliegue: configurar ambas variables en el proveedor antes del build. Las variables NEXT_PUBLIC se incorporan al paquete del navegador durante la compilación; si cambian, volver a compilar y desplegar.
- `node --test tests/supabase-env.test.cjs`: comprueba ausencia de ambas variables, ausencia individual, valores vacíos y espacios, error sin exposición de valores y creación del mismo tipo de cliente cuando la configuración es válida. Usa un entorno aislado; no borra ni altera .env.local.
- `npm run build`: validar con las variables reales del entorno local, sin mostrar la clave en la salida.

El alcance es lib/supabase.ts. No altera el resto de clientes del servidor ni la política CSP de next.config.ts.

## Resultado local

49 pruebas aprobadas; ESLint de los archivos de esta tarea sin avisos; npm run build aprobado con Next.js 16.3.8. El cliente creado desde este módulo también consultó el catálogo público de categorías con respuesta HTTP 200 usando las variables locales. No se imprimieron sus valores ni se cambiaron datos remotos.
