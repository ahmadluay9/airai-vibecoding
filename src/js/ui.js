import { state } from './state.js';
import { getAQIColorAndLabel } from './utils.js';

export function updateUI(data) {
    state.latestAirQualityData = { main: data.main, components: data.components };
    
    const aqi = data.main.aqi;
    const aqiInfo = getAQIColorAndLabel(aqi);
    
    // AQI Gauge (scale out of 5)
    const offset = 125.6 - (125.6 * Math.min(aqi, 5) / 5);
    const gaugePath = document.getElementById('aqi-gauge-path');
    if(gaugePath) {
        gaugePath.style.strokeDashoffset = offset;
        gaugePath.style.stroke = aqiInfo.color;
    }
    
    const aqiDisplay = document.getElementById('aqi-display');
    if (aqiDisplay) {
        aqiDisplay.innerText = aqi;
        aqiDisplay.className = `text-5xl font-black ${aqiInfo.text} leading-none tracking-tighter`;
    }
    
    const aqiLabel = document.getElementById('aqi-label');
    if (aqiLabel) {
        aqiLabel.innerText = aqiInfo.label;
        aqiLabel.className = `text-xs font-bold ${aqiInfo.text} mt-3 bg-white px-4 py-1 rounded-full border ${aqiInfo.border} shadow-sm`;
    }

    const aqiDetailsContainer = document.getElementById('aqi-details-container');
    const aqiDescription = document.getElementById('aqi-description');
    const aqiAdviceText = document.getElementById('aqi-advice-text');
    
    if (aqiDetailsContainer && aqiDescription && aqiAdviceText) {
        aqiDescription.innerText = aqiInfo.desc || '';
        aqiAdviceText.innerText = aqiInfo.advice || '';
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
        
        // Use raw percentage for accurate logic, visual percentage for UI width
        const rawPct = (val / limit) * 100;
        const visualPct = Math.min(rawPct, 100); 
        
        const valEl = document.getElementById(`val-${domId}`);
        if(valEl) {
            let unitStr = 'µg/m³';
            valEl.innerHTML = `${val.toFixed(1)}<span class="text-[10px] text-g-grey font-normal ml-0.5">${unitStr}</span>`;
        }
        
        const bar = document.getElementById(`bar-${domId}`);
        if(bar) {
            bar.style.width = `${visualPct}%`; // Cap at 100% so it doesn't break the UI container
            
            let barColor = 'bg-g-green-medium';
            if (rawPct >= 300) barColor = 'bg-g-red';
            else if (rawPct >= 200) barColor = 'bg-g-red-medium';
            else if (rawPct > 100) barColor = 'bg-g-orange';
            else if (rawPct > 50) barColor = 'bg-g-yellow';
            
            bar.className = `h-full rounded-full transition-all duration-700 ${barColor}`;
            
            // Dynamically append or update the Origin text below the bar
            const card = bar.parentElement.parentElement;
            if (card) {
                let originEl = document.getElementById(`origin-${domId}`);
                if (!originEl) {
                    originEl = document.createElement('div');
                    originEl.id = `origin-${domId}`;
                    originEl.className = 'text-[9px] text-g-grey-dark mt-1.5';
                    card.appendChild(originEl);
                }
                originEl.innerHTML = `<span class="font-bold text-g-black">Source:</span> ${origins[key]}`;
            }
        }
        
        const pctEl = document.getElementById(`pct-${domId}`);
        if (pctEl) {
            // Update the limit text to format nicely with units
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
                pctEl.className = 'text-g-grey-dark font-medium';
            }
        }
        
        const badge = document.getElementById(`badge-${domId}`);
        if(badge) {
            if (rawPct >= 300) {
                badge.innerText = 'HAZARDOUS';
                badge.className = 'text-[9px] font-bold px-1.5 py-0.5 rounded border text-g-red border-g-red/30 bg-g-red-light/80 tracking-wide';
            } else if (rawPct >= 200) {
                badge.innerText = 'POOR';
                badge.className = 'text-[9px] font-bold px-1.5 py-0.5 rounded border text-g-red-medium border-g-red-medium/30 bg-g-red-light/30 tracking-wide';
            } else if (rawPct > 100) {
                badge.innerText = 'UNHEALTHY';
                badge.className = 'text-[9px] font-bold px-1.5 py-0.5 rounded border text-g-orange border-g-orange/30 bg-g-orange/10 tracking-wide';
            } else if (rawPct > 50) {
                badge.innerText = 'MODERATE';
                badge.className = 'text-[9px] font-bold px-1.5 py-0.5 rounded border text-g-yellow border-g-yellow/50 bg-g-yellow-light/30 tracking-wide';
            } else {
                badge.innerText = 'GOOD';
                badge.className = 'text-[9px] font-bold px-1.5 py-0.5 rounded border text-g-green-medium border-g-green-medium/30 bg-g-green-light/30 tracking-wide';
            }
        }
    });

    // Update GPS info blocks
    const geoLat = document.getElementById('geo-lat');
    const geoLon = document.getElementById('geo-lon');
    if (geoLat) geoLat.innerText = state.currentLat.toFixed(4);
    if (geoLon) geoLon.innerText = state.currentLon.toFixed(4);
}

