import { state } from './state.js';
import { updateDateTime } from './utils.js';
import { updateUI, drawSparkline } from './ui.js';
import { setWeatherCondition } from './canvas.js';
import { updateAudioEnvironment } from './audio.js';

export async function fetchLocationName(lat, lon) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`;
        const response = await fetch(url, { headers: { 'Accept-Language': 'en-US,en;q=0.9' }});
        if (!response.ok) throw new Error("Gagal geocoding");
        const data = await response.json();
        
        if (data && data.address) {
            const address = data.address;
            const localArea = address.suburb || address.village || address.neighbourhood || address.town;
            const cityArea = address.city || address.municipality || address.county || address.state;
            if (localArea && cityArea) return `${localArea}, ${cityArea}`;
            else if (data.display_name) return data.display_name.split(',').slice(0, 2).join(',').trim();
        }
        return `LAT: ${lat.toFixed(4)} | LON: ${lon.toFixed(4)}`;
    } catch (error) {
        return `LAT: ${lat.toFixed(4)} | LON: ${lon.toFixed(4)}`; 
    }
}

export async function searchLocation(query, syncCallback) {
    const statusEl = document.getElementById('status-text');
    const pingSolid = document.getElementById('ping-solid');
    const searchContainer = document.getElementById('location-search-container');
    const locHeader = document.getElementById('location-header');
    const searchInput = document.getElementById('location-input');

    statusEl.innerHTML = "MENCARI LOKASI...";
    statusEl.classList.remove('text-g-blue-medium', 'text-g-red-medium');
    statusEl.classList.add('text-g-green-medium');
    document.getElementById('ping-dot').classList.remove('hidden'); 
    pingSolid.classList.remove('bg-g-blue-medium', 'bg-g-red-medium');
    pingSolid.classList.add('bg-g-green-medium');

    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
        const response = await fetch(url, { headers: { 'Accept-Language': 'en-US,en;q=0.9' }});
        if (!response.ok) throw new Error("Gagal mencari lokasi");
        const data = await response.json();

        if (data && data.length > 0) {
            state.currentLat = parseFloat(data[0].lat);
            state.currentLon = parseFloat(data[0].lon);
            
            let displayName = data[0].display_name.split(',').slice(0, 2).join(',').trim();
            document.getElementById('location-name').innerText = displayName;

            searchContainer.classList.add('hidden');
            searchContainer.classList.remove('flex');
            locHeader.classList.remove('hidden');
            searchInput.value = '';

            await fetchRealAirData(state.currentLat, state.currentLon);
            if (syncCallback) syncCallback(); // Restart background sync
        } else {
            throw new Error("Lokasi tidak ditemukan");
        }
    } catch (error) {
        console.error("Kesalahan pencarian:", error);
        statusEl.innerHTML = `PENCARIAN GAGAL <span class="text-g-grey/70 ml-1 font-sans text-[9px] sm:text-[10px] lowercase tracking-normal">(tidak ditemukan)</span>`;
        statusEl.classList.remove('text-g-green-medium', 'text-g-blue-medium');
        statusEl.classList.add('text-g-red-medium');
        document.getElementById('ping-dot').classList.add('hidden');
        pingSolid.classList.remove('bg-g-green-medium', 'bg-g-blue-medium');
        pingSolid.classList.add('bg-g-red-medium');
    }
}

export async function fetchRealAirData(lat, lon) {
    try {
        try {
            const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${state.API_KEY}&units=metric&lang=en`;
            const weatherRes = await fetch(weatherUrl);
            const weatherData = await weatherRes.json();
            
            if (weatherData && weatherData.weather) {
                state.currentTimezoneOffset = weatherData.timezone || 0;
                state.isTimezoneSet = true;
                updateDateTime(); // Immediately trigger local time refresh
                
                const condition = weatherData.weather[0].main; 
                const desc = weatherData.weather[0].description;
                const iconCode = weatherData.weather[0].icon; 
                const temp = Math.round(weatherData.main.temp);
                
                state.isDayTime = iconCode.includes('d');
                
                const body = document.getElementById('body-bg');
                if (state.isDayTime) {
                    body.classList.add('theme-day');
                } else {
                    body.classList.remove('theme-day');
                }

                const weatherIconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
                const weatherStatusEl = document.getElementById('weather-status');
                weatherStatusEl.innerHTML = `<img src="${weatherIconUrl}" alt="${desc}" class="w-6 h-6 sm:w-7 sm:h-7 object-contain drop-shadow-sm -ml-1 inline-block pointer-events-none" /> ${temp}°C | ${desc.toUpperCase()}`;
                
                weatherStatusEl.setAttribute('data-js-tooltip', `Kondisi: ${desc.charAt(0).toUpperCase() + desc.slice(1)}`);
                weatherStatusEl.removeAttribute('data-tooltip'); 
                weatherStatusEl.classList.add('cursor-help');
                
                setWeatherCondition(condition);
                updateAudioEnvironment();
            }
        } catch(e) {
            console.error("Gagal memuat cuaca saat ini", e);
        }

        try {
            const forecastUrl = `https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${state.API_KEY}`;
            const forecastRes = await fetch(forecastUrl);
            const forecastData = await forecastRes.json();
            if (forecastData && forecastData.list) {
                const next24hPollution = forecastData.list.slice(0, 24);
                drawSparkline(next24hPollution);
            }
        } catch(e) {
            console.error("Gagal memuat sparkline trend polusi", e);
        }

        try {
            const weatherForecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${state.API_KEY}&units=metric&lang=en`;
            const wfRes = await fetch(weatherForecastUrl);
            const wfData = await wfRes.json();

            if (wfData && wfData.list) {
                const forecastContainer = document.getElementById('weather-forecast-container');
                forecastContainer.innerHTML = ''; 
                const next24h = wfData.list.slice(0, 8);

                next24h.forEach(item => {
                    const date = new Date(item.dt * 1000);
                    const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                    
                    const fIconCode = item.weather[0].icon;
                    const fIconUrl = `https://openweathermap.org/img/wn/${fIconCode}@2x.png`;
                    
                    const weatherDesc = item.weather[0].description;
                    const formattedDesc = weatherDesc.charAt(0).toUpperCase() + weatherDesc.slice(1);

                    forecastContainer.innerHTML += `
                        <div data-js-tooltip="${formattedDesc}" class="flex flex-col items-center min-w-[65px] bg-g-grey-light/5 rounded-lg p-2 border border-g-grey-light/10 shrink-0 cursor-help">
                            <span class="text-[10px] text-g-grey pointer-events-none">${timeStr}</span>
                            <img src="${fIconUrl}" alt="${weatherDesc}" class="w-10 h-10 object-contain drop-shadow-md my-0.5 pointer-events-none" />
                            <span class="text-xs font-bold text-g-grey-light pointer-events-none">${Math.round(item.main.temp)}°</span>
                        </div>
                    `;
                });
            }
        } catch(e) {
            console.error("Gagal memuat ramalan cuaca", e);
        }
        
        try {
            const aqUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${state.API_KEY}`;
            const aqRes = await fetch(aqUrl);
            const aqData = await aqRes.json();
            
            if (aqData && aqData.list && aqData.list.length > 0) {
                updateUI(aqData.list[0]);
                
                let localSyncTime = new Date();
                let gmtString = '';
                if (state.isTimezoneSet) {
                    const utcTime = localSyncTime.getTime() + (localSyncTime.getTimezoneOffset() * 60000);
                    localSyncTime = new Date(utcTime + (state.currentTimezoneOffset * 1000));
                    const offsetHours = state.currentTimezoneOffset / 3600;
                    gmtString = ` GMT${offsetHours >= 0 ? '+' : ''}${offsetHours}`;
                }
                const syncTime = localSyncTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                
                const statusEl = document.getElementById('status-text');
                const pingSolid = document.getElementById('ping-solid');
                
                statusEl.innerHTML = `DATA SYNCED <span class="text-g-grey/70 ml-1 font-sans text-[9px] sm:text-[10px] lowercase tracking-normal">(terakhir: ${syncTime}${gmtString})</span>`;
                statusEl.classList.remove('text-g-green-medium', 'text-g-red-medium');
                statusEl.classList.add('text-g-blue-medium');
                
                document.getElementById('ping-dot').classList.add('hidden'); 
                
                pingSolid.classList.remove('bg-g-green-medium', 'bg-g-red-medium');
                pingSolid.classList.add('bg-g-blue-medium');
                
                updateAudioEnvironment();
            }
        } catch(e) {
            console.error("Gagal memuat kualitas udara", e);
        }

    } catch (error) {
        console.error("Kesalahan jaringan:", error);
        const statusEl = document.getElementById('status-text');
        const pingSolid = document.getElementById('ping-solid');
        
        statusEl.innerHTML = `SYNC FAILED <span class="text-g-grey/70 ml-1 font-sans text-[9px] sm:text-[10px] lowercase tracking-normal">(gagal memuat)</span>`;
        statusEl.classList.remove('text-g-green-medium', 'text-g-blue-medium');
        statusEl.classList.add('text-g-red-medium');
        
        document.getElementById('ping-dot').classList.add('hidden');
        
        pingSolid.classList.remove('bg-g-green-medium', 'bg-g-blue-medium');
        pingSolid.classList.add('bg-g-red-medium');
    }
}

async function fetchGeminiWithRetry(prompt, retries = 5) {
    const delays = [1000, 2000, 4000, 8000, 16000];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${state.GEMINI_API_KEY}`;
    
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { 
            parts: [{ text: "Anda adalah 'NAPAS AI', asisten ahli pernapasan di sebuah aplikasi cyberpunk/modern. Tugas Anda adalah memberikan analisis singkat dan sangat relevan tentang kualitas udara berdasarkan data sensor yang diberikan. Gunakan bahasa Indonesia yang santai, sedikit puitis atau berbau sci-fi, dan berikan satu saran praktis (misal: pakai masker, tutup jendela, atau aman untuk jogging). Maksimal 3 kalimat." }] 
        }
    };

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            return result.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, AI tidak dapat menghasilkan analisis saat ini.";
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(res => setTimeout(res, delays[i])); 
        }
    }
}

