'use strict';

const API_BASE = 'http://localhost:5000/api/v1';

function getCookie(name) {
    const match = document.cookie
        .split('; ')
        .find(row => row.startsWith(name + '='));
    return match ? decodeURIComponent(match.split('=')[1]) : null;
}

function getQueryParam(key) {
    return new URLSearchParams(window.location.search).get(key);
}

function getUserIdFromToken(token) {
    try {
        return JSON.parse(atob(token.split('.')[1])).sub || '';
    } catch (_) {
        return '';
    }
}

function escapeHtml(str) {
    if (str === null || str === undefined) { return ''; }
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderStars(rating) {
    const n = Math.max(1, Math.min(5, parseInt(rating, 10) || 0));
    return '\u2605'.repeat(n) + '\u2606'.repeat(5 - n);
}

function showLoader(el) {
    el.innerHTML = `
        <div class="state-container">
            <div class="loader"></div>
            <p>Loading&hellip;</p>
        </div>`;
}

function showStateError(el, msg) {
    el.innerHTML = `
        <div class="state-container">
            <p class="error-msg">${escapeHtml(msg)}</p>
        </div>`;
}

function showFeedback(el, msg, type) {
    el.className    = type === 'success' ? 'success-msg' : 'error-msg';
    el.textContent  = msg;
    el.style.display = 'block';
}

function hideFeedback(el) {
    el.style.display = 'none';
    el.textContent   = '';
}

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.includes('login.html'))      { initLogin();     }
    else if (path.includes('place.html')) { initPlace();     }
    else if (path.includes('add_review')) { initAddReview(); }
    else                                  { initIndex();     }
});

function initLogin() {
    const form     = document.getElementById('login-form');
    const errorBox = document.getElementById('login-error');
    if (!form) { return; }
    const token = getCookie('token');
    if (token) { window.location.href = 'index.html'; return; }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideFeedback(errorBox);

        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const btn      = form.querySelector('button[type="submit"]');

        btn.disabled    = true;
        btn.textContent = 'Logging in\u2026';

        try {
            await loginUser(email, password);
        } catch (err) {
            showFeedback(errorBox, err.message, 'error');
            btn.disabled    = false;
            btn.textContent = 'Login';
        }
    });
}

async function loginUser(email, password) {
    let response;
    try {
        response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
    } catch (_) {
        throw new Error('Cannot reach the server. Is the API running on localhost:5000?');
    }

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Invalid credentials. Please try again.');
    }

    const data = await response.json();
    document.cookie = `token=${encodeURIComponent(data.access_token)}; path=/`;
    window.location.href = 'index.html';
}

let allPlaces = [];

function initIndex() {
    const token     = getCookie('token');
    const loginLink = document.getElementById('login-link');

    if (loginLink) {
        loginLink.style.display = token ? 'none' : 'inline';
    }

    fetchPlaces(token);
    initPriceFilter();
}

async function fetchPlaces(token) {
    const list = document.getElementById('places-list');
    showLoader(list);

    const headers = {};
    if (token) { headers['Authorization'] = `Bearer ${token}`; }

    try {
        const res = await fetch(`${API_BASE}/places/`, { headers });
        if (!res.ok) { throw new Error(`Server error ${res.status}`); }
        allPlaces = await res.json();
        displayPlaces(allPlaces);
    } catch (err) {
        showStateError(list, `Could not load places: ${err.message}`);
    }
}

function displayPlaces(places) {
    const list = document.getElementById('places-list');
    list.innerHTML = '';

    if (!places.length) {
        list.innerHTML = `
            <div class="state-container">
                <p>No places match your filter.</p>
            </div>`;
        return;
    }

    places.forEach((place, index) => {
        const article = document.createElement('article');
        article.className       = 'place-card';
        article.dataset.price   = place.price;
        article.style.animationDelay = `${index * 0.05}s`;

        article.innerHTML = `
            <h3>${escapeHtml(place.title)}</h3>
            <p class="price">Price per night: $${escapeHtml(place.price)}</p>
            <a href="place.html?id=${escapeHtml(place.id)}" class="details-button">View Details</a>
        `;
        list.appendChild(article);
    });
}

