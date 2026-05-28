import { state } from './state.js';
import { initCanvas } from './canvas.js';
import { performLocationSync, fetchLocationName, fetchRealAirData, analyzeAirWithGemini, searchLocation } from './api.js';
import { initGlobalTooltip } from './utils.js';
import { renderPM25Sparkline, renderWeatherForecast } from './ui.js';

const startAutoSync = () => {
    if (state.syncIntervalId) clearInterval(state.syncIntervalId);
    state.syncIntervalId = setInterval(async () => {
        await fetchRealAirData(state.currentLat, state.currentLon);
        analyzeAirWithGemini(); // FIXED: Force AI advisory to regenerate with the newly synced data
    }, 15 * 60 * 1000); 
};

// Starts a live ticking clock that matches the timezone of the searched location
function startLiveClock() {
    setInterval(() => {
        const clockEl = document.getElementById('local-time');
        if (!clockEl) return;
        
        const now = new Date();
        const dateOpts = { month: 'short', day: 'numeric', year: 'numeric' };
        // Enforce 24-hour format with colons for strict readability
        const timeOpts = { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
        
        if (state.isTimezoneSet) {
            // FIXED: Safely calculate target local time by mapping to UTC, bypassing the browser's local DST rules
            const targetTime = new Date(now.getTime() + (state.currentTimezoneOffset * 1000));
            dateOpts.timeZone = 'UTC';
            timeOpts.timeZone = 'UTC';
            
            const dateStr = targetTime.toLocaleDateString('en-US', dateOpts);
            const timeStr = targetTime.toLocaleTimeString('en-US', timeOpts);
            clockEl.innerHTML = `<span>${dateStr}</span><span>${timeStr}</span>`;
        } else {
            const dateStr = now.toLocaleDateString('en-US', dateOpts);
            const timeStr = now.toLocaleTimeString('en-US', timeOpts);
            clockEl.innerHTML = `<span>${dateStr}</span><span>${timeStr}</span>`;
        }
    }, 1000);
}

function initMapModal() {
    const modal = document.getElementById('map-modal');
    const openBtn = document.getElementById('btn-map-toggle');
    const closeBtn = document.getElementById('btn-close-map');
    const cancelBtn = document.getElementById('btn-cancel-map');
    const confirmBtn = document.getElementById('btn-confirm-map');
    
    let map, marker;
    let tempLat = state.currentLat, tempLon = state.currentLon;

    const openModal = () => {
        if (modal) modal.classList.remove('hidden');
        setTimeout(() => {
            if(!map) {
                if (typeof L === 'undefined') return;
                
                // Inject custom style to shrink leaflet attribution and avoid overlap
                if (!document.getElementById('leaflet-custom-style')) {
                    const style = document.createElement('style');
                    style.id = 'leaflet-custom-style';
                    style.innerHTML = '.leaflet-control-attribution { font-size: 7px !important; background: rgba(255,255,255,0.5) !important; backdrop-filter: blur(2px); line-height: 1.2 !important; padding: 0 4px !important; border-top-left-radius: 4px; }';
                    document.head.appendChild(style);
                }
                
                // Initialize main leaflet map
                map = L.map('map-view').setView([state.currentLat, state.currentLon], 10);
                
                // 1. Street Base Layer (Neutral light theme so the heatmap colors pop)
                L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
                }).addTo(map);
                
                // 2. AQI Pollution Heatmap Overlay (USEPA Standard tiles)
                const pollutionOverlay = L.tileLayer('https://tiles.waqi.info/tiles/usepa-aqi/{z}/{x}/{y}.png?token=demo', {
                    attribution: 'Air Quality Tiles &copy; <a href="https://waqi.info" target="_blank">WAQI</a>',
                    opacity: 0.65,
                    zIndex: 100
                }).addTo(map);
                
                // 3. Compact & Translucent Color Legend
                const legend = L.control({ position: 'bottomleft' });
                legend.onAdd = function() {
                    const div = L.DomUtil.create('div', 'info legend p-1 bg-white/30 hover:bg-white/95 transition-all duration-300 backdrop-blur-sm rounded-md text-[7px] text-g-black font-medium border border-white/40 flex flex-col gap-0.5 shadow-sm mb-5 ml-1 cursor-default pointer-events-auto');
                    div.innerHTML = `
                        <div class="text-[6px] font-bold uppercase text-g-grey-dark tracking-wider mb-0.5">AQI Legend</div>
                        <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:#009966"></span><span class="leading-none">Good (0-50)</span></div>
                        <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:#ffde33"></span><span class="leading-none">Mod. (51-100)</span></div>
                        <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:#ff9933"></span><span class="leading-none">Unhealthy Sens. (101-150)</span></div>
                        <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:#cc0033"></span><span class="leading-none">Unhealthy (151-200)</span></div>
                        <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:#660099"></span><span class="leading-none">V. Unhealthy (201-300)</span></div>
                        <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:#7e0023"></span><span class="leading-none">Hazardous (300+)</span></div>
                    `;
                    return div;
                };
                legend.addTo(map);

                marker = L.marker([state.currentLat, state.currentLon]).addTo(map);
                
                map.on('click', (e) => {
                    tempLat = e.latlng.lat;
                    tempLon = e.latlng.lng;
                    marker.setLatLng([tempLat, tempLon]);
                    if (confirmBtn) {
                        confirmBtn.disabled = false;
                        confirmBtn.classList.remove('opacity-0', 'pointer-events-none');
                    }
                });
            } else {
                map.invalidateSize();
                map.setView([state.currentLat, state.currentLon], 10);
                marker.setLatLng([state.currentLat, state.currentLon]);
                if (confirmBtn) {
                    confirmBtn.disabled = true;
                    confirmBtn.classList.add('opacity-0', 'pointer-events-none');
                }
            }
        }, 100);
    };

    const closeModal = () => {
        if (modal) modal.classList.add('hidden');
    };

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            state.currentLat = tempLat;
            state.currentLon = tempLon;
            
            // Hide selection button
            confirmBtn.disabled = true;
            confirmBtn.classList.add('opacity-0', 'pointer-events-none');
            
            const locName = document.getElementById('location-name');
            if (locName) locName.innerText = "Locating on Map...";
            if (locName) locName.innerText = await fetchLocationName(tempLat, tempLon);
            await fetchRealAirData(tempLat, tempLon);
            analyzeAirWithGemini();
        });
    }
}

