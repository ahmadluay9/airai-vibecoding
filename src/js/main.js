import { state } from './state.js';
import { initCanvas } from './canvas.js';
import { initGlobalTooltip, convertHTMLTooltips, getEl } from './utils.js';
import { 
    performLocationSync, 
    analyzeAirWithGemini, 
    searchLocation, 
    fetchRealAirData, 
    fetchLocationName, 
    replayTTS 
} from './api.js';
import { renderWeatherForecast, renderPM25Sparkline } from './ui.js';

// Helper to calculate general wind directions from degrees
function getWindDirection(deg) {
    const compassDirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return compassDirs[Math.round(deg / 45) % 8];
}

// Global auto-sync timer
function startAutoSync() {
    if (state.syncIntervalId) clearInterval(state.syncIntervalId);
    state.syncIntervalId = setInterval(() => {
        performLocationSync();
    }, 300000); // Trigger reload every 5 minutes
}

// Global Clock function to update time dynamically based on the searched timezone
function updateClock() {
    const timeEl = getEl('local-time');
    if (!timeEl) return;

    const now = new Date();
    let targetDate = now;

    // Adjust the clock if we have fetched timezone offset data for the active city
    if (state.isTimezoneSet && state.currentTimezoneOffset !== undefined) {
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
        targetDate = new Date(utcTime + (state.currentTimezoneOffset * 1000));
    }

    const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    const timeOptions = { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };

    const dateStr = targetDate.toLocaleDateString('en-US', dateOptions);
    const timeStr = targetDate.toLocaleTimeString('en-US', timeOptions);

    // Creates the split layout (Date on left, Time on right) matching the flexbox parent
    timeEl.innerHTML = `<span>${dateStr}</span><span>${timeStr}</span>`;
}

// Update primary current weather cards
export function updateWeatherUI(weatherData) {
    if (!weatherData) return;

    // Render basic current weather parameters
    const temp = Math.round(weatherData.current.temp);
    const weatherDesc = weatherData.current.weather[0].description;
    const formattedDesc = weatherDesc.charAt(0).toUpperCase() + weatherDesc.slice(1);
    const headerWeather = getEl('header-weather');
    if (headerWeather) {
        headerWeather.innerHTML = `
            <img src="https://openweathermap.org/img/wn/${weatherData.current.weather[0].icon}.png" class="w-6 h-6 object-contain inline-block" alt="${weatherDesc}" />
            ${temp}°C &nbsp;|&nbsp; ${formattedDesc}
        `;
    }

    const envWind = getEl('env-wind');
    if (envWind) {
        const deg = weatherData.current.wind_deg || 0;
        const speed = weatherData.current.wind_speed || 0;
        const dir = getWindDirection(deg);
        envWind.className = 'text-sm font-bold text-g-black leading-none cursor-help border-b border-dashed border-g-grey/20 pb-px';
        envWind.innerText = `${dir} ${speed.toFixed(1)} m/s`;
    }

    const envHumidity = getEl('env-humidity');
    if (envHumidity) {
        envHumidity.className = 'text-sm font-bold text-g-black leading-none cursor-help border-b border-dashed border-g-grey/20 pb-px';
        envHumidity.innerText = `${weatherData.current.humidity || 0}%`;
    }

    // Dynamic UV Index styling utilizing standardized text-sm font classes
    const envUv = getEl('env-uv');
    if (envUv) {
        const uvi = weatherData.current.uvi || 0;
        let uvClass = 'text-g-green-medium';
        if (uvi >= 8) uvClass = 'text-g-red';
        else if (uvi >= 6) uvClass = 'text-g-orange';
        else if (uvi >= 3) uvClass = 'text-g-yellow';
        
        envUv.className = `text-sm font-bold ${uvClass} leading-none cursor-help border-b border-dashed border-g-grey/20 pb-px`;
        envUv.innerText = Math.round(uvi);
    }

    // Dynamic Feels Like styling utilizing standardized text-sm font classes
    const envFeelsLike = getEl('env-feels-like');
    if (envFeelsLike) {
        const feelsLike = weatherData.current.feels_like || 0;
        envFeelsLike.className = 'text-sm font-bold text-g-black leading-none cursor-help border-b border-dashed border-g-grey/20 pb-px';
        envFeelsLike.innerText = `${Math.round(feelsLike)}°C`;
    }

    const envPressure = getEl('env-pressure');
    if (envPressure) {
        envPressure.className = 'text-sm font-bold text-g-black leading-none cursor-help border-b border-dashed border-g-grey/20 pb-px';
        envPressure.innerText = `${weatherData.current.pressure || 0} hPa`;
    }

    const envVisibility = getEl('env-visibility');
    if (envVisibility) {
        const visKm = (weatherData.current.visibility || 0) / 1000;
        envVisibility.className = 'text-sm font-bold text-g-black leading-none cursor-help border-b border-dashed border-g-grey/20 pb-px';
        envVisibility.innerText = `${visKm.toFixed(1)} km`;
    }

    // Process Sunrise & Sunset Time correctly
    const envSunrise = getEl('env-sunrise');
    const envSunset = getEl('env-sunset');
    if (envSunrise && envSunset) {
        let sunriseLocal = new Date((weatherData.current.sunrise || 0) * 1000);
        let sunsetLocal = new Date((weatherData.current.sunset || 0) * 1000);

        if (state.isTimezoneSet) {
            const utcSunrise = sunriseLocal.getTime() + (sunriseLocal.getTimezoneOffset() * 60000);
            sunriseLocal = new Date(utcSunrise + (state.currentTimezoneOffset * 1000));

            const utcSunset = sunsetLocal.getTime() + (sunsetLocal.getTimezoneOffset() * 60000);
            sunsetLocal = new Date(utcSunset + (state.currentTimezoneOffset * 1000));
        }

        envSunrise.className = 'text-sm font-bold text-g-black leading-none cursor-help border-b border-dashed border-g-grey/20 pb-px';
        envSunset.className = 'text-sm font-bold text-g-black leading-none cursor-help border-b border-dashed border-g-grey/20 pb-px';
        envSunrise.innerText = sunriseLocal.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        envSunset.innerText = sunsetLocal.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    }
}

