// =============================================
// TRIPGENIE — server/db/supabase.js
// =============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Supabase optionnel — le serveur fonctionne sans DB
// (les voyages ne seront pas sauvegardés)
let supabase = null;

if (supabaseUrl && supabaseKey && supabaseKey.startsWith('eyJ')) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase connecté');
} else {
  console.warn('⚠️  Supabase non configuré — sauvegarde désactivée');
}

export default supabase;