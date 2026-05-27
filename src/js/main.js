import { state } from './state.js';
import { initCanvas } from './canvas.js';
import { performLocationSync, fetchLocationName, fetchRealAirData, analyzeAirWithGemini, searchLocation } from './api.js';
import { initGlobalTooltip } from './utils.js';

const startAutoSync = () => {
    if (state.syncIntervalId) clearInterval(state.syncIntervalId);
    state.syncIntervalId = setInterval(async () => {
        await fetchRealAirData(state.currentLat, state.currentLon);
    }, 15 * 60 * 1000); 
};

// Starts a live ticking clock that matches the timezone of the searched location
function startLiveClock() {
    setInterval(() => {
        const clockEl = document.getElementById('local-time');
        if (!clockEl) return;
        
        let now = new Date();
        // Shift time to match the currently viewed location's timezone offset
        if (state.isTimezoneSet) {
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            now = new Date(utc + (state.currentTimezoneOffset * 1000));
        }
        
        const dateOpts = { month: 'short', day: 'numeric', year: 'numeric' };
        // Enforce 24-hour format with colons for strict readability
        const timeOpts = { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
        
        const dateStr = now.toLocaleDateString('en-US', dateOpts);
        const timeStr = now.toLocaleTimeString('en-US', timeOpts);
        
        clockEl.innerHTML = `<span>${dateStr}</span><span>${timeStr}</span>`;
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

function initApp() {
    initCanvas();
    initMapModal();
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

    // Bind AI Profile Selector Buttons
    const profileBtns = document.querySelectorAll('.profile-btn');
    profileBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const profile = e.target.getAttribute('data-profile');
            if (state.userProfile === profile) return; // Ignore if already selected
            
            state.userProfile = profile;
            
            // Toggle active classes for UI feedback (matching the tiny bento sizes)
            profileBtns.forEach(b => {
                b.className = 'profile-btn bg-white/5 text-g-grey-light border-white/10 hover:bg-white/10 px-2 py-0.5 rounded-full border text-[8px] font-semibold transition-colors';
            });
            e.target.className = 'profile-btn active bg-g-blue-medium text-white border-g-blue-medium px-2 py-0.5 rounded-full border text-[8px] font-semibold transition-colors shadow-sm';
            
            // Re-fetch the Gemini evaluation with the newly selected profile
            analyzeAirWithGemini();
        });
    });

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
}

window.addEventListener('DOMContentLoaded', initApp);