// Leaflet Inline Map Initialization (exposed to window so api.js can update it on search)
function initMap() {
    const mapContainer = getEl('map-view');
    if (mapContainer && !window.mainMap) {
        // Use current coordinates for mapping target
        window.mainMap = L.map('map-view', {
            zoomControl: true
        }).setView([state.currentLat, state.currentLon], 10);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(window.mainMap);

        window.mainMarker = L.marker([state.currentLat, state.currentLon]).addTo(window.mainMap);

        window.mainMap.on('click', (e) => {
            const { lat, lng } = e.latlng;
            window.mainMarker.setLatLng([lat, lng]);
            state.currentLat = lat;
            state.currentLon = lng;
            getEl('btn-confirm-map').disabled = false;
        });

        // Handle selected location confirmation
        getEl('btn-confirm-map').addEventListener('click', async () => {
            getEl('btn-confirm-map').disabled = true;
            const locNameEl = getEl('location-name');
            if (locNameEl) locNameEl.innerText = "Fetching selected location...";
            const displayName = await fetchLocationName(state.currentLat, state.currentLon);
            if (locNameEl) locNameEl.innerText = displayName;
            
            if (window.popupMap && window.popupMarker) {
                window.popupMap.setView([state.currentLat, state.currentLon], 10);
                window.popupMarker.setLatLng([state.currentLat, state.currentLon]);
            }
            
            await fetchRealAirData(state.currentLat, state.currentLon);
            analyzeAirWithGemini();
        });
    }

    const popupMapContainer = getEl('popup-map-view');
    if (popupMapContainer && !window.popupMap) {
        window.popupMap = L.map('popup-map-view', {
            zoomControl: true
        }).setView([state.currentLat, state.currentLon], 10);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(window.popupMap);

        window.popupMarker = L.marker([state.currentLat, state.currentLon]).addTo(window.popupMap);

        window.popupMap.on('click', (e) => {
            const { lat, lng } = e.latlng;
            window.popupMarker.setLatLng([lat, lng]);
            state.currentLat = lat;
            state.currentLon = lng;
            getEl('btn-confirm-popup-map').disabled = false;
        });

        getEl('btn-confirm-popup-map').addEventListener('click', async () => {
            getEl('btn-confirm-popup-map').disabled = true;
            const locNameEl = getEl('location-name');
            if (locNameEl) locNameEl.innerText = "Fetching selected location...";
            const displayName = await fetchLocationName(state.currentLat, state.currentLon);
            if (locNameEl) locNameEl.innerText = displayName;
            
            // Keep main map in sync
            if (window.mainMap && window.mainMarker) {
                window.mainMap.setView([state.currentLat, state.currentLon], 10);
                window.mainMarker.setLatLng([state.currentLat, state.currentLon]);
            }
            
            getEl('btn-close-map-popup')?.click(); // Auto-close modal
            await fetchRealAirData(state.currentLat, state.currentLon);
            analyzeAirWithGemini();
        });
        
        // Listen to map popup input separately if needed
        const popupLocationInput = getEl('popup-location-input');
        if (popupLocationInput) {
            popupLocationInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    searchLocation(popupLocationInput.value, () => {});
                }
            });
        }
    }
}

