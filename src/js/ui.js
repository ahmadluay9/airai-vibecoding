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
        aqiLabel.className = `text-sm font-bold ${aqiInfo.text} mt-2 bg-white px-3 py-0.5 rounded-full border ${aqiInfo.border}`;
    }

    const aqiDetailsContainer = document.getElementById('aqi-details-container');
    const aqiDescription = document.getElementById('aqi-description');
    const aqiAdviceText = document.getElementById('aqi-advice-text');
    
    if (aqiDetailsContainer && aqiDescription && aqiAdviceText) {
        aqiDescription.innerText = aqiInfo.desc;
        aqiAdviceText.innerText = aqiInfo.advice;
        aqiDetailsContainer.classList.remove('opacity-0');
    }
    
    // Pollutants mapped to Google Colors
    const guidelines = { pm2_5: 15, pm10: 45, co: 4000, no2: 25, o3: 100, so2: 40 };
    const origins = {
        pm2_5: "Vehicle combustion, dust, wildfire smoke.",
        pm10: "Road grit, construction sites, pollen spores.",
        co: "Incomplete combustion, motor vehicles.",
        no2: "Diesel engines, thermal power plants.",
        o3: "Atmospheric chemical reactions, sunlight, smog.",
        so2: "Refineries, volcanic activity, burning coal."
    };
    
    Object.keys(guidelines).forEach(key => {
        const domId = key.replace('_', '');
        const val = data.components[key] || 0;
        const limit = guidelines[key];
        
        // Use raw percentage for accurate logic, visual percentage for UI width
        const rawPct = (val / limit) * 100;
        const visualPct = Math.min(rawPct, 100); 
        
        if(document.getElementById(`val-${domId}`)) document.getElementById(`val-${domId}`).innerText = val.toFixed(1);
        
        const bar = document.getElementById(`bar-${domId}`);
        if(bar) {
            bar.style.width = `${visualPct}%`; // Cap at 100% so it doesn't break the UI container
            // bg-g-green-medium, bg-g-yellow, bg-g-red-medium
            bar.className = `h-full rounded-full transition-all duration-700 ${rawPct > 100 ? 'bg-g-red-medium' : (rawPct > 75 ? 'bg-g-yellow' : 'bg-g-green-medium')}`;
            
            // Dynamically append or update the Origin box inside the card
            const card = bar.parentElement.parentElement;
            if (card) {
                let originEl = document.getElementById(`origin-${domId}`);
                if (!originEl) {
                    originEl = document.createElement('div');
                    originEl.id = `origin-${domId}`;
                    originEl.className = 'bg-[#F8F9FA] border border-g-grey-light rounded-lg p-3 text-[10px] text-g-grey-dark';
                    card.appendChild(originEl);
                }
                originEl.innerHTML = `<span class="font-semibold text-g-black">Origin:</span> ${origins[key]}`;
            }
        }
        
        const pctEl = document.getElementById(`pct-${domId}`);
        if (pctEl) {
            pctEl.innerText = `${Math.round(rawPct)}% Limit`;
            if (rawPct > 100) {
                pctEl.className = 'text-g-red-medium font-bold';
            } else if (rawPct > 75) {
                pctEl.className = 'text-g-orange font-bold';
            } else {
                pctEl.className = 'text-g-grey font-medium';
            }
        }
        
        const badge = document.getElementById(`badge-${domId}`);
        if(badge) {
            if (rawPct > 100) {
                badge.innerText = 'UNHEALTHY';
                badge.className = 'text-[10px] font-bold px-2 py-0.5 rounded border text-g-red-medium border-g-red-medium/30 bg-g-red-light/30';
            } else if (rawPct > 75) {
                badge.innerText = 'ELEVATED';
                badge.className = 'text-[10px] font-bold px-2 py-0.5 rounded border text-g-orange border-g-yellow/50 bg-g-yellow-light/30';
            } else {
                badge.innerText = 'WITHIN LIMIT';
                badge.className = 'text-[10px] font-bold px-2 py-0.5 rounded border text-g-green-medium border-g-green-medium/30 bg-g-green-light/30';
            }
        }
    });

    // Update GPS info blocks
    const geoLat = document.getElementById('geo-lat');
    const geoLon = document.getElementById('geo-lon');
    if (geoLat) geoLat.innerText = state.currentLat.toFixed(4);
    if (geoLon) geoLon.innerText = state.currentLon.toFixed(4);
}

