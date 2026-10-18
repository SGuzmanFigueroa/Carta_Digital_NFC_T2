# CD-53: protección de la URL de retorno del login

`getSafeLoginRedirect` se exporta desde authService y se implementa como función pura en src/utils/loginRedirect.ts. La página de login valida el parámetro leído de URLSearchParams y LoginScreen lo vuelve a validar inmediatamente antes de router.replace. Contraseña, PIN y acceso de demostración usan ese mismo punto de navegación.

Solo se aceptan rutas que empiezan por / y un carácter alfanumérico ASCII. Se rechazan doble slash inicial, barras invertidas, controles, espacios, protocolos http:/https: sin distinguir mayúsculas, codificación inválida y rutas cuyo origen o normalización no sean internos. La ruta normalizada usa caracteres alfanuméricos, slash, punto, guion y guion bajo; se conservan consultas y fragmentos seguros. El resultado se devuelve sin reparar ni recortar el texto del usuario. No se hacen solicitudes a destinos externos para validar.

Todo parámetro presente pero inválido usa /dashboard. Si no existe el parámetro, se mantiene la ruta habitual según el rol. Esta validación no concede permisos: los controles actuales de acceso a cada pantalla siguen vigentes. No cambia la recuperación de contraseña ni Supabase.

## Verificación

- `npm test`: 31 pruebas aprobadas, incluyendo tres grupos nuevos de redirección.
- `npm run build`: aprobado.
- Pruebas del validador: hosts externos, protocolos, escapes de barras, controles, dot-segments peligrosos, parámetros vacíos, rutas válidas y consultas/fragmentos internos.
- Pruebas de la página y del componente: decodificación del parámetro y nueva validación en el punto de navegación, incluso con una prop directa maliciosa.
- Navegador local, usando el acceso de demostración: `/login?redirect=%2F%5Cevil.com` y `/login?redirect=%2F%2Fevil.com` terminan en `/dashboard`; `/login?redirect=/pedidos` termina en `/pedidos`. No se navegaron dominios externos ni se modificaron comandas.

Referencias: [OWASP: Unvalidated Redirects](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html), [Next.js useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router).
