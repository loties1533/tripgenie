/**
 * @fileoverview Utilitaires partagés du pipeline IA :
 * - callAI : routeur multi-provider avec fallback automatique
 * - parseJSON : nettoyage et parsing robuste des réponses IA
 * - sanitizeInput : protection contre les injections de prompt
 */

import 'dotenv/config';
import * as Mocks from '../mocks.js';
import { callClaude, callOpenRouter, callGemini, callOllama } from '../providers.js';

const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY?.trim() || null;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY?.trim() || null;

export const SYSTEM_PROMPT = `Tu es TripGenie, expert voyage. Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte avant ou après.`;

console.log(`🤖 AI Provider: ${
  process.env.AI_PROVIDER === 'ollama'      ? 'Ollama'      :
  process.env.AI_PROVIDER === 'openrouter'  ? 'OpenRouter'  :
  process.env.AI_PROVIDER === 'gemini'      ? 'Gemini'      :
  ANTHROPIC_KEY                             ? 'Claude'      : '⚠️ AUCUN'
}`);

export function sanitizeInput(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str.slice(0, 300).replace(/[`\\]/g, ' ').trim();
}

export function parseJSON(raw) {
  let str = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();

  const start = str.indexOf('{');
  const end   = str.lastIndexOf('}');
  if (start !== -1 && end !== -1) str = str.slice(start, end + 1);

  try {
    return JSON.parse(str);
  } catch (e) {
    try {
      return JSON.parse(str.replace(/,(\s*[}\]])/g, '$1'));
    } catch {
      console.error('parseJSON failed:', raw.slice(0, 200));
      throw new Error(`JSON malformé: ${e.message}`);
    }
  }
}

export function normalizeChips(chips) {
  if (!Array.isArray(chips)) return [];
  return chips.map(c => {
    if (typeof c === 'string') return c;
    if (c?.label) return c.label;
    if (c?.value) return c.value;
    if (c?.text)  return c.text;
    return String(c);
  }).filter(Boolean);
}

/**
 * Routeur multi-provider avec fallback automatique.
 * Ordre : provider configuré → Gemini → OpenRouter → Claude → Mode Survie (mocks).
 */
export async function callAI(userPrompt, systemPrompt = SYSTEM_PROMPT, context = 'onboarding') {
  const errors   = [];
  const provider = process.env.AI_PROVIDER;

  if (provider === 'ollama' && process.env.OLLAMA_BASE_URL) {
    try { return await callOllama(systemPrompt, userPrompt); } catch (e) { errors.push(`Ollama: ${e.message}`); }
  }
  if (provider === 'openrouter' && OPENROUTER_KEY) {
    try { return await callOpenRouter(systemPrompt, userPrompt); } catch (e) { errors.push(`OpenRouter: ${e.message}`); }
  }
  if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
    try { return await callGemini(systemPrompt, userPrompt); } catch (e) { errors.push(`Gemini: ${e.message}`); }
  }

  if (process.env.GEMINI_API_KEY && provider !== 'gemini') {
    try { return await callGemini(systemPrompt, userPrompt); } catch (e) { errors.push(`Gemini: ${e.message}`); }
  }
  if (OPENROUTER_KEY && provider !== 'openrouter') {
    try { return await callOpenRouter(systemPrompt, userPrompt); } catch (e) { errors.push(`OpenRouter: ${e.message}`); }
  }
  if (ANTHROPIC_KEY) {
    try { return await callClaude(systemPrompt, userPrompt); } catch (e) { errors.push(`Claude: ${e.message}`); }
  }

  console.error('❌ AI FAILURES LOG:', JSON.stringify(errors, null, 2));
  console.error(`🚨 TOUS LES SERVICES IA ÉPUISÉS. Activation du Mode Survie (${context}).`);
  if (context === 'onboarding')   return JSON.stringify(Mocks.MOCK_ONBOARDING);
  if (context === 'destinations') return JSON.stringify(Mocks.MOCK_DESTINATIONS);
  if (context === 'pack')         return JSON.stringify(Mocks.MOCK_PACK);
  return JSON.stringify({ response: "Service temporairement limité. Réessayez dans 1 minute.", isMock: true });
}
