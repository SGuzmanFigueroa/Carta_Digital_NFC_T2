import type { Metadata } from "next";
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
                  }
                  if (p.colorAccent) document.documentElement.setAttribute('data-accent', p.colorAccent);
                  if (p.density) document.documentElement.setAttribute('data-density', p.density);
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
