# Carta Digital 3D + NFC (SaaS)

Repositorio Frontend/Web para la plataforma SaaS de gestión de restaurantes con menús interactivos en Realidad Aumentada (3D), pedidos en tiempo real y KDS para cocina.

## Tecnologías

- **Next.js 14+ (App Router)** – Framework principal React.
- **TypeScript** – Tipado estático.
- **TailwindCSS** – Estilos y diseño Mobile-First.
- **Supabase** – Backend (PostgreSQL + Auth + Storage + Realtime WebSockets).
- **<model-viewer>** – Visor nativo de modelos 3D y Realidad Aumentada (WebXR/AR QuickLook).
- **Zustand** – Manejo de estado local (carrito temporal por mesa).
- **Framer Motion** – Animaciones de UI (opcional).

## Licencia

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Este proyecto está bajo la **Apache License 2.0**. Ver el archivo completo `LICENSE`.

## Estructura del proyecto

```text
Carta_Digital_NFC/
├── public/                 # Archivos estáticos y modelos
│   ├── models/             # Modelos 3D (.glb y .usdz comprimidos con Draco)
│   ├── images/
│   └── icons/
├── src/
│   ├── app/                # Rutas de Next.js (App Router)
│   │   ├── (comensal)/     # Flujo del cliente
│   │   │   └── menu/       # Carta Digital 3D, Carrito, Pagos
│   │   ├── (personal)/     # Flujo de los trabajadores
│   │   │   └── kds/        # Monitor de cocina en tiempo real
│   │   ├── (admin)/        # Flujo del dueño
│   │   │   └── dashboard/  # Métricas, mesas, edición de catálogo
│   │   └── layout.tsx      # Layout global
│   ├── components/         # Componentes reutilizables
│   │   ├── 3d/             # Componentes del visor AR (<model-viewer>)
│   │   ├── ui/             # Componentes base (Botones, Modales)
│   │   └── layout/         # Navegación y cabeceras
│   ├── features/           # Lógica separada por dominio
│   │   ├── orders/         # Lógica del carrito y envíos
│   │   ├── catalog/        # Lógica de carga de platos
│   │   └── kds/            # Lógica de recepción en cocina
│   ├── services/           # Cliente Supabase
│   │   └── supabase.ts
│   ├── store/              # Estado global (Zustand)
│   ├── types/              # Definiciones TypeScript (DB types)
│   ├── hooks/              # Custom hooks (ej. useRealtimeOrders)
│   └── utils/              # Helpers y formateadores
├── .env.local              # Variables de entorno
├── next.config.mjs         # Configuración de Next
├── tailwind.config.ts      # Configuración de Tailwind
└── package.json            # Dependencias
```

## MVP: Funcionalidades Principales

1. **Carta Interactiva (Comensal):** Escaneo de QR/NFC, visor 3D en la mesa, filtros y carrito de compras sin login.
2. **Monitor de Cocina (KDS):** Tablero de recepción de comandas en tiempo real vía WebSockets.
3. **Gestor de Administrador:** Dashboard para revisar ventas y subir modelos 3D/imágenes al catálogo.

## Instalación

```bash
git clone https://github.com/darvin6969/Carta_Digital_NFC.git
cd Carta_Digital_NFC
npm install
npm run dev
```

---
*Diseñado para una experiencia de usuario rápida y moderna.*
