import { state } from './state.js';
import { getAQIColorAndLabel, getEl } from './utils.js';

export function updateUI(data) {
    state.latestAirQualityData = { main: data.main, components: data.components };
    
    const aqi = data.main.aqi;
    const aqiInfo = getAQIColorAndLabel(aqi);
    
    // Update Maps with Dynamic AQI Radial Heatmap
    if (window.mainMap && state.currentLat) {
        if (window.mainMapCircle) window.mainMapCircle.remove();
        window.mainMapCircle = L.circle([state.currentLat, state.currentLon], {
            color: aqiInfo.color,
            fillColor: aqiInfo.color,
            fillOpacity: 0.35,
            weight: 2,
            radius: 12000 // 12km radius visual
        }).addTo(window.mainMap);
    }
    
    if (window.popupMap && state.currentLat) {
        if (window.popupMapCircle) window.popupMapCircle.remove();
        window.popupMapCircle = L.circle([state.currentLat, state.currentLon], {
            color: aqiInfo.color,
            fillColor: aqiInfo.color,
            fillOpacity: 0.35,
            weight: 2,
            radius: 20000 // 20km expanded radius visual
        }).addTo(window.popupMap);
    }

    // AQI Gauge (scale out of 5)
    const offset = 125.6 - (125.6 * Math.min(aqi, 5) / 5);
    const gaugePath = getEl('aqi-gauge-path');
    if(gaugePath) {
        gaugePath.style.strokeDashoffset = offset;
        gaugePath.style.stroke = aqiInfo.color;
    }
    
    // Updated AQI Level with a drop shadow
    const aqiDisplay = getEl('aqi-display');
    if (aqiDisplay) {
        aqiDisplay.innerText = aqi;
        aqiDisplay.className = `text-2xl font-black ${aqiInfo.text} leading-none tracking-tighter drop-shadow-md`;
    }
    
    // Updated AQI Status pill with swapped background and font colors
    const aqiLabel = getEl('aqi-label');
    if (aqiLabel) {
        aqiLabel.innerText = aqiInfo.label;
        const bgClass = (aqiInfo.text || 'text-g-green-medium').replace('text-', 'bg-');
        const textClass = bgClass.includes('yellow') ? 'text-g-black' : 'text-white';
        aqiLabel.className = `text-xs font-bold ${textClass} mt-3 ${bgClass} px-4 py-1 rounded-full shadow-sm`;
    }

    const aqiDetailsContainer = getEl('aqi-details-container');
    const aqiDescription = getEl('aqi-description');
    const aqiAdviceText = getEl('aqi-advice-text');
    const aqiAdviceContainer = getEl('aqi-advice-container');
    
    if (aqiDetailsContainer && aqiDescription && aqiAdviceText) {
        aqiDescription.innerText = aqiInfo.desc || '';
        aqiAdviceText.innerText = aqiInfo.advice || '';
        
        if (aqiAdviceContainer) {
            aqiAdviceContainer.className = `${aqiInfo.bg} border ${aqiInfo.border} rounded-lg p-2 flex items-start gap-1.5 transition-all duration-500 backdrop-blur-sm`;
        }
        
        aqiDetailsContainer.classList.remove('opacity-0');
    }
    
    // Pollutants mapped to Guidelines
    const guidelines = { pm2_5: 15, pm10: 45, co: 4000, no2: 25, o3: 100, so2: 40 };
    const origins = {
        pm2_5: "Vehicle combustion.",
        pm10: "Road grit, construction.",
        co: "Incomplete combustion.",
        no2: "Diesel engines.",
        o3: "Sunlight, smog.",
        so2: "Refineries, coal."
    };
    
    Object.keys(guidelines).forEach(key => {
        const domId = key.replace('_', '');
        const val = data.components[key] || 0;
        const limit = guidelines[key];
        
        const rawPct = (val / limit) * 100;
        const visualPct = Math.min(rawPct, 100); 
        
        const valEl = getEl(`val-${domId}`);
        if(valEl) {
            let unitStr = 'µg/m³';
            valEl.innerHTML = `${val.toFixed(1)}<span class="text-[12px] text-g-black font-bold ml-1">${unitStr}</span>`;
        }
        
        const bar = getEl(`bar-${domId}`);
        if(bar) {
            bar.style.width = `${visualPct}%`; 
            
            let barColor = 'bg-g-green-medium';
            if (rawPct >= 300) barColor = 'bg-g-red';
            else if (rawPct >= 200) barColor = 'bg-g-red-medium';
            else if (rawPct > 100) barColor = 'bg-g-orange';
            else if (rawPct > 50) barColor = 'bg-g-yellow';
            
            bar.className = `h-full rounded-full transition-all duration-700 ${barColor}`;
            
            const card = bar.parentElement.parentElement;
            if (card) {
                let originEl = getEl(`origin-${domId}`);
                if (!originEl) {
                    originEl = document.createElement('div');
                    originEl.id = `origin-${domId}`;
                    // Set the primary text color to #e6e6e6 for readability
                    originEl.className = 'text-[10px] text-[#e6e6e6] font-medium mt-1.5';
                    card.appendChild(originEl);
                }
                // Only the "Source:" label is colored black and decoupled from global text-shadows
                originEl.innerHTML = `<span class="font-bold text-g-black" style="text-shadow: none;">Source:</span> ${origins[key]}`;
            }
        }
        
        const pctEl = getEl(`pct-${domId}`);
        if (pctEl) {
            const limitTextEl = pctEl.previousElementSibling;
            if (limitTextEl) {
                limitTextEl.innerHTML = `Limit: ${limit}µg/m³`;
            }
            
            pctEl.innerText = `${Math.round(rawPct)}%`;
            if (rawPct >= 300) {
                pctEl.className = 'text-g-red font-bold';
            } else if (rawPct >= 200) {
                pctEl.className = 'text-g-red-medium font-bold';
            } else if (rawPct > 100) {
                pctEl.className = 'text-g-orange font-bold';
            } else if (rawPct > 50) {
                pctEl.className = 'text-g-yellow font-bold';
            } else {
                pctEl.className = 'text-[#e6e6e6] font-bold';
            }
        }
        
        const badge = getEl(`badge-${domId}`);
        if(badge) {
            if (rawPct >= 300) {
                badge.innerText = 'HAZARDOUS';
                badge.className = 'text-[10px] font-black px-2 py-0.5 rounded bg-g-red text-white tracking-widest shadow-sm';
            } else if (rawPct >= 200) {
                badge.innerText = 'POOR';
                badge.className = 'text-[10px] font-black px-2 py-0.5 rounded bg-g-red-medium text-white tracking-widest shadow-sm';
            } else if (rawPct > 100) {
                badge.innerText = 'UNHEALTHY';
                badge.className = 'text-[10px] font-black px-2 py-0.5 rounded bg-g-orange text-white tracking-widest shadow-sm';
            } else if (rawPct > 50) {
                badge.innerText = 'MODERATE';
                badge.className = 'text-[10px] font-black px-2 py-0.5 rounded bg-g-yellow text-g-black tracking-widest shadow-sm';
            } else {
                badge.innerText = 'GOOD';
                badge.className = 'text-[10px] font-black px-2 py-0.5 rounded bg-g-green-medium text-white tracking-widest shadow-sm';
            }
        }
    });

    const geoLat = getEl('geo-lat');
    const geoLon = getEl('geo-lon');
    if (geoLat) geoLat.innerText = state.currentLat.toFixed(4);
    if (geoLon) geoLon.innerText = state.currentLon.toFixed(4);
}

