import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database.types';

// Keep direct references so Next.js can inline the public build-time variables.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl?.trim() || !supabaseAnonKey?.trim()) {
  const missing = [
    !supabaseUrl?.trim() && 'NEXT_PUBLIC_SUPABASE_URL',
    !supabaseAnonKey?.trim() && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ].filter(Boolean);
  throw new Error(
    `[Supabase] Configuración incompleta: faltan ${missing.join(', ')}. ` +
    'Configura estas variables en .env.local o en el entorno de despliegue y reinicia la aplicación. ' +
    'En producción, vuelve a compilar después de configurarlas.'
  );
}

// createBrowserClient guarda la sesión del personal en cookies (no en localStorage)
// para que el proxy pueda verificar el JWT firmado antes de servir rutas internas.
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 20
    }
  }
});
