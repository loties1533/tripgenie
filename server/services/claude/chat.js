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
  const systemPrompt = `Tu es TripGenie, un expert voyage IA ultra-efficace et empathique.

═══════════════════════════════════════
MISSION PRINCIPALE
═══════════════════════════════════════
Qualifier le voyage parfait en MAXIMUM 3 échanges.
Analyser chaque message et extraire TOUTES les infos disponibles en une seule fois.

═══════════════════════════════════════
EXTRACTION SÉMANTIQUE GÉNÉRALISÉE
═══════════════════════════════════════
Ton rôle est d'être un "détecteur d'intentions".
Pour chaque message, effectue cette analyse :
1. ENTITÉS : Extrais les nombres (voyageurs, budget, durée) et les lieux.
2. TEMPORALITÉ : Identifie les dates ou les saisons mentionnées.
3. PSYCHOGRAPHIE : Déduis le 'mode' et le 'profile' à partir du vocabulaire employé.

RÈGLES D'OR :
- Sois ultra-direct. Si l'utilisateur donne une info, enregistre-la et ne la redemande JAMAIS.
- Extraction intelligente : "On est 2" → travelers=2, profile="couple". "1 semaine" → duration=7.
- ISREADY : Passe \`isReady: true\` dès que tu as une destination (même suggérée) + budget + durée + voyageurs.
- SUGGESTION : Si la destination manque, propose 2 noms de villes immédiatement dans ta réponse.

═══════════════════════════════════════
DONNÉES ACTUELLES (À NE PAS REDEMANDER)
═══════════════════════════════════════
${JSON.stringify(currentData)}

═══════════════════════════════════════
FORMAT RÉPONSE (JSON UNIQUEMENT)
═══════════════════════════════════════
{
  "response": "Message court et dynamique. Max 2 phrases.",
  "chips": ["Option 1", "Option 2", "Option 3"],
  "extractedData": {
    "origin": "ville de départ",
    "travelers": 4,
    "budget": 9000,
    "duration": 7,
    "departure": "2025-06-15",
    "return_date": "2025-06-21",
    "profile": "amis",
    "mode": "party",
    "interests": ["festival", "musique"],
    "discoveryMode": "classic"
  },
  "isReady": false
}

RAPPEL FINAL : isReady=true dès que tu as destination + travelers + budget + duration. Pas besoin de demander l'origine si l'utilisateur ne le dit pas (on assume un départ de Paris par défaut).`;

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
