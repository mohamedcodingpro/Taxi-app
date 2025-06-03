// App State
const state = {
    currentLanguage: 'en',
    translations: {},
    userLocation: null,
    selectedRoute: null,
    walletBalance: 50.00, // Starting balance
    userRating: 0,
    offline: !navigator.onLine
};

// DOM Elements
const elements = {
    fromInput: document.getElementById('from'),
    toInput: document.getElementById('to'),
    searchBtn: document.getElementById('search-btn'),
    routeDisplay: document.getElementById('route'),
    fareDisplay: document.getElementById('fare'),
    timeDisplay: document.getElementById('time'),
    baseFareDisplay: document.getElementById('base-fare'),
    priceAdjustmentDisplay: document.getElementById('price-adjustment'),
    reviewsList: document.getElementById('reviews-list'),
    reviewInput: document.getElementById('review-input'),
    submitReviewBtn: document.getElementById('submit-review'),
    ranksList: document.getElementById('ranks-list'),
    darkModeToggle: document.getElementById('dark-mode-toggle'),
    languageSelect: document.getElementById('language-select'),
    bookBtn: document.getElementById('book-btn'),
    shareBtn: document.getElementById('share-btn'),
    sosButton: document.getElementById('sos-button'),
    walletBalanceDisplay: document.getElementById('balance'),
    addFundsBtn: document.getElementById('add-funds'),
    offlineNotification: document.getElementById('offline-notification'),
    ratingStars: document.querySelectorAll('.star')
};

// Mock Data
const data = {
    taxiRoutes: [
        { from: "Johannesburg", to: "Pretoria", baseFare: 25, time: 45, distance: 58 },
        { from: "Cape Town", to: "Stellenbosch", baseFare: 30, time: 35, distance: 50 },
        { from: "Durban", to: "Pietermaritzburg", baseFare: 40, time: 60, distance: 80 },
    ],
    taxiRanks: [
        { name: "Johannesburg Rank", location: "JHB Central", distance: "0.5 km", routes: ["Pretoria", "Soweto"] },
        { name: "Cape Town Rank", location: "CBD", distance: "1.2 km", routes: ["Stellenbosch", "Khayelitsha"] },
    ],
    reviews: [
        { route: "Johannesburg to Pretoria", user: "Thabo", comment: "Fast and reliable!", rating: 4 },
        { route: "Cape Town to Stellenbosch", user: "Nomvula", comment: "Comfortable ride", rating: 5 },
    ]
};

// Initialize the app
function initApp() {
    // Load translations
    loadTranslations(state.currentLanguage);
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize wallet
    updateWalletDisplay();
    
    // Check offline status
    checkOfflineStatus();
    
    // Try to get user location
    getUserLocation();
    
    // Initialize Google Maps when available
    if (typeof google !== 'undefined') {
        initMap();
    } else {
        window.initMap = initMap;
    }
}

// Load translations
async function loadTranslations(lang) {
    try {
        const response = await fetch(`lang/${lang}.json`);
        state.translations[lang] = await response.json();
        applyTranslations();
    } catch (error) {
        console.error('Error loading translations:', error);
    }
}

// Apply translations to the UI
function applyTranslations() {
    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        if (state.translations[state.currentLanguage] && state.translations[state.currentLanguage][key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = state.translations[state.currentLanguage][key];
            } else {
                el.textContent = state.translations[state.currentLanguage][key];
            }
        }
    });
}

// Set up all event listeners
function setupEventListeners() {
    // Search functionality
    elements.searchBtn.addEventListener('click', handleSearch);
    
    // Language selector
    elements.languageSelect.addEventListener('change', (e) => {
        state.currentLanguage = e.target.value;
        applyTranslations();
    });
    
    // Dark mode toggle
    elements.darkModeToggle.addEventListener('click', toggleDarkMode);
    
    // Review submission
    elements.submitReviewBtn.addEventListener('click', submitReview);
    
    // Rating stars
    elements.ratingStars.forEach(star => {
        star.addEventListener('click', () => setRating(star.dataset.rating));
        star.addEventListener('mouseover', () => highlightStars(star.dataset.rating));
    });
    
    // Action buttons
    elements.bookBtn.addEventListener('click', bookTaxi);
    elements.shareBtn.addEventListener('click', shareTrip);
    
    // SOS button
    elements.sosButton.addEventListener('click', toggleSOS);
    
    // Wallet management
    elements.addFundsBtn.addEventListener('click', addFunds);
    
    // Online/offline detection
    window.addEventListener('online', () => updateOnlineStatus(true));
    window.addEventListener('offline', () => updateOnlineStatus(false));
}