function initPriceFilter() {
    const select = document.getElementById('price-filter');
    if (!select) { return; }
    const options = [10, 50, 100, 'all'];
    options.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val === 'all' ? 'All' : `$${val}`;
        if (val === 'all') opt.selected = true;
        select.appendChild(opt);
    });

    select.addEventListener('change', () => {
        const value = select.value;
        document.querySelectorAll('.place-card').forEach(card => {
            const price = parseFloat(card.dataset.price);
            card.style.display = (value === 'all' || price <= parseFloat(value)) ? '' : 'none';
        });
    });
}

function initPlace() {
    const placeId = getQueryParam('id');
    if (!placeId) { window.location.href = 'index.html'; return; }

    const token     = getCookie('token');
    const loginLink = document.getElementById('login-link');

    if (loginLink) { loginLink.style.display = token ? 'none' : 'inline'; }

    const addReviewSection = document.getElementById('add-review');
    if (addReviewSection) {
        addReviewSection.style.display = token ? 'block' : 'none';
    }

    const addReviewLink = document.getElementById('add-review-link');
    if (addReviewLink) { addReviewLink.href = `add_review.html?id=${placeId}`; }

    fetchPlaceDetails(token, placeId);
    fetchPlaceReviews(token, placeId);

    if (token) { initInlineReviewForm(token, placeId); }
}

async function fetchPlaceDetails(token, placeId) {
    const container = document.getElementById('place-details');
    showLoader(container);

    const headers = {};
    if (token) { headers['Authorization'] = `Bearer ${token}`; }

    try {
        const res = await fetch(`${API_BASE}/places/${placeId}`, { headers });
        if (!res.ok) { throw new Error('Place not found'); }
        const place = await res.json();
        displayPlaceDetails(place);
    } catch (err) {
        showStateError(container, err.message);
    }
}

function displayPlaceDetails(place) {
    const container = document.getElementById('place-details');
    document.title  = `HBnB \u2014 ${place.title}`;

    const ownerName = place.owner
        ? `${escapeHtml(place.owner.first_name)} ${escapeHtml(place.owner.last_name)}`
        : 'Unknown';

    const amenityIcons = {
        'wifi':    'images/icon_wifi.png',
        'wi-fi':   'images/icon_wifi.png',
        'bath':    'images/icon_bath.png',
        'douche':  'images/icon_bath.png',
        'bed':     'images/icon_bed.png',
        'lit': 'images/icon_bed.png',
    };
    
    

    const amenitiesStr = (place.amenities && place.amenities.length)
        ? place.amenities.map(a => {
            const key  = a.name.toLowerCase();
            const icon = Object.keys(amenityIcons).find(k => key.includes(k));
            const img  = icon
                ? `<img src="${amenityIcons[icon]}" alt="${escapeHtml(a.name)}" style="width:20px; vertical-align:middle; margin-right:4px;">`
                : '';
            return `<span>${img}${escapeHtml(a.name)}</span>`;
        }).join(' &nbsp; ')
        : 'None';

    container.innerHTML = `
        <h1>${escapeHtml(place.title)}</h1>
        <div class="place-details">
            <div class="place-info">
                <p><strong>Host:</strong> ${ownerName}</p>
                <p><strong>Price per night:</strong> $${escapeHtml(place.price)}</p>
                <p><strong>Description:</strong> ${escapeHtml(place.description || 'No description available.')}</p>
                <p><strong>Amenities:</strong> ${amenitiesStr}</p>
            </div>
        </div>
    `;
}


async function fetchPlaceReviews(token, placeId) {
    const section = document.getElementById('reviews');
    const loader  = document.createElement('div');
    loader.style.cssText = 'text-align:center; padding:1rem;';
    loader.innerHTML     = '<div class="loader"></div>';
    section.appendChild(loader);

    const headers = {};
    if (token) { headers['Authorization'] = `Bearer ${token}`; }

    try {
        const res = await fetch(`${API_BASE}/places/${placeId}/reviews`, { headers });
        if (!res.ok) { throw new Error('Could not load reviews'); }
        const reviews = await res.json();
        loader.remove();
        displayReviews(reviews, section);
    } catch (err) {
        loader.remove();
        const p = document.createElement('p');
        p.className   = 'error-msg';
        p.textContent = err.message;
        section.appendChild(p);
    }
}

