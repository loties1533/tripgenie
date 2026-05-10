import express from 'express';
import Stripe from 'stripe';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');

/**
 * Crée une session de paiement Stripe pour un voyage
 */
router.post('/create-checkout-session', optionalAuth, async (req, res) => {
  try {
    const { pack, tripId } = req.body;

    if (!pack) return res.status(400).json({ error: 'Données du pack manquantes' });

    // On simule un prix basé sur le budget ou on prend le budget total
    const totalAmount = parseInt(pack.summary?.total_budget) || 1000;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Voyage Signature : ${pack.destination}`,
              description: `Escapade de ${pack.summary?.nights} nuits orchestrée par TripGenie.`,
              images: [pack.photo_url || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb'],
            },
            unit_amount: totalAmount * 100, // Stripe utilise les centimes
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL || 'http://localhost:3001'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:3001'}/trips`,
      metadata: {
        tripId: tripId || 'guest',
        destination: pack.destination
      }
    });

    res.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error('Stripe Error:', err.message);
    res.status(500).json({ error: 'Impossible de créer la session de paiement' });
  }
});

export default router;