// Search for routes
function handleSearch() {
    const from = elements.fromInput.value.trim();
    const to = elements.toInput.value.trim();
    
    if (!from || !to) {
        alert(state.translations[state.currentLanguage]?.search_error || 'Please enter both locations');
        return;
    }
    
    const foundRoute = data.taxiRoutes.find(
        route => route.from.toLowerCase().includes(from.toLowerCase()) && 
                route.to.toLowerCase().includes(to.toLowerCase())
    );
    
    if (foundRoute) {
        state.selectedRoute = foundRoute;
        displayRouteInfo(foundRoute);
        calculateDynamicPricing(foundRoute);
    } else {
        displayRouteNotFound();
    }
}

// Display route information
function displayRouteInfo(route) {
    elements.routeDisplay.textContent = `${route.from} to ${route.to}`;
    elements.baseFareDisplay.textContent = route.baseFare.toFixed(2);
    elements.timeDisplay.textContent = `${route.time} min`;
    
    displayReviews(route.from, route.to);
    displayNearbyRanks(route.from);
    
    // Enable action buttons
    elements.bookBtn.disabled = false;
    elements.shareBtn.disabled = false;
}

// Calculate and display dynamic pricing
function calculateDynamicPricing(route) {
    const hours = new Date().getHours();
    const isPeak = (hours >= 7 && hours <= 9) || (hours >= 16 && hours <= 18);
    const adjustment = isPeak ? route.baseFare * 0.3 : route.baseFare * 0.1;
    
    const finalFare = route.baseFare + adjustment;
    
    elements.priceAdjustmentDisplay.textContent = adjustment.toFixed(2);
    elements.fareDisplay.textContent = `R${finalFare.toFixed(2)}`;
}

// Display reviews for a route
function displayReviews(from, to) {
    const routeString = `${from} to ${to}`;
    const routeReviews = data.reviews.filter(
        review => review.route.toLowerCase() === routeString.toLowerCase()
    );
    
    elements.reviewsList.innerHTML = routeReviews.length > 0 
        ? routeReviews.map(review => `
            <div class="review">
                <strong>${review.user}</strong> 
                <span class="rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>
                <p>${review.comment}</p>
            </div>
        `).join('')
        : `<p>${state.translations[state.currentLanguage]?.no_reviews || 'No reviews yet'}</p>`;
}

// Submit a review
function submitReview() {
    const comment = elements.reviewInput.value.trim();
    if (!state.selectedRoute || !comment || state.userRating === 0) return;
    
    const newReview = {
        route: `${state.selectedRoute.from} to ${state.selectedRoute.to}`,
        user: "You",
        comment,
        rating: state.userRating
    };
    
    data.reviews.unshift(newReview);
    elements.reviewInput.value = '';
    state.userRating = 0;
    resetStars();
    
    displayReviews(state.selectedRoute.from, state.selectedRoute.to);
}

// Rating system
function setRating(rating) {
    state.userRating = parseInt(rating);
    highlightStars(rating);
}

function highlightStars(upTo) {
    elements.ratingStars.forEach(star => {
        star.textContent = star.dataset.rating <= upTo ? '★' : '☆';
        star.classList.toggle('active', star.dataset.rating <= upTo);
    });
}

function resetStars() {
    elements.ratingStars.forEach(star => {
        star.textContent = '☆';
        star.classList.remove('active');
    });
}

// Display nearby taxi ranks
function displayNearbyRanks(location) {
    const nearbyRanks = data.taxiRanks.filter(rank => 
        rank.location.toLowerCase().includes(location.toLowerCase())
    );
    
    elements.ranksList.innerHTML = nearbyRanks.length > 0
        ? nearbyRanks.map(rank => `
            <li>
                <strong>${rank.name}</strong>
                <small>${rank.distance}</small>
                <div>${rank.routes.join(', ')}</div>
            </li>
        `).join('')
        : `<li>${state.translations[state.currentLanguage]?.no_ranks || 'No nearby ranks found'}</li>`;
}

// Book a taxi
function bookTaxi() {
    if (!state.selectedRoute) return;
    
    const fare = parseFloat(elements.fareDisplay.textContent.replace('R', ''));
    if (state.walletBalance < fare) {
        alert(state.translations[state.currentLanguage]?.insufficient_funds || 'Insufficient funds');
        return;
    }
    
    state.walletBalance -= fare;
    updateWalletDisplay();
    
    alert(`${state.translations[state.currentLanguage]?.booking_success || 'Taxi booked successfully!'}\n${state.selectedRoute.from} → ${state.selectedRoute.to}\nFare: R${fare.toFixed(2)}`);
}

