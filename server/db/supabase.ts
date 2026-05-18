// =============================================
// TRIPGENIE — server/db/supabase.ts
// =============================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Supabase est utilisé uniquement comme hébergeur PostgreSQL et client SQL.
// Ni Supabase Auth, ni le Row Level Security (RLS) ne sont activés :
// le RLS ne fonctionne qu'avec Supabase Auth, incompatible avec notre JWT custom.
// La sécurité des données est donc gérée au niveau applicatif via .eq('user_id', req.user.id)
// sur chaque requête — chaque utilisateur ne voit que ses propres voyages.
let supabase: SupabaseClient | null = null;

// Initialisation optionnelle : le serveur démarre même sans Supabase configuré.
// Dans ce cas, les voyages ne sont pas sauvegardés mais la génération fonctionne.
if (supabaseUrl && supabaseKey && supabaseKey.startsWith('eyJ')) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase connecté');
} else {
  console.warn('⚠️  Supabase non configuré — sauvegarde désactivée');
}

export default supabase;