export function renderPM25Sparkline() {
    const listToRender = state.pm25ForecastMode === '5d' ? state.pm25ForecastData5d : state.pm25ForecastData24h;
    drawSparkline(listToRender, state.pm25ForecastMode);
}

export function drawSparkline(forecastList, mode = '24h') {
    const canvas = getEl('pm25-sparkline');
    if(!canvas) return;

    const pollutant = state.selectedPollutant || 'pm2_5';
    const guidelines = { pm2_5: 15, pm10: 45, co: 4000, no2: 25, o3: 100, so2: 40 };
    const limit = guidelines[pollutant] || 15;

    let tooltipEl = getEl('chart-tooltip');
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'chart-tooltip';
        tooltipEl.className = 'fixed hidden bg-g-black text-g-grey-light text-xs py-1.5 px-2.5 rounded-lg border border-g-grey-dark shadow-xl z-[100] pointer-events-none transform -translate-x-1/2 -translate-y-full transition-colors duration-200';
        document.body.appendChild(tooltipEl);
    }

    const dataPoints = forecastList.map(item => item.components[pollutant] || 0);

    if (canvas._hoverListener) {
        canvas.removeEventListener('mousemove', canvas._hoverListener);
        canvas.removeEventListener('mouseleave', canvas._leaveListener);
    }

    canvas._hoverListener = (e) => {
        const rect = canvas.getBoundingClientRect();
        const cssMouseX = e.clientX - rect.left;
        
        const cssPLeft = 35; 
        const cssPRight = 10;
        const cssChartStartOffset = 12; 
        const cssDrawW = rect.width - cssPLeft - cssPRight - cssChartStartOffset;
        const cssStep = cssDrawW / Math.max((dataPoints.length - 1), 1);

        let index = Math.round((cssMouseX - cssPLeft - cssChartStartOffset) / cssStep);
        
        if (index >= 0 && index < dataPoints.length && cssMouseX >= (cssPLeft + cssChartStartOffset - cssStep) && cssMouseX <= (rect.width - cssPRight + cssStep)) {
            index = Math.max(0, Math.min(index, dataPoints.length - 1));
            const val = dataPoints[index];
            const dataItem = forecastList[index];
            
            let localTime = new Date(dataItem.dt * 1000);
            if (state.isTimezoneSet) {
                const utcTime = localTime.getTime() + (localTime.getTimezoneOffset() * 60000);
                localTime = new Date(utcTime + (state.currentTimezoneOffset * 1000));
            }
            
            let timeStr = '';
            if (mode === '5d') {
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                timeStr = days[localTime.getDay()];
            } else {
                timeStr = localTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            }
            
            const rawPct = (val / limit) * 100;
            let valColor = 'text-g-green-medium';
            if (rawPct > 100) {
                valColor = 'text-g-red-medium';
            } else if (rawPct > 75) {
                valColor = 'text-g-yellow';
            }
            
            let unitStr = 'µg/m³';

            tooltipEl.innerHTML = `
                <div class="font-bold ${valColor}">${val.toFixed(1)} <span class="text-[9px] font-normal text-g-grey">${unitStr}</span></div>
                <div class="text-[10px] text-g-grey mt-0.5">${timeStr}</div>
            `;
            
            tooltipEl.style.left = `${e.clientX}px`;
            tooltipEl.style.top = `${e.clientY - 15}px`;
            tooltipEl.classList.remove('hidden');
            
            renderSparklineCanvas(forecastList, index, mode, pollutant, limit);
        } else {
            tooltipEl.classList.add('hidden');
            renderSparklineCanvas(forecastList, -1, mode, pollutant, limit);
        }
    };

    canvas._leaveListener = () => {
        tooltipEl.classList.add('hidden');
        renderSparklineCanvas(forecastList, -1, mode, pollutant, limit);
    };

    canvas.addEventListener('mousemove', canvas._hoverListener);
    canvas.addEventListener('mouseleave', canvas._leaveListener);

    renderSparklineCanvas(forecastList, -1, mode, pollutant, limit);
}