// Share trip details
function shareTrip() {
    if (!state.selectedRoute) return;
    
    const shareData = {
        title: state.translations[state.currentLanguage]?.share_title || 'My Taxi Trip',
        text: `${state.translations[state.currentLanguage]?.share_text || 'I found this taxi route:'} ${state.selectedRoute.from} → ${state.selectedRoute.to}`,
        url: window.location.href
    };
    
    if (navigator.share) {
        navigator.share(shareData).catch(err => {
            console.log('Error sharing:', err);
        });
    } else {
        // Fallback for browsers without Web Share API
        const textArea = document.createElement('textarea');
        textArea.value = `${shareData.text}\n${shareData.url}`;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert(state.translations[state.currentLanguage]?.share_copied || 'Trip details copied to clipboard');
    }
}

// SOS functionality
function toggleSOS() {
    if (elements.sosButton.classList.contains('active')) {
        // Deactivate SOS
        elements.sosButton.classList.remove('active');
        console.log('SOS deactivated');
    } else {
        // Activate SOS
        elements.sosButton.classList.add('active');
        if (state.userLocation) {
            console.log(`SOS ACTIVATED at ${state.userLocation.lat},${state.userLocation.lng}`);
            // In a real app, this would send the location to emergency services
        } else {
            console.log('SOS ACTIVATED (location unknown)');
        }
        // Play alarm sound (would be implemented with a sound file)
    }
}

// Wallet management
function updateWalletDisplay() {
    elements.walletBalanceDisplay.textContent = state.walletBalance.toFixed(2);
}

function addFunds() {
    const amount = parseFloat(prompt(state.translations[state.currentLanguage]?.add_funds_prompt || 'Enter amount to add:', '50'));
    if (!isNaN(amount)) {
        state.walletBalance += amount;
        updateWalletDisplay();
    }
}

// Dark mode toggle
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    elements.darkModeToggle.textContent = isDark 
        ? '☀️ ' + (state.translations[state.currentLanguage]?.light_mode || 'Light Mode')
        : '🌙 ' + (state.translations[state.currentLanguage]?.dark_mode || 'Dark Mode');
    
    // Save preference to localStorage
    localStorage.setItem('darkMode', isDark);
}

// Check and apply dark mode preference
function checkDarkModePreference() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.body.classList.add('dark-mode');
        elements.darkModeToggle.textContent = '☀️ ' + (state.translations[state.currentLanguage]?.light_mode || 'Light Mode');
    }
}

// Online/offline status
function checkOfflineStatus() {
    state.offline = !navigator.onLine;
    updateOnlineStatus(state.offline);
}

function updateOnlineStatus(offline) {
    state.offline = offline;
    if (offline) {
        elements.offlineNotification.style.display = 'block';
        // In a real app, we would load cached data here
    } else {
        elements.offlineNotification.style.display = 'none';
    }
}

// Location services
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                state.userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                if (typeof map !== 'undefined') {
                    updateUserOnMap();
                }
            },
            error => {
                console.error('Geolocation error:', error);
            }
        );
    }
}

// Google Maps initialization
function initMap() {
    const defaultLocation = { lat: -28.4793, lng: 24.6727 }; // Center of South Africa
    map = new google.maps.Map(document.getElementById('map'), {
        center: defaultLocation,
        zoom: 6
    });
    
    if (state.userLocation) {
        updateUserOnMap();
    }
}

function updateUserOnMap() {
    if (userMarker) {
        userMarker.setPosition(state.userLocation);
        map.setCenter(state.userLocation);
    } else {
        userMarker = new google.maps.Marker({
            position: state.userLocation,
            map: map,
            title: 'Your Location'
        });
        map.setCenter(state.userLocation);
        map.setZoom(14);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Global variables for map and markers
let map;
let userMarker;

document.addEventListener('DOMContentLoaded', function() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Check for saved theme preference or use system preference
    const currentTheme = localStorage.getItem('theme') || 
                        (prefersDarkScheme.matches ? 'dark' : 'light');
    
    // Apply the theme
    if (currentTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      darkModeToggle.textContent = 'Light Mode';
    }
    
    // Toggle between themes
    darkModeToggle.addEventListener('click', function() {
      let theme;
      if (document.documentElement.getAttribute('data-theme') === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        theme = 'light';
        darkModeToggle.textContent = 'Dark Mode';
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        theme = 'dark';
        darkModeToggle.textContent = 'Light Mode';
      }
      localStorage.setItem('theme', theme);
    });
  });