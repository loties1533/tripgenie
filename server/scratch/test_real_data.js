import axios from 'axios';
import 'dotenv/config';

const TEST_PAYLOAD = {
  destination: "New York",
  origin: "Paris",
  departure: "2025-06-15",
  return_date: "2025-06-22",
  travelers: 2,
  budget: 8000,
  mode: "luxury"
};

async function runTest() {
  console.log("🚀 Lancement du test 'Données Réelles' pour NEW YORK...");
  try {
    const res = await axios.post('http://localhost:3000/api/ai/generate', TEST_PAYLOAD);
    const pack = res.data.pack;

    console.log("\n--- RESULTATS DU TEST ---");
    console.log(`📍 Destination : ${pack.destination} (${pack.country})`);
    console.log(`✨ Tagline : ${pack.tagline}`);
    console.log(`🌤 Météo : ${pack.weather.avg_temp}, ${pack.weather.conditions} (Vent: ${pack.weather.wind})`);
    console.log(`🖼 Photo : ${pack.photo_url.substring(0, 60)}...`);
    
    console.log("\n🏨 HOTELS (Réels ?) :");
    pack.hotels.forEach(h => console.log(`  - ${h.name} (${h.stars}★) : ${h.price_per_night} - ${h.highlights}`));

    console.log("\n✈️ VOLS :");
    console.log(`  - ${pack.flights[0]?.airline} : ${pack.flights[0]?.price_per_person} /pers`);

    console.log("\n🎭 EVENEMENTS (Via Tavily) :");
    pack.events_data.slice(0, 2).forEach(e => console.log(`  - ${e.title} à ${e.venue}`));

    console.log("\n✅ TEST TERMINE AVEC SUCCES");
  } catch (err) {
    console.error("❌ ERREUR TEST :", err.response?.data || err.message);
  }
}

runTest();
