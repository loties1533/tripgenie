/**
 * TRIPGENIE — HOLBERTON STYLE TEST SUITE
 * Test: API Endpoints V1
 * Usage: node tests/test_api_v1.js
 */
import fetch from 'node-fetch';
import 'dotenv/config';

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

async function test_endpoint(name, path, method = 'GET', body = null) {
  process.stdout.write(`Testing [${method}] ${path} (${name})... `);
  
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_URL}${path}`, options);
    const data = await res.json();

    if (res.ok) {
      console.log('✅ OK');
      return true;
    } else {
      console.log(`❌ FAILED (Status: ${res.status})`);
      console.log(`   Error: ${data.error || JSON.stringify(data)}`);
      return false;
    }
  } catch (err) {
    console.log(`💥 CRASHED`);
    console.log(`   Reason: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('\n🚀 STARTING TRIPGENIE API V1 TESTS\n');
  
  let passed = 0;
  let total = 0;

  // 1. Health Check
  total++;
  if (await test_endpoint('Health Check', '/health')) passed++;

  // 2. AI Onboarding
  total++;
  if (await test_endpoint('AI Onboarding', '/ai/onboarding', 'POST', { 
    userMessage: 'Je veux aller à Ibiza',
    currentData: {} 
  })) passed++;

  // 3. Votes (Nécessite un vrai TRIP_ID car type UUID + ForeignKey)
  console.log('\n🔍 Recherche d\'un TRIP_ID valide dans la base...');
  try {
    const res = await fetch(`${API_URL}/trips/public/latest`); // On va tester si un endpoint de récup existe
    // Note: Si tu n'as pas cet endpoint, on va juste tenter un UUID générique ou un trip existant
    // Pour le test, on va tenter d'en créer un ou d'en utiliser un existant.
    
    total++;
    // Tentative de vote avec un UUID aléatoire (mais format valide)
    // Si la DB a une contrainte REFERENCES trips(id), ça échouera si le trip n'existe pas.
    const fakeUuid = '550e8400-e29b-41d4-a716-446655440000'; 
    if (await test_endpoint('Create Vote (Format UUID)', '/votes', 'POST', {
      trip_id: fakeUuid,
      item_id: 'Test Item',
      vote_type: true
    })) {
      passed++;
    } else {
      console.log('   💡 Info : Ce test échoue normalement si l\'UUID n\'existe pas en base (Contrainte FK).');
    }

  } catch (err) {
    console.log('   ⚠️ Erreur lors de la recherche du trip ID.');
  }

  console.log(`\n📊 RESULTS: ${passed}/${total} tests passed.`);
  if (passed === total) {
    console.log('✨ EVERYTHING IS BLINDÉ !');
  } else {
    console.log('⚠️  SOME TESTS FAILED. CHECK THE LOGS ABOVE.');
  }
}

main();
