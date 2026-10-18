import type { NextConfig } from "next";
import { buildContentSecurityPolicy } from "./src/lib/contentSecurityPolicy";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN", // Permite emuladores móviles, iframes de pruebas y extensiones
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    // geolocation=(self): la geocerca antifraude pide la ubicación del comensal.
    // Antes estaba en geolocation=() y el navegador la negaba sin preguntar.
    value: "camera=(self), microphone=(), geolocation=(self)",
  },
  {
    key: "Content-Security-Policy",
    value: buildContentSecurityPolicy({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zvtwnlfaizyhwtwypimv.supabase.co",
      sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      isDev: process.env.NODE_ENV === "development",
    }),
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
];

const nextConfig: NextConfig = {
  // Versión del deploy fijada AL COMPILAR. Netlify solo da COMMIT_REF durante el
  // build: la carta (ISR) se regenera después en una función donde ya no existe,
  // y el service worker quedaba siempre en "dev" (los celulares no se enteraban
  // de los deploys nuevos). Sin commit (build local) cada build tiene su propia versión.
  env: {
    APP_BUILD_VERSION: (process.env.COMMIT_REF || process.env.GITHUB_SHA || `local-${Date.now().toString(36)}`).slice(0, 12),
  },
  /**
   * Orígenes extra autorizados a consumir recursos de desarrollo (`/_next/*`,
   * HMR, Server Actions) cuando se abre la app desde otro dispositivo de la LAN.
   * Sin esto, Next responde:
   *   "Blocked cross-origin request to Next.js dev resource from 192.168.1.39"
   * Solo aplica en `next dev`; en producción/`next start` se ignora.
   */
  allowedDevOrigins: ["192.168.1.39"],
  // Fotos de platos optimizadas con next/image (src/components/menu/DishImage.tsx).
  // Solo estos orígenes: otros se muestran sin optimizar.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