export function drawSparkline(forecastList) {
    const canvas = document.getElementById('pm25-sparkline');
    if(!canvas) return;

    // Create the tooltip element if it doesn't exist
    let tooltipEl = document.getElementById('chart-tooltip');
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'chart-tooltip';
        tooltipEl.className = 'fixed hidden bg-g-black text-g-grey-light text-xs py-1.5 px-2.5 rounded-lg border border-g-grey-dark shadow-xl z-[100] pointer-events-none transform -translate-x-1/2 -translate-y-full transition-colors duration-200';
        document.body.appendChild(tooltipEl);
    }

    const dataPoints = forecastList.map(item => item.components.pm2_5);

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
            const timeStr = localTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            
            // Color the tooltip text based on the 15µg/m³ WHO guideline
            const rawPct = (val / 15) * 100;
            let valColor = 'text-g-green-medium';
            if (rawPct > 100) {
                valColor = 'text-g-red-medium';
            } else if (rawPct > 75) {
                valColor = 'text-g-yellow';
            }
            
            tooltipEl.innerHTML = `
                <div class="font-bold ${valColor}">${val.toFixed(1)} <span class="text-[9px] font-normal text-g-grey">µg/m³</span></div>
                <div class="text-[10px] text-g-grey mt-0.5">${timeStr}</div>
            `;
            
            tooltipEl.style.left = `${e.clientX}px`;
            tooltipEl.style.top = `${e.clientY - 15}px`;
            tooltipEl.classList.remove('hidden');
            
            renderSparklineCanvas(forecastList, index);
        } else {
            tooltipEl.classList.add('hidden');
            renderSparklineCanvas(forecastList, -1);
        }
    };

    canvas._leaveListener = () => {
        tooltipEl.classList.add('hidden');
        renderSparklineCanvas(forecastList, -1);
    };

    canvas.addEventListener('mousemove', canvas._hoverListener);
    canvas.addEventListener('mouseleave', canvas._leaveListener);

    // Initial render without hover
    renderSparklineCanvas(forecastList, -1);
}

function renderSparklineCanvas(forecastList, hoverIndex) {
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

    const dataPoints = forecastList.map(item => item.components.pm2_5);
    const max = Math.max(...dataPoints, 50); 
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

    // Draw X-Axis Time Labels (Every 6 hours)
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
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

    // Draw Bars
    const barWidth = Math.max(step * 0.7, 2 * dpr); // Bar width taking up 70% of the step space
    
    for (let i = 0; i < dataPoints.length; i++) {
        const val = dataPoints[i];
        const hx = getX(i);
        const hy = getY(val);
        const barH = (pTop + drawH) - hy;

        // Apply Warning colors based on WHO guidelines of 15µg/m³
        const rawPct = (val / 15) * 100;
        if (rawPct > 100) {
            ctx.fillStyle = (i === hoverIndex) ? '#A50E0E' : '#EA4335'; // Hover: g-red-dark, Default: g-red-medium
        } else if (rawPct > 75) {
            ctx.fillStyle = (i === hoverIndex) ? '#E37400' : '#FBBC04'; // Hover: g-orange, Default: g-yellow
        } else {
            ctx.fillStyle = (i === hoverIndex) ? '#0D652D' : '#34A853'; // Hover: g-green-dark, Default: g-green-medium
        }

        ctx.beginPath();
        // Use roundRect for softer modern corners if supported, otherwise fallback to fillRect would be handled silently by browsers but standard requires check.
        if (ctx.roundRect) {
            ctx.roundRect(hx - barWidth / 2, hy, barWidth, Math.max(barH, 1 * dpr), [2 * dpr, 2 * dpr, 0, 0]);
        } else {
            ctx.rect(hx - barWidth / 2, hy, barWidth, Math.max(barH, 1 * dpr));
        }
        ctx.fill();
    }
}

// --- NEW: Weather Icon Tooltip Functionality ---
export function setupWeatherTooltips() {
    let tooltipEl = document.getElementById('weather-tooltip');
    
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'weather-tooltip';
        // Styled consistently with the chart tooltip matching Google's aesthetic
        tooltipEl.className = 'fixed hidden bg-g-black text-g-grey-light text-xs py-1.5 px-2.5 rounded-lg border border-g-grey-dark shadow-xl z-[100] pointer-events-none transform -translate-x-1/2 -translate-y-full transition-colors duration-200 whitespace-nowrap';
        document.body.appendChild(tooltipEl);
    }

    // Use event delegation to handle dynamically added forecast icons
    document.addEventListener('mouseover', (e) => {
        const icon = e.target.closest('.weather-icon');
        if (icon) {
            // Read details from standard data attributes on the icon element
            const desc = icon.getAttribute('data-desc') || icon.getAttribute('alt') || 'Weather Condition';
            const temp = icon.getAttribute('data-temp') || '';
            const time = icon.getAttribute('data-time') || '';
            
            let innerHTML = `<div class="font-bold text-white capitalize">${desc}</div>`;
            if (temp || time) {
                // Displays Temp and Time combined if both exist, otherwise just one
                innerHTML += `<div class="text-[10px] text-g-grey mt-0.5">${temp} ${temp && time ? '•' : ''} ${time}</div>`;
            }
            
            tooltipEl.innerHTML = innerHTML;
            
            // Position dynamically directly above the icon
            const rect = icon.getBoundingClientRect();
            tooltipEl.style.left = `${rect.left + rect.width / 2}px`;
            tooltipEl.style.top = `${rect.top - 8}px`;
            tooltipEl.classList.remove('hidden');
        }
    });

    // Hide tooltip when moving the mouse off the icon
    document.addEventListener('mouseout', (e) => {
        const icon = e.target.closest('.weather-icon');
        if (icon) {
            tooltipEl.classList.add('hidden');
        }
    });
}