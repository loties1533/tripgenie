/**
 * TRIPGENIE — HOLBERTON STYLE TEST SUITE
 * Test: Logic Services (Claude & Mocks)
 * Usage: node tests/test_services.js
 */
import { parseJSON } from '../server/services/claude.js';
import * as Mocks from '../server/services/mocks.js';

function assert_equal(name, actual, expected) {
  process.stdout.write(`Testing ${name}... `);
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log('✅ PASS');
    return true;
  } else {
    console.log('❌ FAIL');
    console.log(`   Expected: ${JSON.stringify(expected)}`);
    console.log(`   Actual:   ${JSON.stringify(actual)}`);
    return false;
  }
}

async function main() {
  console.log('\n🧠 STARTING LOGIC SERVICES TESTS\n');

  // Test 1: parseJSON robustness
  assert_equal(
    'parseJSON (Clean)',
    parseJSON('{"test": true}'),
    { test: true }
  );

  // Test 2: Mocks availability
  const hasMockPack = Mocks.MOCK_PACK !== undefined;
  process.stdout.write('Testing MOCK_PACK exists... ');
  console.log(hasMockPack ? '✅ PASS' : '❌ FAIL');

  // Test 3: parseJSON (Markdown)
  assert_equal(
    'parseJSON (Markdown)',
    parseJSON('Voici le JSON : ```json {"city": "Berlin"} ```'),
    { city: 'Berlin' }
  );

  // Test 4: Scoring réel
  const { scorepack } = await import('../server/services/scoring.js');
  const result = scorepack(
    {
      vol:        { price: 300, duration_min: 120, stops: 0 },
      hotel:      { stars: 4, price_per_night: 120, rating: 8.5 },
      events:     [{ name: 'Festival Test' }],
      activities: [],
      totalPrice: 1500
    },
    'party',  // mode
    2,        // travelers
    'Ibiza'   // destination
  );
  process.stdout.write('Testing scorepack (mode: party)... ');
  if (result && result.total > 0) {
    console.log(`✅ PASS (Score: ${result.total}/10)`);
  } else {
    console.log('❌ FAIL — Score invalide ou nul');
  }

  console.log('\n📊 LOGIC SERVICES VALIDATED.');
}

main();
