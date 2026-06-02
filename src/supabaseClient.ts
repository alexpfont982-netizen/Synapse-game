import { createClient } from '@supabase/supabase-js';

// Leer variables de entorno de Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ Error: Missing Supabase environment variables in .env.local");
}

// Usar operadores lógicos de aserción para garantizar que TypeScript reciba un string válido en compilación
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);