function renderSparklineCanvas(forecastList, hoverIndex, mode = '24h', pollutant = 'pm2_5', limit = 15) {
    const canvas = getEl('pm25-sparkline');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    const cssWidth = rect.width || 600;
    const cssHeight = rect.height || 60;
    
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const dataPoints = forecastList.map(item => item.components[pollutant] || 0);
    const max = Math.max(...dataPoints, limit * 1.5); 
    const min = 0;
    
    const pTop = 10 * dpr;
    const pBottom = 18 * dpr; 
    const pLeft = 35 * dpr;   
    const pRight = 10 * dpr;
    const chartStartOffset = 12 * dpr; 
    
    const drawW = width - pLeft - pRight - chartStartOffset;
    const drawH = height - pTop - pBottom;
    const step = drawW / Math.max((dataPoints.length - 1), 1);

    const getX = (i) => pLeft + chartStartOffset + (i * step);
    const getY = (val) => (pTop + drawH) - ((val - min) / (max - min)) * drawH;

    const axisTextColor = "#202124"; 

    ctx.font = `bold ${10 * dpr}px 'Google Sans', sans-serif`;
    ctx.fillStyle = axisTextColor;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(Math.round(max), pLeft - (6 * dpr), pTop);
    ctx.fillText(0, pLeft - (6 * dpr), pTop + drawH);

    ctx.textBaseline = "top";
    
    if (mode === '5d') {
        for (let i = 0; i < forecastList.length; i++) { 
            const x = getX(i);
            let localTime = new Date(forecastList[i].dt * 1000);
            if (state.isTimezoneSet) {
                const utcTime = localTime.getTime() + (localTime.getTimezoneOffset() * 60000);
                localTime = new Date(utcTime + (state.currentTimezoneOffset * 1000));
            }
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            
            if (i === 0) {
                ctx.textAlign = "left";
            } else if (i === forecastList.length - 1) {
                ctx.textAlign = "right";
            } else {
                ctx.textAlign = "center";
            }
            
            ctx.fillText(days[localTime.getDay()], x, pTop + drawH + (5 * dpr));
        }
    } else {
        for (let i = 0; i < forecastList.length; i += 6) { 
            const x = getX(i);
            let localTime = new Date(forecastList[i].dt * 1000);
            if (state.isTimezoneSet) {
                const utcTime = localTime.getTime() + (localTime.getTimezoneOffset() * 60000);
                localTime = new Date(utcTime + (state.currentTimezoneOffset * 1000));
            }
            const timeStr = localTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            
            if (i === 0) {
                ctx.textAlign = "left";
            } else if (i >= forecastList.length - 6) {
                ctx.textAlign = "right";
            } else {
                ctx.textAlign = "center";
            }
            
            ctx.fillText(timeStr, x, pTop + drawH + (5 * dpr));
        }
    }

    if (mode === '5d') {
        let gradient = '#34A853'; 
        if (max > min) {
            gradient = ctx.createLinearGradient(0, pTop, 0, pTop + drawH);
            const stopRed = Math.max(0, Math.min(1, 1 - ((limit - min) / (max - min))));
            const stopYellow = Math.max(0, Math.min(1, 1 - (((limit * 0.75) - min) / (max - min))));
            
            gradient.addColorStop(0, '#EA4335');
            gradient.addColorStop(stopRed, '#EA4335');
            gradient.addColorStop(stopRed, '#FBBC04');
            gradient.addColorStop(stopYellow, '#FBBC04');
            gradient.addColorStop(stopYellow, '#34A853');
            gradient.addColorStop(1, '#34A853');
        }

        ctx.beginPath();
        ctx.moveTo(getX(0), getY(dataPoints[0]));
        for (let i = 1; i < dataPoints.length; i++) {
            ctx.lineTo(getX(i), getY(dataPoints[i]));
        }
        ctx.lineWidth = 3 * dpr;
        ctx.strokeStyle = gradient;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();

        for (let i = 0; i < dataPoints.length; i++) {
            const val = dataPoints[i];
            const rawPct = (val / limit) * 100;
            
            let ptColor = '#34A853'; 
            let hoverPtColor = '#0D652D'; 
            
            if (rawPct > 100) { 
                ptColor = '#EA4335'; 
                hoverPtColor = '#A50E0E'; 
            } else if (rawPct > 75) { 
                ptColor = '#FBBC04'; 
                hoverPtColor = '#E37400'; 
            }

            const isHovered = (i === hoverIndex);
            
            ctx.beginPath();
            ctx.arc(getX(i), getY(val), (isHovered ? 6 : 4) * dpr, 0, 2 * Math.PI);
            ctx.fillStyle = isHovered ? hoverPtColor : ptColor;
            ctx.fill();
            
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2 * dpr;
            ctx.stroke();
        }

    } else {
        const barWidth = Math.max(step * 0.7, 2 * dpr); 
        
        for (let i = 0; i < dataPoints.length; i++) {
            const val = dataPoints[i];
            const hx = getX(i);
            const hy = getY(val);
            const barH = (pTop + drawH) - hy;

            const rawPct = (val / limit) * 100;
            if (rawPct >= 300) {
                ctx.fillStyle = (i === hoverIndex) ? '#A50E0E' : '#EA4335'; 
            } else if (rawPct >= 200) {
                ctx.fillStyle = (i === hoverIndex) ? '#A50E0E' : '#EA4335';
            } else if (rawPct > 100) {
                ctx.fillStyle = (i === hoverIndex) ? '#E37400' : '#FBBC04'; 
            } else if (rawPct > 50) {
                ctx.fillStyle = (i === hoverIndex) ? '#E37400' : '#FBBC04';
            } else {
                ctx.fillStyle = (i === hoverIndex) ? '#0D652D' : '#34A853'; 
            }

            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(hx - barWidth / 2, hy, barWidth, Math.max(barH, 1 * dpr), [2 * dpr, 2 * dpr, 0, 0]);
            } else {
                ctx.rect(hx - barWidth / 2, hy, barWidth, Math.max(barH, 1 * dpr));
            }
            ctx.fill();
        }
    }
}

