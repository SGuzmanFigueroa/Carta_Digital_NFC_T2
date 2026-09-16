# GastroPulse OS (Carta Digital 3D + NFC)

Repositorio Frontend/Web para la plataforma SaaS integral de gestión de restaurantes. Combina menús interactivos en Realidad Aumentada (3D), pedidos NFC/QR en tiempo real, tableros KDS para cocina, y un completo gestor administrativo.

## Tecnologías del MVP

- **Next.js 14+ (App Router)** – Framework principal React para Server Components y rutas.
- **TypeScript** – Tipado estático estricto.
- **TailwindCSS** – Estilos y diseño responsivo para móviles, tablets y desktop.
- **Supabase** – Backend as a Service (PostgreSQL + Auth + Storage + Realtime WebSockets).
- **<model-viewer> / Three.js** – Renderizado nativo de modelos 3D y WebXR/AR QuickLook.
- **Zustand** – Manejo de estado local (carrito temporal por mesa, sesiones de empleados).
- **Framer Motion** – Animaciones de UI y transiciones fluidas.

## Arquitectura de Módulos (Las 7 Pantallas Core)

El sistema está dividido en múltiples módulos interconectados, diseñados para diferentes roles y dispositivos:

### 1. Experiencia del Comensal (Mobile-First)
- **Menú 3D Mobile:** Catálogo interactivo lanzado vía QR o NFC. Incluye filtros dietéticos (Gluten Free, etc.) y categorías visuales.
- **Detalle 3D y Carrito:** Visor de Realidad Aumentada a escala real (.glb). Selección de modificadores (término de la carne, guarniciones) y envío directo a cocina.

### 2. Gestión Operativa y Personal (Desktop / Tablet)
- **Central de Pedidos en Vivo (Dispatcher):** Monitor drag-and-drop por estaciones. Acciones rápidas (Priorizar, Aceptar, Despachar) y reimpresión térmica.
- **Cocina KDS Refinado:** Tableros de alto contraste para chefs. Alertas rojas de alérgenos, gráficas de velocidad de pase y tracking de *Runners*.
- **Panel Admin & Métricas:** Dashboard gerencial con KPIs en vivo (Ticket Promedio, Ocupación), mapa interactivo de sala y carga térmica de estaciones.
- **Gestión de Personal & Roles:** Matriz RBAC (Role-Based Access Control) con 5 niveles (Admin, Chef, Camarero, Bartender, Runner) y control granular de accesos.
- **Configuración del Sistema:** Identidad del restaurante, alertas sonoras, temas visuales (Modo Oscuro Obsidian, Alto Contraste KDS) y configuración IP/Socket para Hardware ESC/POS.

## Estructura de Carpetas

```text
Carta_Digital_NFC/
├── public/                 # Archivos estáticos
│   ├── models/             # Modelos 3D (.glb/.usdz optimizados con Draco)
│   ├── images/
│   └── icons/
├── src/
│   ├── app/                # Rutas (Next.js App Router)
│   │   ├── (comensal)/     # Rutas públicas (QR/NFC) -> /menu/[mesa]
│   │   ├── (personal)/     # Rutas protegidas -> /kds, /recepcion
│   │   ├── (admin)/        # Rutas gerenciales -> /dashboard, /staff, /settings
│   │   └── layout.tsx      # Layout global y Providers
│   ├── components/         
│   │   ├── 3d/             # Componentes del visor AR (<model-viewer>)
│   │   ├── ui/             # Botones, Modales, Tableros KDS
│   │   └── layout/         # Navegación y cabeceras dinámicas
│   ├── features/           # Lógica separada por dominio de negocio
│   │   ├── orders/         # Lógica del carrito, IGV y despacho
│   │   ├── catalog/        # Gestión de platillos y 3D
│   │   ├── kds/            # WebSockets y alertas de cocina
│   │   └── staff/          # Matriz de permisos RBAC
│   ├── services/           # Clientes API
│   │   └── supabase.ts     # Configuración de Supabase Realtime
│   ├── store/              # Estado global (Zustand)
│   ├── types/              # Definiciones TypeScript de BD
│   ├── hooks/              # Custom hooks (ej. useRealtimeOrders)
│   └── utils/              # Helpers (formateo moneda, cálculo tiempos)
├── .agents/                # Contexto y Skills para agentes IA (Obsidian)
├── .env.local              # Variables de entorno
├── next.config.mjs         # Configuración de Next
├── tailwind.config.ts      # Tokens de diseño (Colores Kinetic/Esmeralda)
└── package.json            # Dependencias
```

## Licencia

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Este proyecto está bajo la **Apache License 2.0**. Ver el archivo completo [`LICENSE`](./LICENSE).

## Instalación

```bash
git clone https://github.com/darvin6969/Carta_Digital_NFC.git
cd Carta_Digital_NFC
npm install
npm run dev
```

---
*.*
