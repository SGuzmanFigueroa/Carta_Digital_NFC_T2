import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zvtwnlfaizyhwtwypimv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2dHdubGZhaXp5aHd0d3lwaW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NjY3NTQsImV4cCI6MjEwNTE0Mjc1NH0.hf8soMAlAqh_d_dm2dRm7bSxR0yzhhRzThDSA33pqL0';

// createBrowserClient guarda la sesión del personal en cookies (no en localStorage)
// para que el proxy pueda verificar el JWT firmado antes de servir rutas internas.
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 20
    }
  }
});
