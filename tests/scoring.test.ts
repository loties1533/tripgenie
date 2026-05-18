import { describe, it, expect } from 'vitest';
import { scorepack } from '../server/services/scoring.js';
import { MODES } from '../server/lib/constants.js';

const packBase = {
  vol:        { price: 400, duration_min: 120, stops: 0 },
  hotel:      { stars: 4, price_per_night: 150, rating: 8.5 },
  events:     [{ category: 'nightlife' }, { category: 'concert' }],
  activities: [{ name: 'Visite musée' }, { name: 'Tour en vélo' }],
  totalPrice: 2000
};

describe('scorepack — algorithme de scoring multi-critères', () => {

  it('retourne un score entre 0 et 1', () => {
    const result = scorepack(packBase, MODES.PARTY, 2, 'Barcelone');
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(1);
  });

  it('retourne un objet avec total et details', () => {
    const result = scorepack(packBase, MODES.PARTY, 2, 'Barcelone');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('details');
  });

  it('mode luxury favorise les hôtels étoilés', () => {
    const packLuxe  = { ...packBase, hotel: { stars: 5, price_per_night: 500, rating: 9.5 } };
    const packBasic = { ...packBase, hotel: { stars: 2, price_per_night: 50,  rating: 6.0 } };
    const scoreLuxe  = scorepack(packLuxe,  MODES.LUXURY, 2, 'Monaco');
    const scoreBasic = scorepack(packBasic, MODES.LUXURY, 2, 'Monaco');
    expect(scoreLuxe.total).toBeGreaterThan(scoreBasic.total);
  });

  it('mode student favorise les prix bas', () => {
    const packPasCher = { ...packBase, vol: { price: 80,  duration_min: 200, stops: 1 }, totalPrice: 500  };
    const packCher    = { ...packBase, vol: { price: 800, duration_min: 90,  stops: 0 }, totalPrice: 3000 };
    const scorePasCher = scorepack(packPasCher, MODES.STUDENT, 1, 'Prague');
    const scoreCher    = scorepack(packCher,    MODES.STUDENT, 1, 'Prague');
    expect(scorePasCher.total).toBeGreaterThan(scoreCher.total);
  });

  it('mode surprise donne un meilleur score aux destinations originales', () => {
    const scoreOriginal = scorepack(packBase, MODES.SURPRISE, 2, 'Tbilissi');
    const scoreCommun   = scorepack(packBase, MODES.SURPRISE, 2, 'Paris');
    expect(scoreOriginal.total).toBeGreaterThan(scoreCommun.total);
  });

  it('gère les données manquantes sans planter', () => {
    const packVide = { vol: null, hotel: null, events: [], activities: [], totalPrice: 0 };
    expect(() => scorepack(packVide, MODES.RELAX, 2, 'Bali')).not.toThrow();
  });

  it('gère un mode inconnu sans planter (fallback party)', () => {
    expect(() => scorepack(packBase, 'mode_inexistant', 2, 'Rome')).not.toThrow();
  });
});
