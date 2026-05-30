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

// Add Interactive Weather Hover Effect
function initWeatherHoverEffect() {
    const headerWeather = getEl('header-weather');
    if (!headerWeather) return;

    // Locate the Weather & Location widget card container safely
    let widget = headerWeather.closest('.shrink-0.mb-1\\.5');
    if (!widget && headerWeather.parentElement) {
        widget = headerWeather.parentElement.parentElement.parentElement;
    }
    if (!widget) return;

    // Ensure the widget can contain absolute positioned particles without clipping into other cards
    widget.style.position = 'relative';
    widget.style.overflow = 'hidden';
    widget.style.borderRadius = '0.75rem';

    let particleInterval;

    widget.addEventListener('mouseenter', () => {
        const weatherText = headerWeather.innerText.toLowerCase();
        let pType = '☀️', animType = 'float';
        
        if (weatherText.includes('rain') || weatherText.includes('drizzle')) { pType = '💧'; animType = 'fall'; }
        else if (weatherText.includes('snow')) { pType = '❄️'; animType = 'fall'; }
        else if (weatherText.includes('cloud') || weatherText.includes('haze') || weatherText.includes('mist')) { pType = '☁️'; animType = 'drift'; }
        else if (weatherText.includes('storm') || weatherText.includes('thunder')) { pType = '⚡'; animType = 'flash'; }

        particleInterval = setInterval(() => {
            const particle = document.createElement('div');
            particle.innerText = pType;
            particle.style.position = 'absolute';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '50';
            particle.style.opacity = '0.95';
            particle.style.fontSize = (Math.random() * 12 + 16) + 'px';
            
            if (animType === 'fall') {
                particle.style.left = (Math.random() * 100) + '%';
                particle.style.top = '-20px';
                particle.style.transition = 'top 1s cubic-bezier(0.4, 0, 1, 1), opacity 1s ease-in';
                widget.appendChild(particle);
                setTimeout(() => { particle.style.top = '100%'; particle.style.opacity = '0'; }, 20);
            } else if (animType === 'drift') {
                particle.style.top = (Math.random() * 80) + '%';
                particle.style.left = '-20px';
                particle.style.transition = 'left 2.5s linear, opacity 2.5s ease-in-out';
                widget.appendChild(particle);
                setTimeout(() => { particle.style.left = '100%'; particle.style.opacity = '0'; }, 20);
            } else if (animType === 'float') {
                particle.style.left = (Math.random() * 100) + '%';
                particle.style.top = '100%';
                particle.style.transition = 'top 1.5s ease-out, opacity 1.5s ease-out';
                widget.appendChild(particle);
                setTimeout(() => { particle.style.top = '-20px'; particle.style.opacity = '0'; }, 20);
            } else if (animType === 'flash') {
                particle.style.left = (Math.random() * 80 + 10) + '%';
                particle.style.top = (Math.random() * 50 + 10) + '%';
                particle.style.transition = 'opacity 0.3s ease-out';
                widget.appendChild(particle);
                setTimeout(() => { particle.style.opacity = '0'; }, 200);
            }

            setTimeout(() => { 
                if (particle.parentNode === widget) widget.removeChild(particle); 
            }, 2500);
        }, animType === 'flash' ? 350 : 120);
    });

    widget.addEventListener('mouseleave', () => {
        clearInterval(particleInterval);
    });
}

