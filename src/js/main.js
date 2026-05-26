import { state } from './state.js';
import { initCanvas } from './canvas.js';
import { performLocationSync, fetchLocationName, fetchRealAirData, analyzeAirWithGemini, searchLocation } from './api.js';

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
        
        clockEl.innerText = `${dateStr} ${timeStr}`;
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
                
                // 3. Gorgeous Translucent Color Legend
                const legend = L.control({ position: 'bottomleft' });
                legend.onAdd = function() {
                    const div = L.DomUtil.create('div', 'info legend p-3 bg-white/90 backdrop-blur-md rounded-xl text-[10px] font-semibold border border-g-grey-light flex flex-col gap-1.5 shadow-lg');
                    div.innerHTML = `
                        <div class="text-[9px] font-bold uppercase text-g-grey-dark mb-1 tracking-wider">AQI Heatmap Legend</div>
                        <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full" style="background:#009966"></span><span>Good (0-50)</span></div>
                        <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full" style="background:#ffde33"></span><span>Moderate (51-100)</span></div>
                        <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full" style="background:#ff9933"></span><span>Unhealthy Sensitive (101-150)</span></div>
                        <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full" style="background:#cc0033"></span><span>Unhealthy (151-200)</span></div>
                        <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full" style="background:#660099"></span><span>Very Unhealthy (201-300)</span></div>
                        <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full" style="background:#7e0023"></span><span>Hazardous (300+)</span></div>
                    `;
                    return div;
                };
                legend.addTo(map);

                marker = L.marker([state.currentLat, state.currentLon]).addTo(map);
                
                map.on('click', (e) => {
                    tempLat = e.latlng.lat;
                    tempLon = e.latlng.lng;
                    marker.setLatLng([tempLat, tempLon]);
                    if (confirmBtn) confirmBtn.disabled = false;
                });
            } else {
                map.invalidateSize();
                map.setView([state.currentLat, state.currentLon], 10);
                marker.setLatLng([state.currentLat, state.currentLon]);
                if (confirmBtn) confirmBtn.disabled = true;
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
            closeModal();
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
    startLiveClock(); // Initialize the live clock loop
    
    performLocationSync().then(startAutoSync);

    // Bind AI Profile Selector Buttons
    const profileBtns = document.querySelectorAll('.profile-btn');
    profileBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const profile = e.target.getAttribute('data-profile');
            if (state.userProfile === profile) return; // Ignore if already selected
            
            state.userProfile = profile;
            
            // Toggle active classes for UI feedback
            profileBtns.forEach(b => {
                b.className = 'profile-btn bg-white/5 text-g-grey-light border-white/10 hover:bg-white/10 px-4 py-1.5 rounded-full border text-xs font-semibold transition-colors';
            });
            e.target.className = 'profile-btn active bg-g-blue-medium text-white border-g-blue-medium px-4 py-1.5 rounded-full border text-xs font-semibold transition-colors shadow-sm';
            
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