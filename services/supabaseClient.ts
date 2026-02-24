import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://pmvffcryolghjsyfudfn.supabase.co';
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_H3Wb2pPYw7DweD9z0egPXg_1PEh2WDi';

export const supabase = createClient(supabaseUrl, supabaseKey);