/**
 * MOCKS DE SURVIE - TRIPGENIE
 * Ce fichier contient des données de simulation de haute qualité à utiliser
 * uniquement lorsque les quotas d'IA (Gemini/OpenRouter) sont épuisés.
 */

export const MOCK_ONBOARDING = {
  response: "Je suis désolé, mes experts locaux sont tous occupés à préparer des départs ! ✨ En attendant leur retour, je peux vous proposer un itinéraire 'Signature TripGenie' basé sur les préférences classiques. Cela vous tente ?",
  chips: ["Oui, montre-moi !", "Je préfère attendre"],
  extractedData: {
    profile: "Voyageur",
    budget: 2000,
    duration: 7,
    mode: "relax",
    discoveryMode: "classic"
  },
  isReady: false,
  isMock: true
};

export const MOCK_DESTINATIONS = {
  destinations: [
    { 
      city: "Ibiza", 
      country: "Espagne", 
      reason: "La capitale mondiale de la fête avec des coins secrets magnifiques.", 
      match_score: 98 
    },
    { 
      city: "Hvar", 
      country: "Croatie", 
      reason: "Une île chic, ensoleillée et parfaite pour les groupes d'amis.", 
      match_score: 92 
    },
    { 
      city: "Saint-Tropez", 
      country: "France", 
      reason: "Le luxe à la française par excellence, idéal pour votre budget.", 
      match_score: 89 
    }
  ],
  isMock: true
};

// Un itinéraire ultra-complet pour Ibiza (Destination par défaut pour la démo)
export const MOCK_PACK = {
  destination: "Ibiza",
  country: "Espagne",
  tagline: "L'île Blanche : Entre Rythme Effréné et Calme Azur",
  overview: "Ibiza n'est pas qu'une île de fête. C'est un joyau des Baléares où les eaux cristallines rencontrent une architecture bohème-chic. Pour votre groupe, c'est le mix parfait entre luxe décontracté et soirées inoubliables.",
  weather: { avg_temp: "26°C", conditions: "Soleil radieux", tip: "N'oubliez pas vos lunettes de soleil et une tenue élégante pour le soir." },
  summary: { total_budget: "8000€", nights: 7, activities_count: 12 },
  activities: [
    { name: "Plage de Pampelonne", desc: "Le spot mythique pour bronzer et voir du monde." },
    { name: "Place des Lices", desc: "Partie de pétanque et marché provençal." },
    { name: "Citadelle de Saint-Tropez", desc: "Vue imprenable sur tout le golfe." }
  ],
  flights: [
    { from: "BOD", from_city: "Bordeaux", to: "NCE", to_city: "Nice", departure_time: "10:15", arrival_time: "12:00", duration: "1h45", stops: "Direct", airline: "Air France", price_per_person: "145€", type: "outbound" },
    { from: "NCE", from_city: "Nice", to: "BOD", to_city: "Bordeaux", departure_time: "18:30", arrival_time: "20:15", duration: "1h45", stops: "Direct", airline: "Air France", price_per_person: "145€", type: "return" }
  ],
  hotels: [
    { name: "Hôtel Byblos", location: "Centre", stars: 5, price_per_night: "850€", highlights: "La légende de Saint-Tropez, piscine mythique et club Caves du Roy.", emoji: "🏨", match_reason: "Le summum du luxe festif" },
    { name: "Hôtel de Paris", location: "Port", stars: 5, price_per_night: "550€", highlights: "Rooftop avec piscine transparente et vue sur le port.", emoji: "🏩", match_reason: "Design moderne et vue mer" }
  ],
  itinerary: [
    { 
      day: 1, title: "Arrivée & Sunset Chill", subtitle: "Bienvenue sur l'île",
      items: [
        { time: "14:00", type: "activity", title: "Installation au Nobu", description: "Cocktail de bienvenue face à la baie.", price: "Inclus", duration: "1h" },
        { time: "19:00", type: "food", title: "Dîner au Blue Marlin", description: "Le beach club mythique pour démarrer en douceur.", price: "80€", duration: "3h" }
      ]
    },
    { 
      day: 2, title: "Exploration des Calas", subtitle: "Eaux turquoise",
      items: [
        { time: "10:00", type: "activity", title: "Cala Salada", description: "Baignade dans l'une des plus belles criques de l'île.", price: "Gratuit", duration: "4h" },
        { time: "20:00", type: "activity", title: "Datcha Night", description: "Première immersion dans la vie nocturne locale.", price: "50€", duration: "Toute la nuit" }
      ]
    }
  ],
  isMock: true
};