export function renderWeatherForecast() {
    const forecastContainer = getEl('weather-forecast-container');
    if (!forecastContainer) return;

    let tooltipEl = getEl('global-forecast-tooltip');
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'global-forecast-tooltip';
        tooltipEl.className = 'fixed hidden bg-g-black text-g-grey-light text-[11px] font-medium py-1.5 px-2.5 rounded shadow-xl z-[9999] pointer-events-none transform -translate-x-1/2 -translate-y-full';
        document.body.appendChild(tooltipEl);
    }

    let forecastHTML = '';
    let listToRender = [];
    
    const titleEl = getEl('forecast-title');
    const backBtn = getEl('btn-forecast-back');
    const toggles = getEl('forecast-toggles');

    if (state.forecastMode === '5d') {
        if (state.selectedDayIndex !== undefined && state.selectedDayIndex !== null) {
            listToRender = state.weatherForecastData5d[state.selectedDayIndex].rawItems;
            if (titleEl) {
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                titleEl.innerText = `${days[state.weatherForecastData5d[state.selectedDayIndex].dateObj.getDay()]} Forecast`;
            }
            if (backBtn) backBtn.classList.remove('hidden');
            if (toggles) toggles.classList.add('hidden');
        } else {
            listToRender = state.weatherForecastData5d;
            if (titleEl) titleEl.innerText = 'Weather Forecast';
            if (backBtn) backBtn.classList.add('hidden');
            if (toggles) toggles.classList.remove('hidden');
        }
    } else {
        listToRender = state.weatherForecastData24h;
        if (titleEl) titleEl.innerText = 'Weather Forecast';
        if (backBtn) backBtn.classList.add('hidden');
        if (toggles) toggles.classList.remove('hidden');
    }

    if (!listToRender || listToRender.length === 0) return;

    listToRender.forEach((item, index) => {
        let localTime = new Date((item.dt || 0) * 1000);
        if (state.isTimezoneSet) {
            const utcTime = localTime.getTime() + (localTime.getTimezoneOffset() * 60000);
            localTime = new Date(utcTime + (state.currentTimezoneOffset * 1000));
        }

        let timeLabel = '';
        let tempLabel = '';
        
        const isDailySummary = state.forecastMode === '5d' && state.selectedDayIndex == null;

        if (isDailySummary) {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            timeLabel = days[localTime.getDay()];
            tempLabel = `${Math.round(item.temp.max)}°<span class="text-[#ffffff] font-normal ml-1 text-[10px]">${Math.round(item.temp.min)}°</span>`;
        } else {
            timeLabel = localTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            tempLabel = `${Math.round(item.main.temp)}°`;
        }

        const fIconCode = item.weather[0].icon;
        const fIconUrl = `https://openweathermap.org/img/wn/${fIconCode}@2x.png`;
        const weatherDesc = item.weather[0].description;
        const formattedDesc = weatherDesc.charAt(0).toUpperCase() + weatherDesc.slice(1);

        forecastHTML += `
            <div data-weather-desc="${formattedDesc}" ${isDailySummary ? `data-day-index="${index}"` : ''} class="${isDailySummary ? 'forecast-day-btn cursor-pointer shadow-sm hover:-translate-y-0.5' : 'cursor-help'} flex flex-col items-center min-w-[85px] bg-transparent rounded-xl p-3 border border-g-grey-light/25 shrink-0 hover:bg-white/10 transition-all gap-1">
                <span class="text-xs text-[#e6e6e6] pointer-events-none font-bold tracking-wide">${timeLabel}</span>
                <img src="${fIconUrl}" alt="${weatherDesc}" class="w-10 h-10 object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)] my-0.5 pointer-events-none" />
                <span class="text-sm font-black text-g-black pointer-events-none flex items-baseline">${tempLabel}</span>
            </div>
        `;
    });
    
    forecastContainer.innerHTML = forecastHTML;

    if (state.forecastMode === '5d' && state.selectedDayIndex == null) {
        document.querySelectorAll('.forecast-day-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                state.selectedDayIndex = parseInt(e.currentTarget.getAttribute('data-day-index'), 10);
                renderWeatherForecast();
            });
        });
    }

    forecastContainer.onmousemove = (e) => {
        const target = e.target.closest('[data-weather-desc]');
        if (target) {
            tooltipEl.innerText = target.getAttribute('data-weather-desc');
            tooltipEl.style.left = e.clientX + 'px';
            tooltipEl.style.top = (e.clientY - 15) + 'px';
            tooltipEl.classList.remove('hidden');
        } else {
            tooltipEl.classList.add('hidden');
        }
    };
    
    forecastContainer.onmouseleave = () => {
        tooltipEl.classList.add('hidden');
    };
}

// Ensure the core UI logic strictly applies text-sm sizes to override any external class inconsistencies
export function updateWeatherUI(weatherData) {
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