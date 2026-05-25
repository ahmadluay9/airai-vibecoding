import { state } from './state.js';
import { updateDateTime, initGlobalTooltip, convertHTMLTooltips } from './utils.js';
import { initCanvas, animateParticles } from './canvas.js';
import { fetchLocationName, searchLocation, fetchRealAirData, analyzeAirWithGemini } from './api.js';
import { toggleAudio } from './audio.js';

// Setup global time tracking
setInterval(updateDateTime, 1000);
updateDateTime();

const startAutoSync = () => {
    if (state.syncIntervalId) clearInterval(state.syncIntervalId);
    state.syncIntervalId = setInterval(async () => {
        const statusEl = document.getElementById('status-text');
        const pingSolid = document.getElementById('ping-solid');
        
        statusEl.innerHTML = "BACKGROUND SYNCING...";
        statusEl.classList.remove('text-g-blue-medium', 'text-g-red-medium');
        statusEl.classList.add('text-g-green-medium');
        
        document.getElementById('ping-dot').classList.remove('hidden'); 
        
        pingSolid.classList.remove('bg-g-blue-medium', 'bg-g-red-medium');
        pingSolid.classList.add('bg-g-green-medium');
        
        await fetchRealAirData(state.currentLat, state.currentLon);
    }, 15 * 60 * 1000); 
};

function initApp() {
    initGlobalTooltip();
    convertHTMLTooltips();
    initCanvas();
    animateParticles();
    
    // Bind AI Action
    document.getElementById('btn-ai').addEventListener('click', analyzeAirWithGemini);
    
    // Bind Audio Action
    document.getElementById('btn-audio-toggle').addEventListener('click', toggleAudio);
    
    // Bind UI Events for the Search Location Feature
    const locHeader = document.getElementById('location-header');
    const searchContainer = document.getElementById('location-search-container');
    const searchInput = document.getElementById('location-input');
    const btnSearch = document.getElementById('btn-search');
    const btnCancelSearch = document.getElementById('btn-cancel-search');

    locHeader.addEventListener('click', () => {
        locHeader.classList.add('hidden');
        searchContainer.classList.remove('hidden');
        searchContainer.classList.add('flex');
        searchInput.focus();
    });

    btnCancelSearch.addEventListener('click', () => {
        searchContainer.classList.add('hidden');
        searchContainer.classList.remove('flex');
        locHeader.classList.remove('hidden');
        searchInput.value = '';
    });

    btnSearch.addEventListener('click', () => {
        if(searchInput.value.trim() !== '') searchLocation(searchInput.value, startAutoSync);
    });

    searchInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter' && searchInput.value.trim() !== '') searchLocation(searchInput.value, startAutoSync);
    });
    
    // Interactive Map Integration
    const mapModal = document.getElementById('map-modal');
    const btnMapToggle = document.getElementById('btn-map-toggle');
    const btnCloseMap = document.getElementById('btn-close-map');
    const btnCancelMap = document.getElementById('btn-cancel-map');
    const btnConfirmMap = document.getElementById('btn-confirm-map');
    
    let map = null;
    let mapMarker = null;
    let selectedLat = null;
    let selectedLon = null;

    const openMap = () => {
        mapModal.classList.remove('hidden');
        if (!map) {
            setTimeout(() => {
                map = L.map('map-view').setView([state.currentLat, state.currentLon], 10);
                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
                }).addTo(map);

                mapMarker = L.marker([state.currentLat, state.currentLon]).addTo(map);

                map.on('click', function(e) {
                    selectedLat = e.latlng.lat;
                    selectedLon = e.latlng.lng;
                    
                    if (mapMarker) map.removeLayer(mapMarker);
                    mapMarker = L.marker([selectedLat, selectedLon]).addTo(map);
                    btnConfirmMap.disabled = false;
                });
            }, 100);
        } else {
            setTimeout(() => {
                map.invalidateSize();
                map.setView([state.currentLat, state.currentLon], 10);
                if (mapMarker) map.removeLayer(mapMarker);
                mapMarker = L.marker([state.currentLat, state.currentLon]).addTo(map);
            }, 100);
        }
    };

    const closeMap = () => {
        mapModal.classList.add('hidden');
        selectedLat = null;
        selectedLon = null;
        btnConfirmMap.disabled = true;
    };

    if (btnMapToggle) btnMapToggle.addEventListener('click', openMap);
    if (btnCloseMap) btnCloseMap.addEventListener('click', closeMap);
    if (btnCancelMap) btnCancelMap.addEventListener('click', closeMap);
    
    if (btnConfirmMap) {
        btnConfirmMap.addEventListener('click', async () => {
            if (selectedLat && selectedLon) {
                state.currentLat = selectedLat;
                state.currentLon = selectedLon;
                
                searchContainer.classList.add('hidden');
                searchContainer.classList.remove('flex');
                locHeader.classList.remove('hidden');
                
                closeMap();
                
                const statusEl = document.getElementById('status-text');
                const pingSolid = document.getElementById('ping-solid');
                statusEl.innerHTML = "MENYINKRONKAN LOKASI...";
                statusEl.classList.remove('text-g-blue-medium', 'text-g-red-medium');
                statusEl.classList.add('text-g-green-medium');
                document.getElementById('ping-dot').classList.remove('hidden'); 
                pingSolid.classList.remove('bg-g-blue-medium', 'bg-g-red-medium');
                pingSolid.classList.add('bg-g-green-medium');

                document.getElementById('location-name').innerText = await fetchLocationName(state.currentLat, state.currentLon);
                await fetchRealAirData(state.currentLat, state.currentLon);
                startAutoSync();
            }
        });
    }

    // Initial Geolocation setup
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                state.currentLat = position.coords.latitude;
                state.currentLon = position.coords.longitude;
                document.getElementById('location-name').innerText = await fetchLocationName(state.currentLat, state.currentLon);
                await fetchRealAirData(state.currentLat, state.currentLon);
                startAutoSync(); 
            },
            async (err) => {
                console.warn('Geolocation ditolak/error, menggunakan lokasi default (Jakarta).');
                document.getElementById('location-name').innerText = "Jakarta (Default)";
                await fetchRealAirData(state.currentLat, state.currentLon);
                startAutoSync(); 
            }
        );
    } else {
        console.warn('Geolocation tidak didukung, menggunakan lokasi default (Jakarta).');
        document.getElementById('location-name').innerText = "Jakarta (Default)";
        fetchRealAirData(state.currentLat, state.currentLon).then(() => startAutoSync());
    }
}

window.onload = initApp;