// Setup Popups and AI Cognitive Report Modals
function initModals() {
    const aiPopupBtn = getEl('btn-ai-popup');
    const aiModal = getEl('ai-modal');
    const aiModalContent = getEl('ai-modal-content');
    const closeAiBtn = getEl('btn-close-ai');

    if (aiPopupBtn && aiModal) {
        aiPopupBtn.addEventListener('click', () => {
            const digestCard = getEl('ai-digest')?.parentElement;
            const personalizedCard = getEl('personalized-block');
            const modalBody = getEl('ai-modal-body');

            if (modalBody) {
                modalBody.innerHTML = '';
                if (digestCard) {
                    const cloneDigest = digestCard.cloneNode(true);
                    cloneDigest.className = "bg-white/5 border border-[#3c4043] rounded-xl p-4";
                    modalBody.appendChild(cloneDigest);
                }
                if (personalizedCard && !personalizedCard.classList.contains('hidden')) {
                    const clonePersonalized = personalizedCard.cloneNode(true);
                    clonePersonalized.classList.remove('hidden');
                    clonePersonalized.className = "bg-g-blue-medium/10 border border-[#3c4043] rounded-xl p-4 mt-4";
                    modalBody.appendChild(clonePersonalized);
                }
            }

            aiModal.classList.remove('hidden');
            setTimeout(() => {
                aiModal.style.opacity = '1';
                if (aiModalContent) aiModalContent.style.transform = 'scale(1)';
            }, 50);
        });
    }

    if (closeAiBtn && aiModal) {
        closeAiBtn.addEventListener('click', () => {
            aiModal.style.opacity = '0';
            if (aiModalContent) aiModalContent.style.transform = 'scale(0.95)';
            setTimeout(() => {
                aiModal.classList.add('hidden');
            }, 300);
        });
    }

    // Map Popup Modal
    const mapPopupBtn = getEl('btn-map-popup');
    const mapPopupModal = getEl('map-popup-modal');
    const closeMapPopupBtn = getEl('btn-close-map-popup');

    if (mapPopupBtn && mapPopupModal) {
        mapPopupBtn.addEventListener('click', () => {
            mapPopupModal.classList.remove('hidden');
            setTimeout(() => {
                mapPopupModal.style.opacity = '1';
                getEl('map-popup-content').style.transform = 'scale(1)';
            }, 50);
            // Invalidate/Re-render map layout sizing in modal view
            setTimeout(() => {
                if (window.popupMap) {
                    window.popupMap.invalidateSize();
                }
            }, 300);
        });
    }

    if (closeMapPopupBtn && mapPopupModal) {
        closeMapPopupBtn.addEventListener('click', () => {
            mapPopupModal.style.opacity = '0';
            getEl('map-popup-content').style.transform = 'scale(0.95)';
            setTimeout(() => {
                mapPopupModal.classList.add('hidden');
            }, 300);
        });
    }
}