export function renderPM25Sparkline() {
    const listToRender = state.pm25ForecastMode === '5d' ? state.pm25ForecastData5d : state.pm25ForecastData24h;
    drawSparkline(listToRender, state.pm25ForecastMode);
}

export function drawSparkline(forecastList, mode = '24h') {
    const canvas = document.getElementById('pm25-sparkline');
    if(!canvas) return;

    const pollutant = state.selectedPollutant || 'pm2_5';
    const guidelines = { pm2_5: 15, pm10: 45, co: 4000, no2: 25, o3: 100, so2: 40 };
    const limit = guidelines[pollutant] || 15;

    // Create the tooltip element if it doesn't exist
    let tooltipEl = document.getElementById('chart-tooltip');
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'chart-tooltip';
        tooltipEl.className = 'fixed hidden bg-g-black text-g-grey-light text-xs py-1.5 px-2.5 rounded-lg border border-g-grey-dark shadow-xl z-[100] pointer-events-none transform -translate-x-1/2 -translate-y-full transition-colors duration-200';
        document.body.appendChild(tooltipEl);
    }

    const dataPoints = forecastList.map(item => item.components[pollutant] || 0);

    // Clean up old event listeners to prevent duplicate triggers
    if (canvas._hoverListener) {
        canvas.removeEventListener('mousemove', canvas._hoverListener);
        canvas.removeEventListener('mouseleave', canvas._leaveListener);
    }

    // Attach interactive hover listener
    canvas._hoverListener = (e) => {
        const rect = canvas.getBoundingClientRect();
        const cssMouseX = e.clientX - rect.left;
        
        // Match the canvas padding defined in the renderer
        const cssPLeft = 25;
        const cssPRight = 10;
        const cssDrawW = rect.width - cssPLeft - cssPRight;
        const cssStep = cssDrawW / Math.max((dataPoints.length - 1), 1);

        // Find which data point we are hovering over
        let index = Math.round((cssMouseX - cssPLeft) / cssStep);
        
        // If mouse is inside the chart drawing bounds
        if (index >= 0 && index < dataPoints.length && cssMouseX >= cssPLeft - cssStep && cssMouseX <= (rect.width - cssPRight + cssStep)) {
            index = Math.max(0, Math.min(index, dataPoints.length - 1));
            const val = dataPoints[index];
            const dataItem = forecastList[index];
            
            // Format time correctly for the local timezone
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
            
            // Color the tooltip text based on the WHO guideline
            const rawPct = (val / limit) * 100;
            let valColor = 'text-g-green-medium';
            if (rawPct > 100) {
                valColor = 'text-g-red-medium';
            } else if (rawPct > 75) {
                valColor = 'text-g-yellow';
            }
            
            let unitStr = pollutant === 'co' ? 'µg/m³' : 'µg/m³';

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

    // Initial render without hover
    renderSparklineCanvas(forecastList, -1, mode, pollutant, limit);
}

function renderSparklineCanvas(forecastList, hoverIndex, mode = '24h', pollutant = 'pm2_5', limit = 15) {
    const canvas = document.getElementById('pm25-sparkline');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    const cssWidth = rect.width || 600;
    const cssHeight = rect.height || 60;
    
    // Scale for crisp retina displays
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const dataPoints = forecastList.map(item => item.components[pollutant] || 0);
    const max = Math.max(...dataPoints, limit * 1.5); 
    const min = 0;
    
    // Internal Padding 
    const pTop = 10 * dpr;
    const pBottom = 15 * dpr; 
    const pLeft = 25 * dpr;   
    const pRight = 10 * dpr;
    
    const drawW = width - pLeft - pRight;
    const drawH = height - pTop - pBottom;
    const step = drawW / Math.max((dataPoints.length - 1), 1);

    const getX = (i) => pLeft + (i * step);
    const getY = (val) => (pTop + drawH) - ((val - min) / (max - min)) * drawH;

    const axisTextColor = "#9AA0A6"; // g-grey

    // Draw Y-Axis Labels
    ctx.font = `${9 * dpr}px 'Google Sans', sans-serif`;
    ctx.fillStyle = axisTextColor;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(Math.round(max), pLeft - (4 * dpr), pTop);
    ctx.fillText(0, pLeft - (4 * dpr), pTop + drawH);

    // Draw X-Axis Time Labels
    ctx.textAlign = "center";
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
            ctx.fillText(days[localTime.getDay()], x, pTop + drawH + (4 * dpr));
        }
    } else {
        // Every 6 hours logic for 24H view
        for (let i = 0; i < forecastList.length; i += 6) { 
            const x = getX(i);
            let localTime = new Date(forecastList[i].dt * 1000);
            if (state.isTimezoneSet) {
                const utcTime = localTime.getTime() + (localTime.getTimezoneOffset() * 60000);
                localTime = new Date(utcTime + (state.currentTimezoneOffset * 1000));
            }
            const timeStr = localTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            ctx.fillText(timeStr, x, pTop + drawH + (4 * dpr));
        }
    }

    if (mode === '5d') {
        // --- Dynamic Threshold Line Chart ---
        
        let gradient = '#34A853'; // Default green fallback
        if (max > min) {
            gradient = ctx.createLinearGradient(0, pTop, 0, pTop + drawH);
            // Calculate percentage positions for WHO thresholds relative to chart scale
            const stopRed = Math.max(0, Math.min(1, 1 - ((limit - min) / (max - min))));
            const stopYellow = Math.max(0, Math.min(1, 1 - (((limit * 0.75) - min) / (max - min))));
            
            // Map the colors directly to the threshold lines
            gradient.addColorStop(0, '#EA4335');
            gradient.addColorStop(stopRed, '#EA4335');
            gradient.addColorStop(stopRed, '#FBBC04');
            gradient.addColorStop(stopYellow, '#FBBC04');
            gradient.addColorStop(stopYellow, '#34A853');
            gradient.addColorStop(1, '#34A853');
        }

        // Draw the connected Line
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

        // Draw individual data points on top of the line
        for (let i = 0; i < dataPoints.length; i++) {
            const val = dataPoints[i];
            const rawPct = (val / limit) * 100;
            
            let ptColor = '#34A853'; // Green
            let hoverPtColor = '#0D652D'; 
            
            if (rawPct > 100) { 
                ptColor = '#EA4335'; // Red
                hoverPtColor = '#A50E0E'; 
            } else if (rawPct > 75) { 
                ptColor = '#FBBC04'; // Yellow
                hoverPtColor = '#E37400'; 
            }

            const isHovered = (i === hoverIndex);
            
            ctx.beginPath();
            ctx.arc(getX(i), getY(val), (isHovered ? 6 : 4) * dpr, 0, 2 * Math.PI);
            ctx.fillStyle = isHovered ? hoverPtColor : ptColor;
            ctx.fill();
            
            // White border to make points stand out from the line
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2 * dpr;
            ctx.stroke();
        }

    } else {
        // --- Standard Bar Chart (24H view) ---
        const barWidth = Math.max(step * 0.7, 2 * dpr); 
        
        for (let i = 0; i < dataPoints.length; i++) {
            const val = dataPoints[i];
            const hx = getX(i);
            const hy = getY(val);
            const barH = (pTop + drawH) - hy;

            // Apply Warning colors based on WHO guidelines
            const rawPct = (val / limit) * 100;
            if (rawPct >= 300) {
                ctx.fillStyle = (i === hoverIndex) ? '#A50E0E' : '#EA4335'; // Hover: g-red-dark, Default: g-red-medium
            } else if (rawPct >= 200) {
                ctx.fillStyle = (i === hoverIndex) ? '#A50E0E' : '#EA4335';
            } else if (rawPct > 100) {
                ctx.fillStyle = (i === hoverIndex) ? '#E37400' : '#FBBC04'; // Hover: g-orange, Default: g-yellow
            } else if (rawPct > 50) {
                ctx.fillStyle = (i === hoverIndex) ? '#E37400' : '#FBBC04';
            } else {
                ctx.fillStyle = (i === hoverIndex) ? '#0D652D' : '#34A853'; // Hover: g-green-dark, Default: g-green-medium
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
    const forecastContainer = document.getElementById('weather-forecast-container');
    if (!forecastContainer) return;

    let tooltipEl = document.getElementById('global-forecast-tooltip');
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'global-forecast-tooltip';
        tooltipEl.className = 'fixed hidden bg-g-black text-g-grey-light text-[11px] font-medium py-1.5 px-2.5 rounded shadow-xl z-[9999] pointer-events-none transform -translate-x-1/2 -translate-y-full';
        document.body.appendChild(tooltipEl);
    }

    let forecastHTML = '';
    let listToRender = [];
    
    // Navigation Elements
    const titleEl = document.getElementById('forecast-title');
    const backBtn = document.getElementById('btn-forecast-back');
    const toggles = document.getElementById('forecast-toggles');

    if (state.forecastMode === '5d') {
        if (state.selectedDayIndex !== undefined && state.selectedDayIndex !== null) {
            // Drill-down mode: Show 3-hour chunks for the selected day
            listToRender = state.weatherForecastData5d[state.selectedDayIndex].rawItems;
            if (titleEl) {
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                titleEl.innerText = `${days[state.weatherForecastData5d[state.selectedDayIndex].dateObj.getDay()]} Forecast`;
            }
            if (backBtn) backBtn.classList.remove('hidden');
            if (toggles) toggles.classList.add('hidden');
        } else {
            // Standard 5D overview
            listToRender = state.weatherForecastData5d;
            if (titleEl) titleEl.innerText = 'Weather Forecast';
            if (backBtn) backBtn.classList.add('hidden');
            if (toggles) toggles.classList.remove('hidden');
        }
    } else {
        // Standard 24H view
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
        
        // If in 5D mode but NOT drilled down, show daily summary. Otherwise show 3-hourly data.
        const isDailySummary = state.forecastMode === '5d' && state.selectedDayIndex == null;

        if (isDailySummary) {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            timeLabel = days[localTime.getDay()];
            tempLabel = `${Math.round(item.temp.max)}°<span class="text-g-grey font-normal ml-0.5 text-[8px]">${Math.round(item.temp.min)}°</span>`;
        } else {
            timeLabel = localTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            tempLabel = `${Math.round(item.main.temp)}°`;
        }

        const fIconCode = item.weather[0].icon;
        const fIconUrl = `https://openweathermap.org/img/wn/${fIconCode}@2x.png`;
        const weatherDesc = item.weather[0].description;
        const formattedDesc = weatherDesc.charAt(0).toUpperCase() + weatherDesc.slice(1);

        forecastHTML += `
            <div data-weather-desc="${formattedDesc}" ${isDailySummary ? `data-day-index="${index}"` : ''} class="${isDailySummary ? 'forecast-day-btn cursor-pointer shadow-sm hover:-translate-y-0.5' : 'cursor-help'} flex flex-col items-center min-w-[65px] bg-[#F8F9FA] rounded-lg p-2 border border-g-grey-light shrink-0 hover:bg-white transition-all">
                <span class="text-[9px] text-g-grey-dark pointer-events-none font-bold">${timeLabel}</span>
                <img src="${fIconUrl}" alt="${weatherDesc}" class="w-8 h-8 object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)] my-0.5 pointer-events-none" />
                <span class="text-[10px] font-bold text-g-black pointer-events-none flex items-baseline">${tempLabel}</span>
            </div>
        `;
    });
    
    forecastContainer.innerHTML = forecastHTML;

    // Attach click listeners for 5-Day items to initiate the drill-down
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