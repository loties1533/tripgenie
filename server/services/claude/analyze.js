/**
 * @fileoverview Analyse de la demande utilisateur et suggestion de destinations.
 * Utilise Tavily (searchWeb) pour enrichir les suggestions avec du contexte web récent.
 */

import { searchWeb } from '../tools/webSearch.js';
import * as Mocks from '../mocks.js';
import { callAI, parseJSON, sanitizeInput } from './core.js';
import { getDestinationPhoto } from '../photo.js';

export async function analyzeRequest(userInput) {
  const raw = await callAI(
    `Analyse cette demande: "${sanitizeInput(userInput)}"
JSON: {"destination":"ville ou null","origin":"Paris","mode":"party|student|luxury|group|relax|surprise","travelers":2,"duration_days":3,"budget_total":null,"preferences":[],"confidence":0.9}`,
    undefined,
    'onboarding'
  );
  return parseJSON(raw);
}

export async function suggestDestinations({ mode, profile, interests, budget, travelers, duration, origin, moods, discoveryMode, preferences, departure }) {
  try {
    const intStr  = interests?.join(', ') || 'voyage';
    const moodStr = moods?.join(', ')     || '';
    const month   = departure
      ? new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(departure))
      : 'actuellement';

    let query = `Meilleures destinations ${mode} pour ${profile} en ${month}. `;
    if (mode === 'party') {
      query += `Focus sur la vie nocturne, clubs underground, festivals, ambiance électrique et branchée. `;
    }
    query += `Budget total ${budget}€ pour ${travelers} personnes. Intérêts: ${intStr} ${moodStr}.`;
    if (discoveryMode === 'hidden_gem') {
      query += ` Cherche des pépites cachées, pas les destinations ultra-touristiques habituelles.`;
    }

    const webContext = await searchWeb(query);

    const raw = await callAI(
      `CONTEXTE WEB RÉCENT : ${webContext}
      MISSION : Suggère 3 destinations parfaites pour un voyage en ${month}.
      PROFIL : ${profile}, MODE : ${mode}.
      BUDGET TOTAL : ${budget}€ pour ${travelers || 2} personne(s) = ${Math.round(budget / (travelers || 2))}€/personne.

      STRATÉGIE : 2 destinations CLASSIQUES + 1 destination PÉPITE (Hidden Gem).
      1. Si budget/pers >= 2000 : Ton VIP/Prestigieux. Pas de "gratuit".
      2. Si MODE = PARTY : Focus sur la vie nocturne mondiale.

      FORMAT JSON STRICT — reason MAX 8 mots, budget_estimate CALCULÉ depuis le budget réel (${Math.round(budget / (travelers || 2))}€/pers) :
      {"destinations": [{"city": "Nom", "country": "Pays", "tagline": "Accroche courte (5-8 mots)", "reason": "Raison MAX 8 mots", "budget_estimate": "~${Math.round(budget / (travelers || 2))}€/pers", "match_score": 95}]}`,
      undefined,
      'destinations'
    );
    const result = parseJSON(raw);
    const budgetPerPers = budget && travelers ? Math.round(budget / travelers) : null;

    // Enrichir chaque destination avec photo + budget calculé côté serveur
    if (result?.destinations?.length) {
      const photos = await Promise.allSettled(
        result.destinations.map(d => getDestinationPhoto(d.city))
      );
      result.destinations = result.destinations.map((d, i) => ({
        ...d,
        photo: photos[i].status === 'fulfilled' ? photos[i].value : null,
        // Toujours calculé depuis les vraies données, jamais hallucin par l'IA
        budget_estimate: budgetPerPers ? `~${budgetPerPers.toLocaleString('fr-FR')}€/pers` : d.budget_estimate
      }));
    }

    return result;
  } catch (err) {
    console.error('⚠️ SuggestDestinations failed, activation du Mode Survie:', err.message);
    return Mocks.MOCK_DESTINATIONS;
  }
}
