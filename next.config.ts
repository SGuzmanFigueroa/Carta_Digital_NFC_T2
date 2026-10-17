import type { NextConfig } from "next";

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
    value: "camera=(self), microphone=(), geolocation=()",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
];

const nextConfig: NextConfig = {
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