// Add Dynamic Particle Effect for AQI Widget
function startAQIParticles() {
    const aqiDisplay = getEl('aqi-display');
    if (!aqiDisplay) return;
    
    // Target the main wrapper of the AQI widget
    let widget = aqiDisplay.closest('.shrink-0.w-32');
    if (!widget) widget = aqiDisplay.parentElement.parentElement;
    
    widget.style.position = 'relative';
    widget.style.overflow = 'hidden';

    let particleInterval;
    let currentAqi = 0;

    function spawnParticle() {
        if (!state.latestAirQualityData || !state.latestAirQualityData.main) return;
        const aqi = state.latestAirQualityData.main.aqi;
        
        // Adjust particle density (spawn interval) dynamically if AQI changes
        if (aqi !== currentAqi) {
            currentAqi = aqi;
            clearInterval(particleInterval);
            // Higher AQI = Lower Interval (Faster Spawn / Higher Density)
            const spawnRate = Math.max(40, 500 - (aqi * 100)); 
            particleInterval = setInterval(spawnParticle, spawnRate);
        }

        const colors = {
            1: '#34A853', // Green
            2: '#FBBC04', // Yellow
            3: '#E37400', // Orange
            4: '#EA4335', // Red
            5: '#A50E0E'  // Dark Red
        };

        const particle = document.createElement('div');
        const size = Math.random() * 6 + 4; // 4px to 10px
        
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.backgroundColor = colors[aqi] || colors[1];
        particle.style.position = 'absolute';
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '10';
        particle.style.opacity = '0.95';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.bottom = '-10px';
        particle.style.boxShadow = `0 0 10px 2px ${colors[aqi] || colors[1]}`;
        
        // Random drift left or right
        const driftX = (Math.random() - 0.5) * 40;
        
        particle.style.transition = `transform ${Math.random() * 2 + 2}s ease-out, opacity ${Math.random() * 1.5 + 1}s ease-in-out`;
        
        widget.appendChild(particle);
        
        // Trigger upward float animation
        requestAnimationFrame(() => {
            particle.style.transform = `translate(${driftX}px, -120px) scale(${Math.random() * 1.5 + 0.5})`;
            particle.style.opacity = '0';
        });
        
        // Cleanup after animation completes
        setTimeout(() => {
            if (particle.parentNode === widget) {
                widget.removeChild(particle);
            }
        }, 4000);
    }

    // Start initial loop
    particleInterval = setInterval(spawnParticle, 1000);
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

        // Overlay WAQI Heatmap Tiles
        L.tileLayer('https://tiles.waqi.info/tiles/usepa-aqi/{z}/{x}/{y}.png?token=demo', {
            opacity: 0.65,
            attribution: 'Air Quality Heatmap &copy; <a href="https://waqi.info/">WAQI</a>'
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
            
            // Keep both main map and popup map perfectly in sync and centered
            if (window.mainMap && window.mainMarker) {
                window.mainMap.setView([state.currentLat, state.currentLon], 10);
                window.mainMarker.setLatLng([state.currentLat, state.currentLon]);
            }
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

        // Overlay WAQI Heatmap Tiles for the expanded view
        L.tileLayer('https://tiles.waqi.info/tiles/usepa-aqi/{z}/{x}/{y}.png?token=demo', {
            opacity: 0.65,
            attribution: 'Air Quality Heatmap &copy; <a href="https://waqi.info/">WAQI</a>'
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
            
            // Keep both main map and popup map perfectly in sync and centered
            if (window.mainMap && window.mainMarker) {
                window.mainMap.setView([state.currentLat, state.currentLon], 10);
                window.mainMarker.setLatLng([state.currentLat, state.currentLon]);
            }
            if (window.popupMap && window.popupMarker) {
                window.popupMap.setView([state.currentLat, state.currentLon], 10);
                window.popupMarker.setLatLng([state.currentLat, state.currentLon]);
            }
            
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
    initWeatherHoverEffect();
    startAQIParticles();
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

    const syncBtnPopup = getEl('btn-sync-gps-popup');
    if (syncBtnPopup) {
        syncBtnPopup.addEventListener('click', () => {
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

// Ensure the core UI logic strictly applies text-sm sizes to override any external class inconsistencies
export function updateWeatherUI_Fallback(weatherData) {
    if (!weatherData) return;

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
        const compassDirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const dir = compassDirs[Math.round(deg / 45) % 8];
        envWind.className = 'text-sm font-bold text-g-black leading-none cursor-help border-b border-dashed border-g-grey/20 pb-px';
        envWind.innerText = `${dir} ${speed.toFixed(1)} m/s`;
    }

    const envHumidity = getEl('env-humidity');
    if (envHumidity) {
        envHumidity.className = 'text-sm font-bold text-g-black leading-none cursor-help border-b border-dashed border-g-grey/20 pb-px';
        envHumidity.innerText = `${weatherData.current.humidity || 0}%`;
    }

    // STRICT OVERRIDE: Enforcing exact same classes as sibling widgets
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