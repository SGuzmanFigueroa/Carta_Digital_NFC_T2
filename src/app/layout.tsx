import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Mono } from "next/font/google";
import "./globals.css";
import { RestaurantProvider } from "@/context/RestaurantContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  variable: "--font-space-mono",
  subsets: ["latin"],
});


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover", // Vital para soporte de Notch, Dynamic Island y barra inferior en iPhone
  interactiveWidget: "resizes-content", // Previene que el teclado virtual tape modales en iOS y Android
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0e" },
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" }
  ]
};

export const metadata: Metadata = {
  title: "GastroPulse OS - Plataforma Gastronómica Integral",
  description: "Plataforma integral de Carta Digital NFC, Cocina KDS y Control de Sala en tiempo real",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceMono.variable} dark antialiased`}
    >
      <head>
        <link rel="preload" href="/fonts/material-symbols-outlined.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                var raw = localStorage.getItem('gastropulse_system_config');
                if (raw) {
                  var p = JSON.parse(raw);
                  var t = p.themeMode || 'obsidian';
                  document.documentElement.setAttribute('data-theme', t);
                  if (t === 'light') {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                  } else {
                    document.documentElement.classList.remove('light');
                    document.documentElement.classList.add('dark');
                  }
                  if (p.colorAccent) {
                    document.documentElement.setAttribute('data-accent', p.colorAccent);
                    var palette = {
                      amber: '#ff5708',
                      emerald: '#10b981',
                      cyan: '#00b4d8',
                      ruby: '#e11d48',
                      champagne: '#eab308',
                      indigo: '#6366f1',
                      terracotta: '#ea580c',
                      lavender: '#a855f7',
                      titanium: '#94a3b8'
                    };
                    var hex = palette[p.colorAccent] || '#ff5708';
                    var inks = {
                      amber: '#2b0b00',
                      emerald: '#052e16',
                      cyan: '#083344',
                      ruby: '#ffffff',
                      champagne: '#422006',
                      indigo: '#ffffff',
                      terracotta: '#2b0b00',
                      lavender: '#2e1065',
                      titanium: '#0f172a'
                    };
                    document.documentElement.style.setProperty('--primary-accent', hex);
                    document.documentElement.style.setProperty('--primary-accent-ink', inks[p.colorAccent] || '#2b0b00');
                    document.documentElement.style.setProperty('--color-primary', hex);
                    document.documentElement.style.setProperty('--color-kinetic-amber', hex);
                  }
                  if (p.density) document.documentElement.setAttribute('data-density', p.density);
                }
              } catch(e) {}
            })()`,
          }}
        />
      
        {/* CD-13 · Bootstrap anti-FOUC del tema Claro/Oscuro del comensal.
            Se ejecuta antes del primer paint y SOLO en la vista pública del
            cliente (/menu y /). El resto del sistema conserva el tema del
            panel de administración, por lo que no se altera su diseño. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                var path = window.location.pathname;
                var isDinerView = path === '/' || path === '/menu' || path.indexOf('/menu/') === 0;
                if (!isDinerView) return;

                var KEY = 'gastropulse_menu_theme';
                var stored = null;
                try { stored = localStorage.getItem(KEY); } catch(e) {}
                var theme = (stored === 'light' || stored === 'dark') ? stored : null;
                if (!theme) {
                  theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches)
                    ? 'light'
                    : 'dark';
                }

                var root = document.documentElement;
                root.setAttribute('data-menu-theme', theme);
                if (theme === 'light') {
                  root.classList.remove('dark');
                  root.classList.add('light');
                } else {
                  root.classList.remove('light');
                  root.classList.add('dark');
                }
              } catch(e) {}
            })()`,
          }}
        />

        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('ServiceWorker registered:', reg.scope);
                  }).catch(function(err) {
                    console.warn('ServiceWorker registration failed:', err);
                  });
                });
              }
            })()`,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[#0b0c0e] text-[#e5e1e4] selection:bg-[#ff5708] selection:text-white">
        <RestaurantProvider>
          {children}
        </RestaurantProvider>
      </body>
    </html>
  );
}
