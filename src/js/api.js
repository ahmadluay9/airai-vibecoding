import { state } from './state.js';
import { updateUI, drawSparkline } from './ui.js';
import { updateDateTime } from './utils.js';

// Helper to forcefully update the UI element directly during fetches
function updateApiStatusUI(statusMsg) {
    const apiStatusEl = document.getElementById('api-status');
    if (!apiStatusEl) return;
    
    if (statusMsg === 'Connected') {
        apiStatusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-g-green-medium"></span> <span class="text-g-green-medium">Secure Connection</span>`;
    } else {
        apiStatusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-g-yellow"></span> <span class="text-g-orange">${statusMsg}</span>`;
    }
}

export async function fetchLocationName(lat, lon) {
    if (!state.API_KEY || state.API_KEY === '') return `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`;
    
    try {
        // Replaced Nominatim with OpenWeatherMap Reverse Geocoding to prevent localhost blocks
        const res = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${state.API_KEY}`);
        const data = await res.json();
        if (data && data.length > 0) {
            return `${data[0].name}${data[0].state ? ', ' + data[0].state : ''}`;
        }
        return `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`;
    } catch(e) {
        return "GPS Location";
    }
}

export async function getIPLocationFallback() {
    try {
        const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
        const data = await res.json();
        return {
            lat: parseFloat(data.latitude),
            lon: parseFloat(data.longitude),
            name: `${data.city}, ${data.country}`
        };
    } catch(e) {
        return null;
    }
}

export async function safeFetch(url, mockData) {
    if (!state.API_KEY || state.API_KEY === '') {
        state.apiStatus = 'Demo (No Key)';
        updateApiStatusUI(state.apiStatus);
        return mockData; 
    }
    try {
        const res = await fetch(url);
        if (!res.ok) {
            state.apiStatus = 'Demo (Live API Failed)';
            updateApiStatusUI(state.apiStatus);
            return mockData;
        }
        const data = await res.json();
        // Using loose inequality (!=) perfectly handles both String and Number "200" responses
        if (data.cod && data.cod != 200) {
            state.apiStatus = 'Demo (Live API Failed)';
            updateApiStatusUI(state.apiStatus);
            return mockData; 
        }
        
        state.apiStatus = 'Connected';
        updateApiStatusUI(state.apiStatus);
        return data; 
    } catch (e) {
        state.apiStatus = 'Offline/Demo';
        updateApiStatusUI(state.apiStatus);
        return mockData;
    }
}

export async function fetchRealAirData(lat, lon) {
    // 1. Current Weather
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${state.API_KEY}&units=metric&lang=en`;
    const weatherData = await safeFetch(weatherUrl, { weather: [{main: 'Clouds', description: 'demo', icon:'03d'}], main: {temp: 28, humidity: 65}, wind: { speed: 3.5, deg: 180 }, timezone: 25200 });
    
    if (weatherData && weatherData.weather) {
        state.currentTimezoneOffset = weatherData.timezone || 0;
        state.isTimezoneSet = true;
        const condition = weatherData.weather[0].main; 
        const iconCode = weatherData.weather[0].icon;
        state.isDayTime = iconCode.includes('d');
        
        const headerWeather = document.getElementById('header-weather');
        if (headerWeather) {
            const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
            // Added a much stronger custom drop-shadow for the header icon
            headerWeather.innerHTML = `<img src="${iconUrl}" alt="${condition}" class="w-6 h-6 inline-block object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)] -mt-0.5 mr-1" /> ${Math.round(weatherData.main.temp)}°C <span class="mx-2 text-g-grey-light">|</span> ${weatherData.weather[0].description.toUpperCase()}`;
        }

        // --- Environmental Details Update (Now strictly using OpenWeatherMap native wind speed & direction) ---
        const windSpeed = weatherData.wind?.speed || 0;
        const windDeg = weatherData.wind?.deg || 0;

        const compassDirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const windDir = compassDirs[Math.round(windDeg / 45) % 8];
        const humidity = weatherData.main?.humidity || 0;
        
        // Fetch Live UV Index using the provided API endpoint
        let uvIndex = 0;
        try {
            const uvUrl = `https://uvindexapi.com/api/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=Auto`;
            const uvRes = await fetch(uvUrl);
            
            if (!uvRes.ok) throw new Error("UV API not reachable");
            const uvData = await uvRes.json();
            
            // Extract the UV Index from the "now" object
            if (uvData && uvData.now && uvData.now.uv_index !== undefined) {
                uvIndex = Math.round(uvData.now.uv_index);
            }
        } catch (e) {
            // Realistic fallback simulation if the UV API/Proxy is unavailable
            /*
            uvIndex = state.isDayTime && !['Rain', 'Thunderstorm'].includes(condition) 
                ? Math.min(Math.max(Math.round((weatherData.main.temp - 15) / 2.5 + Math.random() * 2), 0), 11) 
                : 0; 
            */
        }

        const envWind = document.getElementById('env-wind');
        if (envWind) envWind.innerText = `${windDir} ${windSpeed.toFixed(1)} m/s`;
        
        const envHumidity = document.getElementById('env-humidity');
        if (envHumidity) envHumidity.innerText = `${humidity}%`;
        
        const envUv = document.getElementById('env-uv');
        if (envUv) {
            envUv.innerText = uvIndex;
            envUv.className = `text-xl font-bold mt-1 ${uvIndex >= 8 ? 'text-g-red-medium' : (uvIndex >= 5 ? 'text-g-orange' : 'text-g-black')}`;
        }
    }

    // 2. Current Air Pollution
    const aqUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${state.API_KEY}`;
    const aqData = await safeFetch(aqUrl, { list: [{ main: { aqi: 3 }, components: { pm2_5: 45.1, pm10: 45.5, co: 3540, no2: 37.3, o3: 20, so2: 52.1 } }] });
    
    if (aqData && aqData.list && aqData.list.length > 0) {
        updateUI(aqData.list[0]);
        const localSyncTime = updateDateTime();
        const headerSync = document.getElementById('header-sync');
        if (headerSync) {
            const dateOpts = { month: 'short', day: 'numeric', year: 'numeric' };
            const timeOpts = { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
            const dateStr = localSyncTime.toLocaleDateString('en-US', dateOpts);
            const timeStr = localSyncTime.toLocaleTimeString('en-US', timeOpts);
            
            headerSync.innerText = `(Sync: ${dateStr} ${timeStr})`;
        }
    }
    
    // 3. Weather Forecast (24 Hours)
    const mockWfData = { list: Array.from({length: 8}).map((_, i) => ({ dt: Math.floor(Date.now()/1000) + i*10800, main: { temp: 28 + Math.cos(i)*3 }, weather: [{main: 'Clouds', description: 'clouds', icon: '03d'}] })) };
    const weatherForecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${state.API_KEY}&units=metric&lang=en`;
    const wfData = await safeFetch(weatherForecastUrl, mockWfData);

    if (wfData && wfData.list) {
        const forecastContainer = document.getElementById('weather-forecast-container');
        if (forecastContainer) {
            // Create a global tooltip element attached to the body to escape scrolling container clipping
            let tooltipEl = document.getElementById('global-forecast-tooltip');
            if (!tooltipEl) {
                tooltipEl = document.createElement('div');
                tooltipEl.id = 'global-forecast-tooltip';
                tooltipEl.className = 'fixed hidden bg-g-black text-g-grey-light text-[11px] font-medium py-1.5 px-2.5 rounded shadow-xl z-[9999] pointer-events-none transform -translate-x-1/2 -translate-y-full';
                document.body.appendChild(tooltipEl);
            }

            let forecastHTML = '';
            const next24h = wfData.list.slice(0, 8);

            next24h.forEach(item => {
                let localTime = new Date(item.dt * 1000);
                if (state.isTimezoneSet) {
                    const utcTime = localTime.getTime() + (localTime.getTimezoneOffset() * 60000);
                    localTime = new Date(utcTime + (state.currentTimezoneOffset * 1000));
                }
                const timeStr = localTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

                const fIconCode = item.weather[0].icon;
                const fIconUrl = `https://openweathermap.org/img/wn/${fIconCode}@2x.png`;
                const weatherDesc = item.weather[0].description;
                const formattedDesc = weatherDesc.charAt(0).toUpperCase() + weatherDesc.slice(1);

                forecastHTML += `
                    <div data-weather-desc="${formattedDesc}" class="flex flex-col items-center min-w-[70px] bg-[#F8F9FA] rounded-lg p-2 border border-g-grey-light shrink-0 cursor-help hover:bg-white transition-colors">
                        <span class="text-[10px] text-g-grey-dark pointer-events-none">${timeStr}</span>
                        <img src="${fIconUrl}" alt="${weatherDesc}" class="w-10 h-10 object-contain drop-shadow-[0_3px_5px_rgba(0,0,0,0.35)] my-0.5 pointer-events-none" />
                        <span class="text-xs font-bold text-g-black pointer-events-none">${Math.round(item.main.temp)}°</span>
                    </div>
                `;
            });
            
            forecastContainer.innerHTML = forecastHTML;

            // Use event delegation to show the tooltip floating above the cursor
            forecastContainer.onmousemove = (e) => {
                const target = e.target.closest('[data-weather-desc]');
                if (target) {
                    tooltipEl.innerText = target.getAttribute('data-weather-desc');
                    tooltipEl.style.left = e.clientX + 'px';
                    tooltipEl.style.top = (e.clientY - 15) + 'px'; // Position 15px above the mouse
                    tooltipEl.classList.remove('hidden');
                } else {
                    tooltipEl.classList.add('hidden');
                }
            };
            
            forecastContainer.onmouseleave = () => {
                tooltipEl.classList.add('hidden');
            };
        }
    }

    // 4. Air Pollution Forecast (Sparkline)
    const fcastAqUrl = `https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${state.API_KEY}`;
    const fcastAq = await safeFetch(fcastAqUrl, { list: Array(24).fill({components:{pm2_5: Math.random()*50+10}}) });
    if(fcastAq.list) drawSparkline(fcastAq.list.slice(0, 24));
}

export async function analyzeAirWithGemini() {
    if (!state.latestAirQualityData) return;
    
    const loading = document.getElementById('ai-loading');
    const contentBlock = document.getElementById('ai-content-block');
    if (loading) loading.classList.remove('hidden');
    if (contentBlock) contentBlock.classList.add('hidden');

    const data = state.latestAirQualityData;
    const locNameEl = document.getElementById('location-name');
    const locationText = locNameEl ? locNameEl.innerText : 'Unknown Location';
    const intlAqi = data.main.aqi;
    
    const promptData = `
        Acting as an AI Clinician Advisory system for an Air Hygiene Hub. 
        Analyze the air quality for: ${locationText}. Weather: ${state.currentWeather}. International AQI: ${intlAqi} (Scale 1-5). PM2.5: ${data.components.pm2_5} µg/m³. CO: ${data.components.co} µg/m³. 
        The user has requested personalized advice specifically tailored for this demographic/profile: ${state.userProfile}.
        
        Return ONLY a valid JSON string (do not use markdown formatting like \`\`\`json) with the following strictly named keys:
        {
          "digest": "A 2-sentence clinical summary of the atmosphere safety.",
          "personalizedAdvice": "Provide 2 or 3 highly specific, practical sentences of advice customized directly for the selected profile (${state.userProfile}) based on the current weather and pollutant data."
        }
    `;

    try {
        if (!state.GEMINI_API_KEY || state.GEMINI_API_KEY === '') throw new Error("Missing Gemini Key");

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${state.GEMINI_API_KEY}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptData }] }] })
        });
        
        if (!response.ok) throw new Error("API Error");
        const result = await response.json();
        let jsonStr = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiData = JSON.parse(jsonStr);

        document.getElementById('ai-digest').innerText = aiData.digest || 'Data processing error.';

        const personalizedBlock = document.getElementById('personalized-block');
        const personalizedText = document.getElementById('ai-personalized');
        const personalizedTitle = document.getElementById('personalized-title');
        
        if (personalizedBlock && personalizedText && personalizedTitle) {
            if (state.userProfile !== 'General') {
                personalizedBlock.classList.remove('hidden');
                personalizedTitle.innerText = `Guidance for ${state.userProfile}`;
                personalizedText.innerText = aiData.personalizedAdvice || 'No targeted advice available at this time.';
            } else {
                personalizedBlock.classList.add('hidden');
            }
        }

        if (loading) loading.classList.add('hidden');
        if (contentBlock) contentBlock.classList.remove('hidden');
        
    } catch (error) {
        if (loading) loading.classList.add('hidden');
        if (contentBlock) contentBlock.classList.remove('hidden');
        
        const digestEl = document.getElementById('ai-digest');
        if (digestEl) digestEl.innerText = 'AI Advisory is currently operating in manual observation mode. (Demo Mode)';

        const personalizedBlock = document.getElementById('personalized-block');
        const personalizedText = document.getElementById('ai-personalized');
        const personalizedTitle = document.getElementById('personalized-title');

        if (personalizedBlock && personalizedText && personalizedTitle) {
            if (state.userProfile !== 'General') {
                personalizedBlock.classList.remove('hidden');
                personalizedTitle.innerText = `Guidance for ${state.userProfile}`;
                personalizedText.innerHTML = `<strong>[Simulated Advisory]</strong> Ensure individuals in the <strong>${state.userProfile}</strong> category avoid prolonged outdoor exposure. Add a valid Gemini API key to generate live, context-aware analysis specific to this profile.`;
            } else {
                personalizedBlock.classList.add('hidden');
            }
        }
    }
}

