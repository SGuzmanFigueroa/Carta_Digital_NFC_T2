# GastroPulse OS (Carta Digital 3D + NFC)

Repositorio Frontend/Web para la plataforma de gestión de restaurantes. Combina una carta digital accesible por QR o NFC, pedidos en tiempo real, tableros KDS para cocina y herramientas administrativas para la operación del restaurante.

## Tecnologías del MVP

- **Next.js 16 (App Router)** – Framework principal para la aplicación y sus rutas.
- **React 19 y TypeScript** – Construcción de la interfaz y tipado estático.
- **Tailwind CSS 4** – Estilos y diseño responsivo para móviles, tablets y desktop.
- **Supabase** – Backend con PostgreSQL, Auth, Storage y Realtime.
- **Three.js** – Renderizado de modelos 3D de los platos.
- **React Context** – Estado compartido de la aplicación, sesiones y notificaciones.
- **Framer Motion** – Animaciones y transiciones de interfaz.
- **Playwright** – Pruebas end-to-end.

## Arquitectura de Módulos

El sistema está organizado en módulos para los comensales, el personal operativo y la administración:

### 1. Experiencia del Comensal (Mobile-First)

- **Menú digital** – Catálogo de platos y bebidas disponible en `/menu`, accesible mediante QR o NFC.
- **Detalle 3D y pedidos** – Consulta de platos, visualización de modelos 3D y envío de pedidos desde la mesa.

### 2. Gestión Operativa y Personal (Desktop / Tablet)

- **Central de Pedidos** – Consulta y actualización de pedidos, además de revisión de pagos declarados.
- **Cocina KDS** – Tablero para consultar y gestionar las comandas.
- **Panel Admin y métricas** – Vista de mesas, ocupación y métricas del restaurante.
- **Gestión de Personal y Roles** – Administración de colaboradores con roles de administrador, cocina, mozo, runner y barra.
- **Configuración del Sistema** – Gestión de la identidad y preferencias del restaurante.

### 3. Rutas activas

| Ruta | Acceso | Descripción |
| --- | --- | --- |
| `/menu` | Público | Carta digital para los comensales. |
| `/kds` | Personal autenticado | Tablero KDS para gestionar comandas. |
| `/pedidos` | Personal autenticado | Gestión de pedidos y revisión de pagos declarados. |
| `/dashboard` | Administrador | Panel ejecutivo y vista de mesas. |
| `/personal` | Administrador | Gestión de colaboradores. |
| `/configuracion` | Administrador | Configuración del restaurante y del sistema. |
| `/login` | Personal | Inicio de sesión y acceso a cuentas demo si están habilitadas. |

Las rutas `/kds` y `/pedidos` requieren una sesión de personal. Las rutas `/dashboard`, `/personal` y `/configuracion` requieren el rol de administrador. Los grupos de rutas de Next.js, como `(admin)` y `(comensal)`, organizan los archivos, pero no forman parte de la URL.

## Estructura de Carpetas

```text
Carta_Digital_NFC/
├── public/                 # Imágenes, iconos y modelos 3D
├── scripts/                # Scripts de aprovisionamiento y mantenimiento
├── src/
│   ├── app/                # Rutas y páginas de Next.js
│   │   ├── (admin)/        # KDS, pedidos y páginas administrativas
│   │   ├── (auth)/         # Inicio de sesión
│   │   ├── (comensal)/     # Carta digital
│   │   └── api/            # Rutas API
│   ├── components/         # Componentes de interfaz
│   ├── context/            # Estado compartido mediante React Context
│   ├── features/           # Funcionalidad organizada por dominio
│   ├── hooks/              # Hooks de React
│   ├── lib/                # Clientes y utilidades de servicios
│   ├── services/           # Acceso a datos y lógica de servicios
│   ├── types/              # Tipos de la aplicación
│   └── utils/              # Funciones auxiliares
├── supabase/
│   ├── migrations/         # Migraciones de base de datos
│   ├── config.toml         # Configuración local de Supabase
│   └── seed.sql            # Datos de demostración
├── tests/                  # Pruebas unitarias y de integración
├── e2e/                    # Pruebas end-to-end con Playwright
└── package.json            # Dependencias y comandos del proyecto
```

## Requisitos y Configuración

- **Node.js 22**
- **npm**
- **Supabase CLI** para ejecutar Supabase localmente y aplicar migraciones y datos de prueba

Configura estas variables de entorno en `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_DEMO_LOGIN_ENABLED=false
NEXT_PUBLIC_SENTRY_DSN=
```

`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` son necesarias para conectar la aplicación con Supabase.

`SUPABASE_SERVICE_ROLE_KEY` solo se requiere para tareas administrativas del servidor, como aprovisionar cuentas. No la expongas en el navegador ni la publiques.

`NEXT_PUBLIC_DEMO_LOGIN_ENABLED` habilita o deshabilita los accesos demo. Mantén esta opción deshabilitada en producción. `NEXT_PUBLIC_SENTRY_DSN` es opcional.

## Instalación

```bash
git clone https://github.com/darvin6969/Carta_Digital_NFC.git
cd Carta_Digital_NFC
npm install
npm run dev
```

## Roles y Credenciales de Prueba

Los siguientes usuarios y PIN se cargan mediante `supabase/seed.sql`. Los PIN son para desbloquear la terminal; no son contraseñas de inicio de sesión de Supabase Auth.

| Usuario | Rol | PIN de terminal |
| --- | --- | --- |
| `admin` | Administrador | `8080` |
| `chef_kenji` | Cocina | `1042` |
| `garzon_sofia` | Mozo | `2045` |
| `garzon_diego` | Mozo | `2046` |
| `runner_mateo` | Runner | `3012` |
| `bar_lucas` | Barra | `4099` |


## Despliegue

El proyecto está configurado para desplegarse en Netlify con el complemento de Next.js. Netlify ejecuta `npm run build` y utiliza Node.js 22.

Configura las variables de entorno de Supabase en el entorno de despliegue. En producción, mantén `NEXT_PUBLIC_DEMO_LOGIN_ENABLED=false` y no publiques credenciales de prueba ni claves de servicio.

## Licencia

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Este proyecto está bajo la **Apache License 2.0**. Consulta el archivo completo [`LICENSE`](./LICENSE).
