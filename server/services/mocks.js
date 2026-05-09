/**
 * MOCKS DE SURVIE - TRIPGENIE
 * Ce fichier contient des données de simulation de haute qualité à utiliser
 * uniquement lorsque les quotas d'IA (Gemini/OpenRouter) sont épuisés.
 */

export const MOCK_ONBOARDING = {
  response: "Je suis désolé, mes experts locaux sont tous occupés à préparer des départs ! ✨ En attendant leur retour, je peux vous proposer un itinéraire 'Signature TripGenie' basé sur les préférences classiques. Cela vous tente ?",
  chips: ['Oui, montre-moi !', 'Je préfère attendre'],
  extractedData: {
    profile: 'Voyageur',
    budget: 2000,
    duration: 7,
    mode: 'relax',
    discoveryMode: 'classic'
  },
  isReady: false,
  isMock: true
};

export const MOCK_DESTINATIONS = {
  destinations: [
    {
      city: 'Ibiza',
      country: 'Espagne',
      reason: 'La capitale mondiale de la fête avec des coins secrets magnifiques.',
      match_score: 98
    },
    {
      city: 'Hvar',
      country: 'Croatie',
      reason: "Une île chic, ensoleillée et parfaite pour les groupes d'amis.",
      match_score: 92
    },
    {
      city: 'Saint-Tropez',
      country: 'France',
      reason: 'Le luxe à la française par excellence, idéal pour votre budget.',
      match_score: 89
    }
  ],
  isMock: true
};

// Un itinéraire ultra-complet pour Ibiza (Destination par défaut pour la démo)
export const MOCK_PACK = {
  destination: 'Ibiza',
  country: 'Espagne',
  tagline: "L'île Blanche : L'Exclusivité entre Terre et Mer",
  overview: "Ibiza Redéfinie. Oubliez la foule, nous vous emmenons là où le luxe rencontre l'âme bohème de l'île. Villas privées, accès VIP et expériences secrètes : votre voyage signature commence ici.",
  weather: { avg_temp: '26°C', conditions: 'Soleil radieux', tip: 'Prévoyez vos tenues les plus élégantes pour les beach clubs exclusifs.' },
  summary: { total_budget: '12000€', nights: 7, activities_count: 12 },
  activities: [
    { name: 'Charter de Yacht Privé', desc: 'Journée exclusive vers Formentera sur un yacht de 25m avec skipper et chef privé.' },
    { name: 'Dîner Spectacle au Lío', desc: "La table la plus convoitée de l'île, entre cabaret haut de gamme et gastronomie." },
    { name: 'Coucher de soleil à Es Vedrà', desc: 'Accès privé à une plateforme panoramique secrète loin des touristes.' }
  ],
  flights: [
    { from: 'PAR', from_city: 'Paris', to: 'IBZ', to_city: 'Ibiza', departure_time: '10:15', arrival_time: '12:30', duration: '2h15', stops: 'Direct', airline: 'Air France (Business Class)', price_per_person: '450€', type: 'outbound' },
    { from: 'IBZ', from_city: 'Ibiza', to: 'PAR', to_city: 'Paris', departure_time: '18:30', arrival_time: '20:45', duration: '2h15', stops: 'Direct', airline: 'Air France (Business Class)', price_per_person: '450€', type: 'return' }
  ],
  hotels: [
    { name: 'Six Senses Ibiza', location: 'Cala Xarraca', stars: 5, price_per_night: '1250€', highlights: 'Retraite spirituelle ultra-luxe, spa de renommée mondiale et villas avec piscine privée.', emoji: '💎', match_reason: "Le summum de l'exclusivité et du bien-être" },
    { name: 'Nobu Hotel Ibiza Bay', location: 'Talamanca', stars: 5, price_per_night: '950€', highlights: 'Design raffiné, restaurants gastronomiques et accès direct à la marina.', emoji: '🏩', match_reason: 'Élégance moderne et service signature' }
  ],
  itinerary: [
    {
      day: 1,
      title: 'Arrivée & Transfert Privé',
      subtitle: 'Immersion Immédiate',
      items: [
        { time: '14:00', type: 'activity', title: 'Installation en Penthouse', description: 'Accueil au champagne et briefing par votre majordome dédié.', price: 'Inclus', duration: '1h' },
        { time: '20:00', type: 'food', title: 'Dîner Étoilé au SubliMotion', description: "L'expérience gastronomique la plus chère du monde, un voyage sensoriel unique.", price: '1500€', duration: '3h' }
      ],
      plan_b: 'En cas de fatigue, un dîner gastronomique peut être servi en toute intimité sur la terrasse de votre Penthouse.'
    },
    {
      day: 2,
      title: 'Mer Azur & Yachting',
      subtitle: 'Formentera Privée',
      items: [
        { time: '10:00', type: 'activity', title: 'Yacht Cruise', description: 'Départ de la marina sur votre yacht privé vers les eaux turquoises de Formentera.', price: '2500€', duration: '8h' },
        { time: '22:00', type: 'activity', title: 'Table VIP au Pacha', description: 'Accès prioritaire et table réservée au coeur du club le plus mythique du monde.', price: '500€', duration: 'Toute la nuit' }
      ],
      plan_b: 'Si la mer est agitée, une visite privée de la vieille ville (Dalt Vila) avec un guide historien exclusif est organisée.'
    }
  ],
  isMock: true
};
