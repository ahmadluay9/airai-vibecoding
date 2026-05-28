import { state } from './state.js';
import { updateUI, drawSparkline, renderWeatherForecast, renderPM25Sparkline } from './ui.js';
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

// Helper to gracefully move AI API Status above the Profile Selectors
function updateAiApiStatus(message, isError = false) {
    const selectors = ['profile-selector', 'modal-profile-selector'];
    
    selectors.forEach(selectorId => {
        const selector = document.getElementById(selectorId);
        if (selector && selector.parentElement && selector.parentElement.parentNode) {
            let statusEl = document.getElementById(`ai-api-status-banner-${selectorId}`);
            if (!statusEl) {
                statusEl = document.createElement('div');
                statusEl.id = `ai-api-status-banner-${selectorId}`;
                selector.parentElement.parentNode.insertBefore(statusEl, selector.parentElement);
            }
            
            if (!message) {
                statusEl.innerHTML = '';
            } else {
                const textColor = isError ? 'text-g-red-light/70' : 'text-g-green-light/70';
                statusEl.innerHTML = `<span class="block text-[9px] font-mono ${textColor} mb-1.5">API Status: ${message}</span>`;
            }
        }
    });
}

export async function fetchLocationName(lat, lon) {
    if (!state.API_KEY || state.API_KEY === '') return `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`;
    
    try {
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
            headerWeather.innerHTML = `<img src="${iconUrl}" alt="${condition}" class="w-6 h-6 inline-block object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)] -mt-0.5 mr-1" /> ${Math.round(weatherData.main.temp)}°C <span class="mx-2 text-g-grey-light">|</span> ${weatherData.weather[0].description.toUpperCase()}`;
        }

        const windSpeed = weatherData.wind?.speed || 0;
        const windDeg = weatherData.wind?.deg || 0;

        const compassDirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const windDir = compassDirs[Math.round(windDeg / 45) % 8];
        const humidity = weatherData.main?.humidity || 0;
        
        const feelsLike = weatherData.main?.feels_like || 0;
        const pressure = weatherData.main?.pressure || 0;
        const visibility = weatherData.visibility || 0;
        const sunrise = weatherData.sys?.sunrise || 0;
        const sunset = weatherData.sys?.sunset || 0;

        let uvIndex = 0;
        try {
            const uvUrl = `https://uvindexapi.com/api/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=Auto`;
            const uvRes = await fetch(uvUrl);
            
            if (!uvRes.ok) throw new Error("UV API not reachable");
            const uvData = await uvRes.json();
            
            if (uvData && uvData.now && uvData.now.uv_index !== undefined) {
                uvIndex = Math.round(uvData.now.uv_index);
            }
        } catch (e) {
            // Realistic fallback simulation activated if the free UV API/Proxy limits out
            uvIndex = state.isDayTime && !['Rain', 'Thunderstorm', 'Drizzle'].includes(condition) 
                ? Math.min(Math.max(Math.round((weatherData.main.temp - 15) / 2.5 + Math.random() * 2), 0), 11) 
                : 0; 
        }

        const envWind = document.getElementById('env-wind');
        if (envWind) {
            envWind.innerText = `${windDir} ${windSpeed.toFixed(1)} m/s`;
            let windLevel = windSpeed < 5 ? "light (0-5 m/s)" : (windSpeed <= 10 ? "moderate (5-10 m/s)" : "strong (>10 m/s)");
            envWind.setAttribute('data-js-tooltip', `Wind: ${windSpeed.toFixed(1)} m/s<br><span class='text-[10px] text-g-grey'>Level: ${windLevel}</span>`);
        }
        
        const envHumidity = document.getElementById('env-humidity');
        if (envHumidity) {
            envHumidity.innerText = `${humidity}%`;
            let humLevel = humidity < 30 ? "dry (<30%)" : (humidity <= 50 ? "comfortable (30-50%)" : (humidity <= 70 ? "moderate (50-70%)" : "high (>70%)"));
            envHumidity.setAttribute('data-js-tooltip', `Humidity: ${humidity}%<br><span class='text-[10px] text-g-grey'>Level: ${humLevel}</span>`);
        }
        
        const envFeelsLike = document.getElementById('env-feels-like');
        if (envFeelsLike) {
            envFeelsLike.innerText = `${Math.round(feelsLike)}°C`;
            let tempLevel = feelsLike < 15 ? "cold (<15°C)" : (feelsLike <= 25 ? "comfortable (15-25°C)" : (feelsLike <= 32 ? "warm (25-32°C)" : "hot (>32°C)"));
            envFeelsLike.setAttribute('data-js-tooltip', `Feels Like: ${Math.round(feelsLike)}°C<br><span class='text-[10px] text-g-grey'>Level: ${tempLevel}</span>`);
        }
        
        const envPressure = document.getElementById('env-pressure');
        if (envPressure) {
            envPressure.innerText = `${pressure} hPa`;
            let pressLevel = pressure < 1000 ? "low (<1000 hPa)" : (pressure <= 1020 ? "normal (1000-1020 hPa)" : "high (>1020 hPa)");
            envPressure.setAttribute('data-js-tooltip', `Pressure: ${pressure} hPa<br><span class='text-[10px] text-g-grey'>Level: ${pressLevel}</span>`);
        }
        
        const envVisibility = document.getElementById('env-visibility');
        if (envVisibility) {
            let visKm = visibility / 1000;
            envVisibility.innerText = `${visKm.toFixed(1)} km`;
            let visLevel = visKm < 5 ? "poor (<5 km)" : (visKm <= 10 ? "good (5-10 km)" : "excellent (>10 km)");
            envVisibility.setAttribute('data-js-tooltip', `Visibility: ${visKm.toFixed(1)} km<br><span class='text-[10px] text-g-grey'>Level: ${visLevel}</span>`);
        }

        const envSunrise = document.getElementById('env-sunrise');
        if (envSunrise && sunrise) {
            let sunriseDate = new Date(sunrise * 1000);
            if (state.isTimezoneSet) {
                sunriseDate = new Date(sunriseDate.getTime() + (sunriseDate.getTimezoneOffset() * 60000) + (state.currentTimezoneOffset * 1000));
            }
            const sunriseTime = sunriseDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            envSunrise.innerText = sunriseTime;
            envSunrise.setAttribute('data-js-tooltip', `Sunrise Time<br><span class='text-[10px] text-g-grey'>Local timezone</span>`);
        }

        const envSunset = document.getElementById('env-sunset');
        if (envSunset && sunset) {
            let sunsetDate = new Date(sunset * 1000);
            if (state.isTimezoneSet) {
                sunsetDate = new Date(sunsetDate.getTime() + (sunsetDate.getTimezoneOffset() * 60000) + (state.currentTimezoneOffset * 1000));
            }
            const sunsetTime = sunsetDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            envSunset.innerText = sunsetTime;
            envSunset.setAttribute('data-js-tooltip', `Sunset Time<br><span class='text-[10px] text-g-grey'>Local timezone</span>`);
        }

        const envUv = document.getElementById('env-uv');
        if (envUv) {
            envUv.innerText = uvIndex;
            envUv.className = `text-xs font-bold leading-none cursor-help border-b border-dashed border-g-grey/60 pb-px ${uvIndex >= 8 ? 'text-g-red-medium' : (uvIndex >= 5 ? 'text-g-orange' : 'text-g-black')}`;
            let uvLevel = uvIndex <= 2 ? "low (0-2)" : (uvIndex <= 5 ? "moderate (3-5)" : (uvIndex <= 7 ? "high (6-7)" : (uvIndex <= 10 ? "very high (8-10)" : "extreme (11+)")));
            envUv.setAttribute('data-js-tooltip', `UV Index: ${uvIndex}<br><span class='text-[10px] text-g-grey'>Level: ${uvLevel}</span>`);
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
            const timeOpts = { hour12: false, hour: '2-digit', minute: '2-digit' }; 
            const dateStr = localSyncTime.toLocaleDateString('en-US', dateOpts);
            const timeStr = localSyncTime.toLocaleTimeString('en-US', timeOpts);
            
            headerSync.innerText = `${dateStr} ${timeStr}`;
        }
    }
    
    // 3. Weather Forecast (24 Hours & 5 Days Integration)
    const mockWfData = { list: Array.from({length: 40}).map((_, i) => ({ dt: Math.floor(Date.now()/1000) + i*10800, main: { temp: 28 + Math.cos(i)*3 }, weather: [{main: 'Clouds', description: 'clouds', icon: '03d'}] })) };
    const weatherForecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${state.API_KEY}&units=metric&lang=en`;
    const wfData = await safeFetch(weatherForecastUrl, mockWfData);

    if (wfData && wfData.list) {
        // Feed the precise 24-hour array natively
        state.weatherForecastData24h = wfData.list.slice(0, 8);
        
        // Group by local day for 5-day forecast extraction
        const dailyData = {};
        wfData.list.forEach(item => {
            let localTime = new Date(item.dt * 1000);
            if (state.isTimezoneSet) {
                const utcTime = localTime.getTime() + (localTime.getTimezoneOffset() * 60000);
                localTime = new Date(utcTime + (state.currentTimezoneOffset * 1000));
            }
            const dateStr = localTime.toLocaleDateString('en-US'); 
            
            if (!dailyData[dateStr]) {
                dailyData[dateStr] = { items: [], date: localTime };
            }
            dailyData[dateStr].items.push(item);
        });

        state.weatherForecastData5d = Object.values(dailyData).slice(0, 5).map(day => {
            const maxTempItem = day.items.reduce((max, item) => item.main.temp > max.main.temp ? item : max, day.items[0]);
            const minTempItem = day.items.reduce((min, item) => item.main.temp < min.main.temp ? item : min, day.items[0]);
            
            return {
                dt: maxTempItem.dt, 
                temp: { max: maxTempItem.main.temp, min: minTempItem.main.temp },
                weather: maxTempItem.weather,
                dateObj: day.date,
                rawItems: day.items // Retain the 3-hour chunks to power the drill-down view
            };
        });

        // Triggers UI repaint with newly compiled arrays
        renderWeatherForecast();
    }

    // 4. Air Pollution Forecast (Sparkline) - Upgraded to 5D Support
    const fcastAqUrl = `https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${state.API_KEY}`;
    const mockAqData = { 
        list: Array.from({length: 120}).map((_, i) => ({ 
            dt: Math.floor(Date.now() / 1000) + (i * 3600), 
            components: { 
                pm2_5: 12 + Math.sin(i/4) * 10 + Math.random() * 5,
                pm10: 25 + Math.sin(i/4) * 15 + Math.random() * 8,
                co: 400 + Math.sin(i/4) * 200 + Math.random() * 50,
                no2: 20 + Math.sin(i/4) * 10 + Math.random() * 4,
                o3: 45 + Math.sin(i/4) * 25 + Math.random() * 10,
                so2: 15 + Math.sin(i/4) * 8 + Math.random() * 3
            } 
        })) 
    };
    
    const fcastAq = await safeFetch(fcastAqUrl, mockAqData);
    if(fcastAq && fcastAq.list) {
        state.pm25ForecastData24h = fcastAq.list.slice(0, 24);
        
        // Group by local day for 5-day forecast extraction (Daily Max per pollutant)
        const dailyAqData = {};
        fcastAq.list.forEach(item => {
            let localTime = new Date((item.dt || 0) * 1000);
            if (state.isTimezoneSet) {
                const utcTime = localTime.getTime() + (localTime.getTimezoneOffset() * 60000);
                localTime = new Date(utcTime + (state.currentTimezoneOffset * 1000));
            }
            const dateStr = localTime.toLocaleDateString('en-US'); 
            
            if (!dailyAqData[dateStr]) {
                dailyAqData[dateStr] = { items: [], date: localTime };
            }
            dailyAqData[dateStr].items.push(item);
        });

        state.pm25ForecastData5d = Object.values(dailyAqData).slice(0, 5).map(day => {
            // Find the maximum value for each individual pollutant across the day's readings
            const maxComponents = { pm2_5: 0, pm10: 0, co: 0, no2: 0, o3: 0, so2: 0 };
            day.items.forEach(item => {
                if (item.components) {
                    Object.keys(maxComponents).forEach(key => {
                        maxComponents[key] = Math.max(maxComponents[key], item.components[key] || 0);
                    });
                }
            });

            return {
                dt: day.items[0].dt, 
                components: maxComponents,
                dateObj: day.date
            };
        });

        if (typeof renderPM25Sparkline === 'function') {
            renderPM25Sparkline();
        } else {
            drawSparkline(state.pm25ForecastData24h);
        }
    }
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
    const comps = data.components;
    
    // Extract current UI values dynamically to align AI awareness with User View
    const envWind = document.getElementById('env-wind')?.innerText || 'N/A';
    const envHumidity = document.getElementById('env-humidity')?.innerText || 'N/A';
    const envUv = document.getElementById('env-uv')?.innerText || 'N/A';
    
    let envTemp = 'N/A';
    const headerWeatherEl = document.getElementById('header-weather');
    if (headerWeatherEl) {
        // Simple regex to extract just the temp text (e.g., "28°C | CLOUDS")
        envTemp = headerWeatherEl.innerText.trim();
    }

    // Generate succinct 24H Weather Summary
    let forecastWeatherSummary = "Not available.";
    if (state.weatherForecastData24h && state.weatherForecastData24h.length > 0) {
        const temps = state.weatherForecastData24h.map(item => item.main.temp);
        const maxTemp = Math.max(...temps).toFixed(1);
        const minTemp = Math.min(...temps).toFixed(1);
        const conditions = [...new Set(state.weatherForecastData24h.map(item => item.weather[0].description))].join(', ');
        forecastWeatherSummary = `Temperatures ranging from ${minTemp}°C to ${maxTemp}°C. Expected conditions: ${conditions}.`;
    }

    // Generate succinct 24H PM2.5 Forecast Summary
    let forecastPm25Summary = "Not available.";
    if (state.pm25ForecastData24h && state.pm25ForecastData24h.length > 0) {
        const pm25s = state.pm25ForecastData24h.map(item => item.components.pm2_5);
        const maxPm25 = Math.max(...pm25s).toFixed(1);
        const minPm25 = Math.min(...pm25s).toFixed(1);
        forecastPm25Summary = `PM2.5 levels will fluctuate between ${minPm25} and ${maxPm25} µg/m³ over the next 24 hours.`;
    }
    
    // Define the strict structured output schema based on the Gemini REST documentation
    const schema = {
        type: "OBJECT",
        properties: {
            digest: {
                type: "STRING",
                description: "A 2-sentence clinical summary of the current and upcoming atmospheric safety."
            },
            personalizedAdvice: {
                type: "STRING",
                description: "Provide 2 or 3 highly specific, practical sentences of advice customized directly for the selected profile."
            },
            safeWindow: {
                type: "STRING",
                description: "Identify the safest 2-3 hour window for outdoor activities in the next 24 hours based on the trends."
            },
            actionChecklist: {
                type: "ARRAY",
                items: { type: "STRING" },
                description: "Array of 1-3 short, specific actions (e.g., 'Wear an N95 mask', 'Turn on HEPA purifier')"
            },
            pollutantContext: {
                type: "STRING",
                description: "Identify the worst pollutant right now and explain in 1 sentence what might be causing it based on the wind/weather."
            }
        },
        required: ["digest", "personalizedAdvice", "safeWindow", "actionChecklist", "pollutantContext"]
    };

    const promptData = `
        Acting as an AI Clinician Advisory system for an Air Hygiene Hub. 
        Analyze the environmental data for: ${locationText}.
        
        [CURRENT CONDITIONS]
        Weather: ${envTemp}, Wind: ${envWind}, Humidity: ${envHumidity}, UV Index: ${envUv}
        Overall AQI (1-5 scale): ${intlAqi}
        Current Pollutants (µg/m³): PM2.5: ${comps.pm2_5}, PM10: ${comps.pm10}, CO: ${comps.co}, NO2: ${comps.no2}, O3: ${comps.o3}, SO2: ${comps.so2}.
        
        [24-HOUR OUTLOOK]
        Weather Trend: ${forecastWeatherSummary}
        PM2.5 Trend: ${forecastPm25Summary}
        
        The user has requested personalized advice specifically tailored for this demographic/profile: ${state.userProfile}.
        
        Based on ALL provided current and forecasted data, generate a clinical safety digest and tailored advice.
    `;

    try {
        if (!state.GEMINI_API_KEY || state.GEMINI_API_KEY === '') throw new Error("Missing Gemini Key");

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${state.GEMINI_API_KEY}`;
        
        const requestBody = {
            contents: [{ parts: [{ text: promptData }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        let result;
        try {
            result = await response.json();
        } catch (e) {
            throw new Error(`[${response.status}] ${response.statusText}`);
        }
        
        if (!response.ok) {
            const errorMsg = result.error?.message || response.statusText || "API Error";
            throw new Error(`[${response.status}] ${errorMsg}`);
        }

        let jsonStr = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiData = JSON.parse(jsonStr);

        // Safely insert API status banner above the selector (only if non-200)
        if (response.status !== 200) {
            updateAiApiStatus(response.status, false);
        } else {
            updateAiApiStatus(null, false);
        }

        const digestEl = document.getElementById('ai-digest');
        if (digestEl) {
            digestEl.innerHTML = aiData.digest || 'Data processing error.';
        }

        const personalizedBlock = document.getElementById('personalized-block');
        const personalizedText = document.getElementById('ai-personalized');
        const personalizedTitle = document.getElementById('personalized-title');
        
        if (personalizedBlock && personalizedText && personalizedTitle) {
            if (state.userProfile !== 'General') {
                personalizedBlock.classList.remove('hidden');
                personalizedTitle.innerText = `Guidance for ${state.userProfile}`;
                
                // Format the rich HTML output for the new AI parameters
                let adviceHTML = `<p class="mb-2 leading-relaxed text-white font-medium">${aiData.personalizedAdvice || 'No targeted advice available at this time.'}</p>`;
                
                if (aiData.pollutantContext) {
                    adviceHTML += `<p class="mb-2 opacity-90"><strong class="text-g-blue-light">Primary Pollutant:</strong> ${aiData.pollutantContext}</p>`;
                }
                if (aiData.safeWindow) {
                    adviceHTML += `<p class="mb-2 opacity-90"><strong class="text-g-green-light">Optimal Time Window:</strong> ${aiData.safeWindow}</p>`;
                }
                if (aiData.actionChecklist && aiData.actionChecklist.length > 0) {
                    adviceHTML += `<p class="text-g-blue-light font-bold mt-3 mb-1">Recommended Actions:</p><ul class="list-disc pl-4 space-y-1 opacity-90 text-[9.5px]">`;
                    aiData.actionChecklist.forEach(action => {
                        adviceHTML += `<li>${action}</li>`;
                    });
                    adviceHTML += `</ul>`;
                }
                
                personalizedText.innerHTML = adviceHTML;
            } else {
                personalizedBlock.classList.add('hidden');
            }
        }

        if (loading) loading.classList.add('hidden');
        if (contentBlock) contentBlock.classList.remove('hidden');
        
        // Notify the application that AI content has been successfully updated
        window.dispatchEvent(new Event('ai-updated'));
        
    } catch (error) {
        if (loading) loading.classList.add('hidden');
        if (contentBlock) contentBlock.classList.remove('hidden');
        
        updateAiApiStatus(error.message, true);

        const digestEl = document.getElementById('ai-digest');
        if (digestEl) {
            digestEl.innerHTML = `AI Advisory is currently operating in manual observation mode. (Demo Mode)`;
        }

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
        
        // Notify the application even on simulated/failed updates
        window.dispatchEvent(new Event('ai-updated'));
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