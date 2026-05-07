// =============================================
// TRIPGENIE — scripts/setup-db.js
// Lance avec: node scripts/setup-db.js
// Vérifie la config et affiche les instructions
// =============================================

import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('\n🌍 TripGenie — Setup & Vérification\n');
console.log('='.repeat(50));

// ---- Vérifier les variables d'environnement ----
const required = [
  'JWT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'ANTHROPIC_API_KEY'
];

const optional = [
  'PREDICTHQ_API_KEY',
  'TAVILY_API_KEY',
  'RAPIDAPI_KEY',
  'GOOGLE_PLACES_KEY'
];

console.log('\n📋 Variables d\'environnement requises :');
let allGood = true;
required.forEach(key => {
  const val = process.env[key];
  if (!val || val.includes('change_me') || val.includes('your_')) {
    console.log(`  ❌ ${key} — MANQUANT`);
    allGood = false;
  } else {
    console.log(`  ✅ ${key} — OK`);
  }
});

console.log('\n📋 Variables optionnelles (APIs de voyage) :');
optional.forEach(key => {
  const val = process.env[key];
  if (!val || val.includes('your_')) {
    console.log(`  ⚠️  ${key} — non configuré (mode fallback AI)`);
  } else {
    console.log(`  ✅ ${key} — OK`);
  }
});

// ---- Afficher le SQL à exécuter ----
console.log('\n' + '='.repeat(50));
console.log('\n📊 Pour initialiser la base de données Supabase :');
console.log('\n  1. Va sur https://supabase.com/dashboard');
console.log('  2. Ouvre ton projet → SQL Editor');
console.log('  3. Colle et exécute ce SQL :\n');

try {
  const schema = readFileSync(join(__dirname, '../server/db/schema.sql'), 'utf8');
  console.log('--- DÉBUT DU SQL ---');
  console.log(schema.substring(0, 300) + '\n  [...voir server/db/schema.sql pour le complet...]');
  console.log('--- FIN DU SQL ---\n');
} catch (e) {
  console.log('  (fichier schema.sql non trouvé)');
}

// ---- Instructions finales ----
console.log('='.repeat(50));
if (allGood) {
  console.log('\n✅ Config OK ! Lance le serveur avec :\n');
  console.log('   npm run dev\n');
} else {
  console.log('\n❌ Configure le fichier .env avant de lancer.\n');
  console.log('   cp .env.example .env\n');
  console.log('   Puis remplis les valeurs manquantes.\n');
}
console.log('='.repeat(50) + '\n');