function initAiModal() {
    const aiModal = document.getElementById('ai-modal');
    const btnAiPopup = document.getElementById('btn-ai-popup');
    const btnCloseAi = document.getElementById('btn-close-ai');
    const aiModalBody = document.getElementById('ai-modal-body');
    const modalProfileSelector = document.getElementById('modal-profile-selector');
    const mainProfileSelector = document.getElementById('profile-selector');

    if (btnAiPopup && aiModal && btnCloseAi && aiModalBody) {
        const refreshModalContent = () => {
            const digestHtml = document.getElementById('ai-digest')?.innerHTML || '';
            const personalizedHtml = document.getElementById('ai-personalized')?.innerHTML || '';
            const profileName = mainProfileSelector?.value || 'General';
            const isPersonalizedHidden = document.getElementById('personalized-block')?.classList.contains('hidden');

            let modalHtml = `
                <div class="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
                    <h3 class="text-[10px] font-bold text-g-blue-medium tracking-widest uppercase mb-2">Safety Digest</h3>
                    <div class="text-g-grey-light text-xs sm:text-sm leading-relaxed font-medium">${digestHtml}</div>
                </div>
            `;

            if (!isPersonalizedHidden && personalizedHtml) {
                modalHtml += `
                    <div class="bg-g-blue-medium/10 border border-g-blue-medium/20 rounded-xl p-4 sm:p-5">
                        <h3 class="text-xs sm:text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                            <span class="text-g-blue-light text-base leading-none">🎯</span> Guidance for ${profileName}
                        </h3>
                        <div class="text-xs sm:text-sm text-g-grey-light leading-relaxed">${personalizedHtml}</div>
                    </div>
                `;
            }

            aiModalBody.innerHTML = modalHtml;
            
            if (modalProfileSelector && modalProfileSelector.value !== profileName) {
                modalProfileSelector.value = profileName;
            }
        };

        const openAiModal = () => {
            refreshModalContent();
            
            aiModal.classList.remove('hidden');
            // Force reflow for CSS transition
            void aiModal.offsetWidth;
            aiModal.classList.remove('opacity-0');
            document.getElementById('ai-modal-content')?.classList.remove('scale-95');
        };

        const closeAiModal = () => {
            aiModal.classList.add('opacity-0');
            document.getElementById('ai-modal-content')?.classList.add('scale-95');
            setTimeout(() => {
                aiModal.classList.add('hidden');
            }, 300); // match transition-duration duration-300
        };

        btnAiPopup.addEventListener('click', openAiModal);
        btnCloseAi.addEventListener('click', closeAiModal);
        
        // Close on clicking backdrop
        aiModal.addEventListener('click', (e) => {
            if (e.target === aiModal) closeAiModal();
        });

        // Listen for AI content updates emitted by api.js
        window.addEventListener('ai-updated', () => {
            if (!aiModal.classList.contains('hidden')) {
                refreshModalContent();
            }
        });

        // Sync Modal selector changing
        if (modalProfileSelector) {
            modalProfileSelector.addEventListener('change', (e) => {
                const profile = e.target.value;
                if (state.userProfile === profile) return;
                
                state.userProfile = profile;
                
                // Keep the background UI selector up-to-date
                if (mainProfileSelector) mainProfileSelector.value = profile;

                // Provide instant loading state visually in the modal
                aiModalBody.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-12">
                        <svg class="animate-spin h-8 w-8 text-g-blue-medium mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span class="text-g-blue-light text-xs font-medium tracking-wide">Synthesizing for ${profile}...</span>
                    </div>
                `;

                analyzeAirWithGemini();
            });
        }
    }
}

function initApp() {
    initCanvas();
    initMapModal();
    initAiModal();
    initGlobalTooltip(); 
    startLiveClock(); 
    
    const mapToggle = document.getElementById('btn-map-toggle');
    
    // Initial map load trigger
    setTimeout(() => { if (mapToggle) mapToggle.click(); }, 800);
    
    // Observe live GPS coordinate changes to actively re-center the widget map
    const latEl = document.getElementById('geo-lat');
    if (latEl) {
        const observer = new MutationObserver(() => {
            if (mapToggle) mapToggle.click();
        });
        observer.observe(latEl, { childList: true, characterData: true, subtree: true });
    }

    performLocationSync().then(startAutoSync);

    // Bind AI Profile Selector Dropdown
    const profileSelector = document.getElementById('profile-selector');
    if (profileSelector) {
        profileSelector.addEventListener('change', (e) => {
            const profile = e.target.value;
            if (state.userProfile === profile) return;
            
            state.userProfile = profile;
            
            // Sync the modal selector if it's rendered
            const modalProfileSelector = document.getElementById('modal-profile-selector');
            if (modalProfileSelector) modalProfileSelector.value = profile;
            
            // Re-fetch the Gemini evaluation with the newly selected profile
            analyzeAirWithGemini();
        });
    }

    // Bind Pollutant Selector Dropdown
    const pollutantSelector = document.getElementById('pollutant-selector');
    if (pollutantSelector) {
        pollutantSelector.addEventListener('change', (e) => {
            state.selectedPollutant = e.target.value;
            renderPM25Sparkline(); // Re-renders chart with new pollutant
        });
    }

    const btnSync = document.getElementById('btn-sync-gps');
    if (btnSync) {
        btnSync.addEventListener('click', () => {
            performLocationSync().then(startAutoSync);
        });
    }
    
    const searchInput = document.getElementById('location-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && searchInput.value.trim() !== '') {
                searchLocation(searchInput.value, startAutoSync);
            }
        });
    }

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const city = e.target.innerText;
            if (searchInput) searchInput.value = city;
            searchLocation(city, startAutoSync);
        });
    });

    // Weather Forecast Toggles
    const btn24h = document.getElementById('toggle-24h');
    const btn5d = document.getElementById('toggle-5d');

    if (btn24h && btn5d) {
        btn24h.addEventListener('click', () => {
            state.forecastMode = '24h';
            state.selectedDayIndex = null; // Reset drill-down
            btn24h.className = 'px-2.5 py-0.5 text-[8px] font-bold rounded-full bg-white shadow-sm text-g-black transition-all';
            btn5d.className = 'px-2.5 py-0.5 text-[8px] font-bold rounded-full text-g-grey hover:text-g-black transition-all bg-transparent';
            renderWeatherForecast();
        });

        btn5d.addEventListener('click', () => {
            state.forecastMode = '5d';
            state.selectedDayIndex = null; // Reset drill-down
            btn5d.className = 'px-2.5 py-0.5 text-[8px] font-bold rounded-full bg-white shadow-sm text-g-black transition-all';
            btn24h.className = 'px-2.5 py-0.5 text-[8px] font-bold rounded-full text-g-grey hover:text-g-black transition-all bg-transparent';
            renderWeatherForecast();
        });
    }

    const backBtn = document.getElementById('btn-forecast-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            state.selectedDayIndex = null;
            renderWeatherForecast();
        });
    }

    // Chart Toggles
    const togglePm25_24h = document.getElementById('pm25-toggle-24h');
    const togglePm25_5d = document.getElementById('pm25-toggle-5d');

    if (togglePm25_24h && togglePm25_5d) {
        togglePm25_24h.addEventListener('click', () => {
            state.pm25ForecastMode = '24h';
            togglePm25_24h.className = 'px-2 py-0.5 text-[8px] font-bold rounded-full bg-white shadow-sm text-g-black transition-all';
            togglePm25_5d.className = 'px-2 py-0.5 text-[8px] font-bold rounded-full text-g-grey hover:text-g-black transition-all bg-transparent';
            renderPM25Sparkline();
        });

        togglePm25_5d.addEventListener('click', () => {
            state.pm25ForecastMode = '5d';
            togglePm25_5d.className = 'px-2 py-0.5 text-[8px] font-bold rounded-full bg-white shadow-sm text-g-black transition-all';
            togglePm25_24h.className = 'px-2 py-0.5 text-[8px] font-bold rounded-full text-g-grey hover:text-g-black transition-all bg-transparent';
            renderPM25Sparkline();
        });
    }
}

window.addEventListener('DOMContentLoaded', initApp);