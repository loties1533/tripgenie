import { getTrips, isLoggedIn } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) {
    document.getElementById('tripsGrid').innerHTML = '<p>Veuillez vous <a href="index.html">connecter</a> pour voir vos voyages.</p>';
    return;
  }

  try {
    const data = await getTrips();
    const trips = data.trips || data;
    const grid = document.getElementById('tripsGrid');
    
    if (!trips || trips.length === 0) {
      grid.innerHTML = '<p>Vous n\'avez aucun voyage sauvegardé. <a href="index.html">Créez-en un !</a></p>';
      return;
    }

    grid.innerHTML = '';
    trips.forEach(trip => {
      const card = document.createElement('div');
      card.className = 'trip-card';
      const date = new Date(trip.created_at).toLocaleDateString('fr-FR');
      card.innerHTML = `
        <h3>${trip.title || 'Voyage'}</h3>
        <p>Destinations: ${trip.destination}<br>Date: ${new Date(trip.departure).toLocaleDateString('fr-FR')} - ${trip.travelers} pers.<br>Mode: ${trip.mode}</p>
        <p style="font-size:12px; color:#999;">Sauvegardé le ${date}</p>
        <button class="btn-book" onclick="alert('Fonctionnalité d\\'ouverture détaillée à venir.')">Voir les détails</button>
      `;
      grid.appendChild(card);
    });

  } catch (err) {
    document.getElementById('tripsGrid').innerHTML = `<p style="color:red;">Erreur: ${err.message}</p>`;
  }
});