export async function performLocationSync() {
    const locNameEl = document.getElementById('location-name');
    if (locNameEl) locNameEl.innerText = "Locating via GPS...";
    
    const getPos = () => new Promise((resolve, reject) => {
        if(!navigator.geolocation) reject(new Error("No Geolocation"));
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
    });

    try {
        const pos = await getPos();
        state.currentLat = pos.coords.latitude;
        state.currentLon = pos.coords.longitude;
        if (locNameEl) locNameEl.innerText = await fetchLocationName(state.currentLat, state.currentLon);
    } catch(e) {
        const ipLoc = await getIPLocationFallback();
        if (ipLoc) {
            state.currentLat = ipLoc.lat;
            state.currentLon = ipLoc.lon;
            if (locNameEl) locNameEl.innerText = ipLoc.name + " (IP Approx)";
        } else {
            if (locNameEl) locNameEl.innerText = "Jakarta (Default Fallback)";
        }
    }

    await fetchRealAirData(state.currentLat, state.currentLon);
    analyzeAirWithGemini();
}

export async function searchLocation(query, syncCallback) {
    const searchInput = document.getElementById('location-input');

    if (!state.API_KEY || state.API_KEY === '') {
        alert("An OpenWeather API Key is required to search locations.");
        return;
    }

    try {
        // Replaced Nominatim with OpenWeatherMap Geocoding API to bypass localhost/CORS blocking
        const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${state.API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Search Request Failed");
        const data = await response.json();

        if (data && data.length > 0) {
            state.currentLat = parseFloat(data[0].lat);
            state.currentLon = parseFloat(data[0].lon);
            
            let displayName = `${data[0].name}${data[0].state ? ', ' + data[0].state : ''}`;
            const locNameEl = document.getElementById('location-name');
            if (locNameEl) locNameEl.innerText = displayName;

            if (searchInput) searchInput.value = '';

            await fetchRealAirData(state.currentLat, state.currentLon);
            if (syncCallback) syncCallback(); 
            analyzeAirWithGemini();
        } else {
            throw new Error("Location not found");
        }
    } catch (error) {
        console.error("Search Error:", error);
        alert("Location not found. Please try a different search term.");
    }
}