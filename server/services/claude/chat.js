/**
 * @fileoverview Gestion du chat conversationnel :
 * - chatIntake  : onboarding — collecte les infos voyage en max 3 échanges
 * - chatModify  : modification post-génération du pack
 */

import * as Mocks from '../mocks.js';
import { callAI, parseJSON, sanitizeInput, normalizeChips } from './core.js';

/**
 * Gère l'onboarding conversationnel.
 * Analyse le message utilisateur et extrait les données voyage (destination, budget, dates…).
 * Passe isReady à true dès que les informations minimales sont collectées.
 * @param {{ currentData: Object, userMessage: string }} params
 * @returns {Promise<import('../../types.js').ResultatOnboarding>}
 */
export async function chatIntake({ currentData, userMessage }) {
  const systemPrompt = `Tu es le Concierge Privé de TripGenie. Tu incarnes l'excellence du service personnalisé.

TON OBJECTIF : Collecter les informations essentielles pour orchestrer une escapade signature (Profil, Voyageurs, Budget, Dates).
Le but est d'être prêt (isReady: true) en MAXIMUM 2-3 échanges.

RÈGLES D'OR POUR LA PRÉSENTATION :
1. VOCABULAIRE LUXE : Utilise "escapade" pas "voyage", "résidence" pas "hôtel", "orchestrer" pas "organiser", "fenêtre de dates" pas "dates".
2. ANTICIPATION : Si l'utilisateur donne une info, enregistre-la immédiatement. Ne redemande JAMAIS ce qui est déjà connu.
3. FLUIDITÉ (ISREADY) : 
   - Tu passes isReady: true dès que tu as au moins 3 champs remplis parmi (travelers, budget, profile, duration).
   - Si le budget est manquant après le 2ème échange, propose par défaut 3000€ et passe isReady: true.
   - Si l'utilisateur répond via un bouton (chip), considère l'info comme ACQUISE et passe à la question suivante ou termine.
4. DÉDUCTION : "On est 4 amis" → travelers=4, profile="amis", mode="party". "Fin Juillet" → departure="2025-07-28".

DONNÉES ACTUELLES :
${JSON.stringify(currentData)}

QUESTIONS PRIORITAIRES (Si manquantes) :
${!currentData?.profile ? '→ PRIORITÉ 1 : Quelle est l\'occasion de cette escapade ? (Duo, Amis, Famille)' : '✅ Profil connu'}
${!currentData?.travelers ? '→ PRIORITÉ 2 : Combien de convives participent à l\'aventure ?' : '✅ Voyageurs connus'}
${!currentData?.budget ? '→ PRIORITÉ 3 : Quel budget souhaitez-vous allouer à cette escapade ?' : '✅ Budget connu'}
${!currentData?.departure ? '→ PRIORITÉ 4 : Quelle serait votre fenêtre de dates idéale ?' : '✅ Dates connues'}

FORMAT DE RÉPONSE (JSON STRICT) :
{
  "response": "Ta réponse élégante et concise (max 2 phrases).",
  "chips": ["Option 1", "Option 2", "Option 3"],
  "extractedData": {
    "travelers": null, "profile": null, "mode": "luxury", "budget": null, "duration": null, "departure": null, "origin": "Paris"
  },
  "isReady": false
}`;

  const msg = sanitizeInput(userMessage).toLowerCase();

  if (msg.includes('montre-moi')) {
    const profile = currentData?.profile || Mocks.MOCK_ONBOARDING.extractedData.profile;
    return {
      response: "C'est parti pour le voyage Signature TripGenie ! ✨",
      isReady:  true,
      extractedData: { ...Mocks.MOCK_ONBOARDING.extractedData, profile },
      isMock: true
    };
  }

  if (msg.includes('attendre')) {
    return {
      response: "Pas de souci ! Je comprends. N'hésite pas à revenir d'ici une heure ou demain, je serai de nouveau au top de ma forme pour te créer un voyage sur-mesure. À bientôt ! 👋",
      isReady:  false,
      chips:    ["Réessayer"],
      isMock:   true
    };
  }

  try {
    const raw = await callAI(
      `${systemPrompt}\n\nMessage utilisateur : "${sanitizeInput(userMessage)}"`,
      undefined,
      'onboarding'
    );
    return parseJSON(raw);
  } catch (err) {
    console.error('⚠️ ChatIntake failed, activation du Mode Survie:', err.message);
    return {
      ...Mocks.MOCK_ONBOARDING,
      response: "Je capte un peu mal mais je continue ! On part sur une base solide, qu'est-ce que tu en penses ?",
      isMock: true
    };
  }
}

export async function chatModify({ currentPack, userMessage, mode }) {
  const systemPrompt = `Tu es l'expert voyage TripGenie. L'utilisateur veut modifier son voyage à ${currentPack?.destination}.

  CONTEXTE ACTUEL :
  - Destination : ${currentPack?.destination}
  - Budget : ${currentPack?.summary?.total_budget}
  - Pack actuel : ${JSON.stringify(currentPack)}

  CONSIGNES :
  1. Réponds de manière amicale et concise (champ "response").
  2. Si l'utilisateur demande une modification majeure (ex: changer de ville), mets "needs_full_regen" à true.
  3. Pour des modifications précises (ex: "enlève l'activité 2", "trouve un hôtel moins cher", "ajoute un jour"), suggère les changements dans "modifications".
  4. Le champ "modifications" peut contenir n'importe quelle clé du pack (hotels, activities, itinerary, budget_breakdown, tips).

  FORMAT RÉPONSE (JSON UNIQUEMENT) :
  {
    "response": "Ma réponse à l'utilisateur",
    "needs_full_regen": false,
    "modifications": {
      "hotels": [...],
      "activities": [...],
      "itinerary": [...]
    }
  }`;

  const raw    = await callAI(`${systemPrompt}\n\nMessage de l'utilisateur : "${sanitizeInput(userMessage)}"`);
  const result = parseJSON(raw);
  if (result.chips) result.chips = normalizeChips(result.chips);
  return result;
}