// Master Initialization Event on DOM Load
window.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initGlobalTooltip();
    convertHTMLTooltips();
    initMap();
    initModals();

    // Setup and start real-time local clock loop
    setInterval(updateClock, 1000);
    updateClock(); // Call instantly so we don't wait 1 second for render

    // Setup profile selectors
    const profileSelector = getEl('profile-selector');
    const modalProfileSelector = getEl('modal-profile-selector');
    if (profileSelector) {
        profileSelector.addEventListener('change', (e) => {
            state.userProfile = e.target.value;
            if (modalProfileSelector) modalProfileSelector.value = state.userProfile;
            analyzeAirWithGemini();
        });
    }
    if (modalProfileSelector) {
        modalProfileSelector.addEventListener('change', (e) => {
            state.userProfile = e.target.value;
            if (profileSelector) profileSelector.value = state.userProfile;
            analyzeAirWithGemini();
        });
    }

    // Setup search triggers
    const searchInput = getEl('location-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchLocation(searchInput.value, startAutoSync);
            }
        });
    }

    const syncBtn = getEl('btn-sync-gps');
    if (syncBtn) {
        syncBtn.addEventListener('click', () => {
            performLocationSync();
        });
    }

    // Weather Forecast Toggles
    const btn24h = getEl('toggle-24h');
    const btn5d = getEl('toggle-5d');
    const btnForecastBack = getEl('btn-forecast-back'); // The back button from drill-down

    if (btn24h && btn5d) {
        btn24h.addEventListener('click', () => {
            state.forecastMode = '24h';
            state.selectedDayIndex = null; // Reset drill-down
            btn24h.className = 'px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#3c4043] shadow-sm text-white transition-all';
            btn5d.className = 'px-2.5 py-0.5 text-xs font-bold rounded-full text-g-grey-dark hover:text-g-black transition-all bg-transparent';
            renderWeatherForecast();
        });

        btn5d.addEventListener('click', () => {
            state.forecastMode = '5d';
            state.selectedDayIndex = null; // Reset drill-down
            btn5d.className = 'px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#3c4043] shadow-sm text-white transition-all';
            btn24h.className = 'px-2.5 py-0.5 text-xs font-bold rounded-full text-g-grey-dark hover:text-g-black transition-all bg-transparent';
            renderWeatherForecast();
        });
    }

    // Handle "Back" click from 5-day daily detail view
    if (btnForecastBack) {
        btnForecastBack.addEventListener('click', () => {
            state.selectedDayIndex = null; // Clear the selected day
            renderWeatherForecast();       // Re-render to show the 5-day overview
        });
    }

    // Chart Toggles
    const togglePm25_24h = getEl('pm25-toggle-24h');
    const togglePm25_5d = getEl('pm25-toggle-5d');

    if (togglePm25_24h && togglePm25_5d) {
        togglePm25_24h.addEventListener('click', () => {
            state.pm25ForecastMode = '24h';
            togglePm25_24h.className = 'px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#3c4043] shadow-sm text-white transition-all';
            togglePm25_5d.className = 'px-2.5 py-0.5 text-xs font-bold rounded-full text-g-grey-dark hover:text-g-black transition-all bg-transparent';
            renderPM25Sparkline();
        });

        togglePm25_5d.addEventListener('click', () => {
            state.pm25ForecastMode = '5d';
            togglePm25_5d.className = 'px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#3c4043] shadow-sm text-white transition-all';
            togglePm25_24h.className = 'px-2.5 py-0.5 text-xs font-bold rounded-full text-g-grey-dark hover:text-g-black transition-all bg-transparent';
            renderPM25Sparkline();
        });
    }

    // Pollutant Dropdown Selector
    const pollutantSelector = getEl('pollutant-selector');
    if (pollutantSelector) {
        pollutantSelector.addEventListener('change', (e) => {
            state.selectedPollutant = e.target.value;
            renderPM25Sparkline();
        });
    }

    // Setup TTS audio triggers
    const playTtsBtn = getEl('btn-ai-play-tts');
    const modalPlayTtsBtn = getEl('btn-modal-ai-play-tts');
    if (playTtsBtn) {
        playTtsBtn.addEventListener('click', replayTTS);
    }
    if (modalPlayTtsBtn) {
        modalPlayTtsBtn.addEventListener('click', replayTTS);
    }

    // Perform initial boot location sync
    performLocationSync();
    startAutoSync();
});