export async function analyzeAirWithGemini() {
    if (!state.latestAirQualityData) return;
    
    const btn = document.getElementById('btn-ai');
    const container = document.getElementById('ai-response-container');
    const loading = document.getElementById('ai-loading');
    const content = document.getElementById('ai-content');

    btn.classList.add('hidden');
    container.classList.remove('hidden');
    loading.classList.remove('hidden');
    loading.classList.add('flex');
    content.innerText = '';

    const data = state.latestAirQualityData;
    const locationText = document.getElementById('location-name').innerText;
    const promptData = `Tolong analisis kondisi udara di ${locationText} ini. Cuaca: ${state.currentWeather}. AQI: ${data.main.aqi} (Skala 1-5). PM2.5: ${data.components.pm2_5} µg/m³. CO: ${data.components.co} µg/m³. NO2: ${data.components.no2} µg/m³.`;

    try {
        const aiResponse = await fetchGeminiWithRetry(promptData);
        loading.classList.add('hidden');
        loading.classList.remove('flex');
        
        const geminiIconSvg = `<img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/google-gemini.svg" alt="Gemini Logo" class="w-4 h-4 inline-block mr-1 align-text-bottom" />`;
        
        content.innerHTML = `<p class="mb-2 font-bold opacity-80 flex items-center">${geminiIconSvg} Analisis NAPAS AI:</p>` + 
                            `<div class="opacity-90">` + 
                            aiResponse.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold opacity-100">$1</strong>') +
                            `</div>`;
    } catch (error) {
        loading.classList.add('hidden');
        loading.classList.remove('flex');
        content.innerHTML = `<p class="text-g-red-medium">Gagal terhubung ke jaringan saraf AI. Silakan coba lagi nanti.</p>`;
        btn.classList.remove('hidden'); 
    }
}