import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mfznxaembyaqxskltnye.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_HUnzC5IyK0POGKq_bllJ9g_f4aiAJSq';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;
