/**
 * TRIPGENIE — CLI DIAGNOSTIC TOOL
 * Usage: node server/tests/api_diagnostic.js "Ibiza"
 */
import { suggestDestinations, assemblePack } from '../services/claude.js';
import 'dotenv/config';

async function runDiagnostic(dest = "Saint-Tropez") {
  console.log(`\n🔍 [DIAGNOSTIC] Test IA pour : ${dest}...`);
  console.log('-------------------------------------------');
  
  try {
    console.log('📡 1. Test des Suggestions...');
    const suggestions = await suggestDestinations({ 
      mode: 'party', 
      profile: 'groupe d\'amis', 
      budget: 2000,
      travelers: 4
    });
    console.log('✅ Suggestions reçues :', suggestions.destinations?.length || 0);
    
    console.log('\n📡 2. Test de génération du Pack complet...');
    const pack = await assemblePack({
      destination: dest,
      mode: 'party',
      profile: 'groupe d\'amis',
      travelers: 4,
      budget: 2000,
      departure: '2026-07-01',
      return_date: '2026-07-08'
    });
    
    console.log('✅ Pack généré avec succès !');
    console.log(`✨ Tagline : ${pack.tagline}`);
    console.log(`🏨 Hôtels : ${pack.hotels?.length || 0}`);
    console.log(`🎯 Activités : ${pack.activities?.length || 0}`);
    
    if (pack.isMock) {
      console.log('\n⚠️  NOTE : Le résultat est un MOCK (Mode Survie actif).');
    } else {
      console.log('\n💎  NOTE : Le résultat provient d\'une RÉELLE IA.');
    }

  } catch (err) {
    console.error('\n❌ ERREUR FATALE DURANT LE DIAGNOSTIC :');
    console.error(err.message);
  }
  console.log('-------------------------------------------\n');
}

// Lancement automatique si exécuté directement
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('api_diagnostic')) {
  const target = process.argv[2] || "Saint-Tropez";
  runDiagnostic(target);
}
