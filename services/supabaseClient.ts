import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pmvffcryolghjsyfudfn.supabase.co';
const supabaseKey = 'sb_publishable_H3Wb2pPYw7DweD9z0egPXg_1PEh2WDi';

export const supabase = createClient(supabaseUrl, supabaseKey);