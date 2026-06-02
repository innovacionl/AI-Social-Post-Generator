import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.SUPABASE_ANON_KEY ?? '';

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export { supabaseUrl, supabaseAnonKey };

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as ReturnType<typeof createClient>);
