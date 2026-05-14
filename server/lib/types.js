/**
 * @fileoverview Définitions de types JSDoc pour TripGenie.
 * Documente la forme des objets circulant dans le pipeline IA
 * et stockés en JSONB dans la colonne `pack_data` de la table `trips`.
 */

/**
 * @typedef {Object} Meteo
 * @property {string} avg_temp   - ex : "22°C"
 * @property {string} conditions - ex : "Ensoleillé"
 * @property {string} tip        - conseil vestimentaire
 */

/**
 * @typedef {Object} TronconVol
 * @property {string} from
 * @property {string} from_city
 * @property {string} to
 * @property {string} to_city
 * @property {string} departure_time    - ex : "10:30"
 * @property {string} arrival_time
 * @property {string} duration          - ex : "2h30"
 * @property {string} stops             - "Direct" ou "1 escale(s)"
 * @property {string} airline
 * @property {string} price_per_person  - ex : "250€"
 * @property {'outbound'|'return'} type
 */

/**
 * @typedef {Object} Hotel
 * @property {string} name
 * @property {string} location
 * @property {number} stars
 * @property {string} price_per_night - ex : "150€"
 * @property {string} highlights
 * @property {string} emoji
 */

/**
 * @typedef {Object} ElementItineraire
 * @property {string} time
 * @property {'activity'|'food'|'event'} type
 * @property {string} title
 * @property {string} description
 * @property {string} price
 * @property {string} duration
 */

/**
 * @typedef {Object} JourneeItineraire
 * @property {number} day
 * @property {string} title
 * @property {string} subtitle
 * @property {ElementItineraire[]} items
 */

/**
 * @typedef {Object} Activite
 * @property {string} name
 * @property {string} category
 * @property {string} emoji
 * @property {string} description
 * @property {string} duration
 * @property {string} price
 * @property {string} best_time
 */

/**
 * @typedef {Object} Evenement
 * @property {string} title
 * @property {string} category
 * @property {string} start
 * @property {string} venue
 * @property {string} description
 */

/**
 * @typedef {Object} RepartitionBudget
 * @property {string} vols
 * @property {string} hebergement
 * @property {string} activites
 * @property {string} restauration
 * @property {string} transports
 * @property {string} divers
 * @property {string} total
 */

/**
 * @typedef {Object} ResultatScore
 * @property {number} total    - score global entre 0 et 1
 * @property {Object} details  - scores par catégorie (vol, hotel, events, etc.)
 * @property {string} label    - ex : "Excellent", "Bon", "Moyen"
 */

/**
 * @typedef {Object} Pack
 * @property {string}             destination
 * @property {string}             country
 * @property {string}             tagline
 * @property {string}             overview
 * @property {Meteo}              weather
 * @property {{total_budget: string, nights: number, activities_count: number}} summary
 * @property {TronconVol[]}       flights
 * @property {Hotel[]}            hotels
 * @property {JourneeItineraire[]} itinerary
 * @property {Activite[]}         activities
 * @property {Evenement[]}        events
 * @property {RepartitionBudget}  budget_breakdown
 * @property {{title: string, content: string}[]} tips
 * @property {{phrase: string, translation: string}[]} local_phrases
 * @property {ResultatScore}      [score]
 */

/**
 * @typedef {Object} ResultatOnboarding
 * @property {string}   response      - réponse textuelle du bot
 * @property {string[]} chips         - suggestions cliquables
 * @property {Object}   extractedData - données voyage extraites du message
 * @property {boolean}  isReady       - true quand toutes les infos nécessaires sont collectées
 * @property {boolean}  [isMock]      - true si réponse de secours (fallback)
 */
