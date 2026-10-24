# T2 · CRUD de tablas maestras (Angular + Spring Boot)

CRUD completo (listar, crear, editar, eliminar) de las cuatro tablas maestras de la Carta Digital:

| Tabla | Endpoint REST | Pantalla Angular |
|---|---|---|
| `categories` | `/api/categories` | `/categorias` |
| `dishes` (platos, con FK a categoría) | `/api/dishes` (filtro `?categoryId=`) | `/platos` |
| `restaurant_tables` (mesas) | `/api/tables` | `/mesas` |
| `staff` (personal) | `/api/staff` | `/personal` |

Las tablas transaccionales (`orders`, `order_items`, `complaint_book`, `waiter_calls`, etc.) quedan fuera porque no son maestras.

## Estructura

```
backend/            Spring Boot 4.1 · Java 25 · JPA · MySQL
  entity/           Category, Dish, RestaurantTable, Staff (con validaciones)
  repository/       JpaRepository por entidad
  service/          Reglas de negocio (duplicados, FK, 404)
  controller/       REST: GET, GET/{id}, POST, PUT/{id}, DELETE/{id}
  exception/        Errores JSON uniformes (400, 404, 409)
  config/           CORS para localhost:4200 y datos de ejemplo
frontend-angular/   Angular 21 · standalone · signals · formularios reactivos
  core/             Modelos, CrudService genérico y CrudPage base
  pages/            Una página por tabla maestra
```

## Cómo ejecutarlo

1. **MySQL**: debe estar corriendo en `localhost:3306`. La base `carta_digital_t2` y las tablas se crean solas.
   Usuario/clave por defecto `root`/`root`; si tu clave es otra, cámbiala en
   `backend/src/main/resources/application.properties` o usa variables de entorno:

   ```bash
   set DB_USERNAME=root
   set DB_PASSWORD=tu_clave
   ```

2. **Backend** (puerto 8080):

   ```bash
   cd backend
   mvnw spring-boot:run
   ```

3. **Frontend** (puerto 4200):

   ```bash
   cd frontend-angular
   npm install
   npm start
   ```

   Abre http://localhost:4200

> Si no tienes MySQL a mano, `mvnw spring-boot:test-run` levanta el backend con H2 en memoria.

## Reglas implementadas

- Nombre de categoría, número de mesa y usuario del personal son únicos (409 si se repiten).
- No se puede eliminar una categoría que tiene platos (409).
- Validaciones en backend (Bean Validation) y en frontend (Validators), con el mensaje de cada campo.
- Al primer arranque se cargan datos de ejemplo si las tablas están vacías.

## Pruebas

```bash
cd backend && mvnw test          # 4 tests: CRUD de las 4 tablas contra H2
cd frontend-angular && npm test  # 2 tests del layout
```
