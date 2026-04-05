// =============================================
// TRIPGENIE — server/db/supabase.js
// Client Supabase partagé dans tout le serveur
// =============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis dans .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
