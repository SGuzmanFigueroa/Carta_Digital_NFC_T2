# CD-24: persistencia segura del Libro de Reclamaciones

## Funcionamiento

`ComplaintBookModal.tsx` valida DNI de ocho dígitos, RUC de once, formato del correo, campos obligatorios, monto y representante del menor. CE y pasaporte siguen disponibles con validación de formato. Se valida de nuevo en el endpoint y en PostgreSQL: cambiar el navegador no evita las reglas. Esto verifica formato, no identidad ante Reniec ni situación del RUC ante SUNAT.

La base genera el correlativo `REC-AAAA-XXXX`, con año de Lima y numeración por libro. Por ejemplo, `REC-2026-0001`. Cuatro dígitos es el mínimo; después de 9999 se usa 10000 sin truncar. El código es el correlativo del libro del proveedor: no representa una certificación ni un registro ante Indecopi. Los códigos históricos se conservan.

El contador y la hoja se guardan en una transacción. Solicitudes simultáneas o reintentos con la misma referencia devuelven la hoja original y no consumen otro número. Reutilizar una referencia con contenido distinto se rechaza.

Los visitantes solo pueden registrar mediante el RPC validado. No pueden consultar la tabla ni insertar registros directamente. El acceso administrativo exige una sesión real de Supabase Auth y permisos asignados en `app_metadata`, que el navegador no puede concederse. Las hojas registradas son inmutables salvo estado, observaciones y fecha de atención.

La confirmación solo aparece cuando Supabase responde con el correlativo y fecha. La copia imprimible/descargable contiene la hoja completa y la identidad del proveedor tal como estaba al registrarse. No se afirma que se haya enviado un correo automático.

## Edición del establecimiento

En **Configuración → Libro de Reclamaciones** se editan razón social, RUC y dirección. Si falta una sesión Auth, la sección permite iniciar sesión con el correo y contraseña del administrador del libro. El guardado verifica los permisos en la base, independientemente del rol mostrado por la interfaz antigua. Las cuentas antiguas de `staff` y sus PIN no sustituyen una cuenta Auth.

La dirección no se inventa ni se fija en el código. Antes de completarla no se acepta un registro definitivo. Los cambios posteriores solo afectan hojas nuevas.

## Almacenamiento local

Los nuevos borradores se cifran con AES-GCM de 256 bits e IV aleatorio en IndexedDB. La clave es no exportable mediante Web Crypto y no se guardan nuevos datos personales en localStorage. El borrador permite conservar el mismo identificador ante un fallo de red o una respuesta perdida. Al confirmar el registro se elimina el borrador.

Una hoja cifrada localmente es **pendiente**, no registrada: no tiene correlativo REC ni acredita recepción por el restaurante. Al reabrir el modal se puede recuperar y reintentar. Si no es posible usar el libro virtual, se indica solicitar el libro físico de respaldo. Si falla también el almacenamiento del dispositivo, no se afirma que los datos se hayan guardado.

El cifrado reduce la exposición accidental del texto almacenado; no protege frente a scripts maliciosos ejecutados dentro del mismo origen, un perfil de navegador comprometido o la eliminación de datos del navegador. Los datos antiguos de localStorage no se reenvían como reclamos nuevos: requieren revisión/migración antes de retirar una instalación anterior. El almacenamiento local no sustituye el archivo oficial ni sus respaldos.

## Activación (base remota pendiente)

1. Aplicar primero el esquema existente, incluida `20261004225000_create_complaint_book.sql`. Después aplicar `supabase/migrations/20261009010000_secure_complaint_book.sql` mediante el procedimiento de migraciones del equipo. No se ha aplicado en la base remota desde esta sesión.
2. Mantener `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurados. No hace falta poner una clave service_role en el navegador.
3. Crear/usar una cuenta de administrador en Supabase Authentication. Mediante la administración de Auth, asignarle `app_metadata.complaint_role = "admin"` y `app_metadata.complaint_book_id = "primary"`. No usar `user_metadata` para permisos. Renovar la sesión después de cambiar permisos.
4. Para otra instancia/libro, configurar `COMPLAINT_BOOK_ID` en el servidor. La API usa ese libro y rechaza formularios enviados para otro.
5. Desde Configuración, iniciar la sesión segura y guardar la identificación del establecimiento. La migración intenta tomar razón social/RUC de `system_config`; si no están disponibles, el administrador puede crear la identificación con el mismo formulario.
6. Verificar en el navegador: documento o correo inválido rechazado, registro con `REC-2026-XXXX`, copia completa, caída de red con pendiente cifrado y reintento sin duplicar. Probar permisos con un visitante y administrador de otro libro.

La atención de reclamos, respuesta al consumidor, conservación de evidencias, respaldos y reportes regulatorios que correspondan son obligaciones operativas del proveedor. Este cambio implementa los controles técnicos descritos; no certifica cumplimiento integral por sí solo.

## Pruebas

- `npm run test:complaints`: validación, copia con escape de HTML, endpoint, numeración concurrente, rollback, reintentos, permisos, edición del proveedor y cifrado local con recuperación.
- `npx tsc --noEmit --incremental false`: tipos; usar `next typegen` después de cambiar de rama si quedaron rutas generadas antiguas.
- `npm run build`: compilación de producción.

No se utilizaron datos reales de consumidores ni se crearon hojas en Supabase remoto durante las pruebas.

## Referencia oficial

[Preguntas y respuestas de Indecopi sobre el Libro de Reclamaciones](https://consumidor.gob.pe/wp-content/uploads/2020/07/Preguntas_Respuestas_LR_12.11.2025.pdf): numeración correlativa, identificación del proveedor y consumidor, copia imprimible/enviable, respuesta máxima de quince días hábiles y libro físico de respaldo. El libro no se registra ni certifica ante Indecopi.
