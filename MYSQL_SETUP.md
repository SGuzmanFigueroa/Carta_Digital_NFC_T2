# Configurar MySQL para el backend (T2)

No hay que crear nada a mano. La primera vez que arranca, el backend crea solo:

- la base de datos `carta_digital_t2`,
- las tablas `categories`, `dishes`, `restaurant_tables` y `staff`,
- datos de ejemplo: 4 categorías, 5 platos, 4 mesas y 3 trabajadores.

## 1. Tener MySQL 8 encendido

- MySQL Server 8 instalado y escuchando en `localhost:3306`.
- En Windows, revisa en **Servicios** que `MySQL80` esté **Iniciado**.

## 2. Darle al backend tu usuario y clave

Por defecto se conecta con usuario `root` y clave `root`. Si tu clave es otra, usa una de estas dos opciones.

### Opción A (recomendada): variable de entorno, sin tocar archivos

Desde PowerShell, dentro de la carpeta `backend` (cambia `miClave123` por tu clave):

```powershell
$env:DB_PASSWORD="miClave123"; .\mvnw spring-boot:run
```

Si tu usuario no es `root`:

```powershell
$env:DB_USERNAME="miUsuario"; $env:DB_PASSWORD="miClave123"; .\mvnw spring-boot:run
```

Así nadie sube su clave al repositorio.

### Opción B: editar el archivo de configuración

En `backend/src/main/resources/application.properties`, cambia el valor después de los dos puntos:

```properties
spring.datasource.username=${DB_USERNAME:root}
spring.datasource.password=${DB_PASSWORD:miClave123}
```

No hagas commit de este cambio.

## 3. Comprobar que funcionó

Con el backend corriendo, abre MySQL Workbench y ejecuta:

```sql
USE carta_digital_t2;
SHOW TABLES;
SELECT * FROM dishes;
```

Deben aparecer las 4 tablas y 5 platos de ejemplo. También puedes abrir http://localhost:8080/api/categories en el navegador.

## Errores comunes

| Error en la consola | Causa | Solución |
|---|---|---|
| `Access denied for user 'root'@'localhost'` | Clave o usuario incorrectos | Revisa `DB_USERNAME` / `DB_PASSWORD` |
| `Communications link failure` | MySQL apagado o en otro puerto | Inicia el servicio `MySQL80`; si usas otro puerto, cámbialo en `spring.datasource.url` |
| `Unknown database` | No debería pasar: la URL lleva `createDatabaseIfNotExist=true` | Revisa que el usuario tenga permiso para crear bases |
| `Port 8080 was already in use` | Otro programa usa el puerto | Ciérralo o agrega `server.port=8081` en `application.properties` |

## (Opcional) Usuario propio para el proyecto

Si no quieren usar `root`, creen un usuario en Workbench:

```sql
CREATE USER 'carta'@'localhost' IDENTIFIED BY 'carta123';
GRANT ALL PRIVILEGES ON carta_digital_t2.* TO 'carta'@'localhost';
FLUSH PRIVILEGES;
```

Luego arranquen el backend con `$env:DB_USERNAME="carta"; $env:DB_PASSWORD="carta123"; .\mvnw spring-boot:run`.

> Nota: con `GRANT` solo sobre `carta_digital_t2.*`, la base debe existir antes. Créenla con `CREATE DATABASE carta_digital_t2;` o arranquen una vez con `root`.

## Sin MySQL

Para una prueba rápida sin MySQL, `.\mvnw spring-boot:test-run` levanta el backend con una base H2 en memoria. Los datos se pierden al apagarlo.