function displayReviews(reviews, section) {
    if (!reviews.length) {
        const p = document.createElement('p');
        p.style.cssText = 'color:#666; padding:.5rem 20px;';
        p.textContent   = 'No reviews yet. Be the first!';
        section.appendChild(p);
        return;
    }

    reviews.forEach((review, index) => {
        const card = document.createElement('article');
        card.className          = 'review-card';
        card.style.animationDelay = `${index * 0.07}s`;

        const userName = review.user
            ? `${escapeHtml(review.user.first_name)} ${escapeHtml(review.user.last_name)}`
            : 'Anonymous';

        card.innerHTML = `
            <p class="reviewer">${userName}:</p>
            <p class="review-text">${escapeHtml(review.text)}</p>
            <p class="rating-line">Rating: <span class="stars">${renderStars(review.rating)}</span></p>
        `;
        section.appendChild(card);
    });
}

function initInlineReviewForm(token, placeId) {
    const form       = document.getElementById('review-form');
    const feedbackEl = document.getElementById('review-feedback');
    if (!form) { return; }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideFeedback(feedbackEl);

        const text   = document.getElementById('review-text').value.trim();
        const rating = parseInt(document.getElementById('rating').value, 10);

        if (!text) {
            showFeedback(feedbackEl, 'Please write your review.', 'error');
            return;
        }

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled    = true;
        btn.textContent = 'Submitting\u2026';

        try {
            await submitReview(token, placeId, text, rating);
            showFeedback(feedbackEl, 'Review submitted! Refreshing\u2026', 'success');
            form.reset();
            setTimeout(() => {
                const section = document.getElementById('reviews');
                [...section.children].forEach(child => {
                    if (child.tagName !== 'H2') { child.remove(); }
                });
                fetchPlaceReviews(token, placeId);
                hideFeedback(feedbackEl);
            }, 1500);
        } catch (err) {
            showFeedback(feedbackEl, err.message, 'error');
        } finally {
            btn.disabled    = false;
            btn.textContent = 'Submit Review';
        }
    });
}

function initAddReview() {
    const token = getCookie('token');
    if (!token) { window.location.href = 'index.html'; return; }

    const placeId = getQueryParam('id');
    if (!placeId) { window.location.href = 'index.html'; return; }

    const backLink = document.getElementById('back-to-place');
    if (backLink) { backLink.href = `place.html?id=${placeId}`; }

    loadPlaceTitle(token, placeId);

    const form       = document.getElementById('review-form');
    const feedbackEl = document.getElementById('review-feedback');
    if (!form) { return; }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideFeedback(feedbackEl);

        const text   = document.getElementById('review').value.trim();
        const rating = parseInt(document.getElementById('rating').value, 10);

        if (!text) {
            showFeedback(feedbackEl, 'Please write your review.', 'error');
            return;
        }

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled    = true;
        btn.textContent = 'Submitting\u2026';

        try {
            await submitReview(token, placeId, text, rating);
            showFeedback(feedbackEl, 'Review submitted! Redirecting\u2026', 'success');
            form.reset();
            setTimeout(() => { window.location.href = `place.html?id=${placeId}`; }, 1800);
        } catch (err) {
            showFeedback(feedbackEl, err.message, 'error');
            btn.disabled    = false;
            btn.textContent = 'Submit Review';
        }
    });
}

async function loadPlaceTitle(token, placeId) {
    try {
        const res = await fetch(`${API_BASE}/places/${placeId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) { return; }
        const place = await res.json();

        const titleEl = document.getElementById('review-page-title');
        if (titleEl) { titleEl.textContent = `Reviewing: ${place.title}`; }
        document.title = `HBnB \u2014 Reviewing: ${place.title}`;
    } catch (_) { }
}

async function submitReview(token, placeId, text, rating) {
    const userId = getUserIdFromToken(token);

    let response;
    try {
        response = await fetch(`${API_BASE}/reviews/`, {
            method: 'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                text:     text,
                rating:   rating,
                user_id:  userId,
                place_id: placeId
            })
        });
    } catch (_) {
        throw new Error('Cannot reach the server. Is the API running?');
    }

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Error ${response.status}`);
    }

    return response.json();
}