import { state } from './state.js';
import { initParticles } from './canvas.js';

function updateAvatar(aqi) {
    const avatarEmojiEl = document.getElementById('avatar-emoji');
    const avatarMessageEl = document.getElementById('avatar-message');
    if (!avatarEmojiEl || !avatarMessageEl) return;

    let iconFile = 'neutral.png';
    let message = '';
    
    // Base character based on AQI
    if (aqi <= 2) {
        iconFile = state.isDayTime ? 'running.png' : 'walking.png';
        message = 'Kualitas udara aman. Nyaman untuk bernapas bebas!';
    } else if (aqi === 3) {
        iconFile = 'neutral.png';
        message = 'Polusi sedang. Kelompok sensitif sebaiknya kurangi durasi di luar.';
    } else if (aqi === 4) {
        iconFile = 'mask.png';
        message = 'Udara kotor! Sangat disarankan pakai masker jika keluar rumah.';
    } else {
        iconFile = 'home.png';
        message = 'Kondisi udara Toxic! Tutup jendela dan nyalakan air purifier.';
    }

    // Weather Modifiers
    let weatherModifier = '';
    if (state.currentWeather === 'Rain' || state.currentWeather === 'Drizzle') {
        weatherModifier = '☔';
        message += ' Jangan lupa bawa payung juga.';
    } else if (state.currentWeather === 'Thunderstorm') {
        weatherModifier = '⚡';
        message += ' Awas badai petir, mending cari tempat teduh!';
    } else if (state.currentWeather === 'Clear' && state.isDayTime && aqi <= 2) {
        weatherModifier = '🕶️';
        message += ' Cuaca cerah dan aman, mantap nih.';
    }

    // Inject the image icon with a superimposed weather modifier emoji
    // Enhanced Visibility: Added a frosted glass badge container with strong shadows
    let emojiHtml = weatherModifier 
        ? `<div class="absolute -bottom-1 -right-2 flex items-center justify-center bg-white/20 backdrop-blur-md rounded-full p-1.5 shadow-[0_4px_10px_rgba(0,0,0,0.5)] border border-white/30 z-10 transition-transform duration-300 hover:scale-125">
               <span class="text-xl sm:text-2xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] leading-none">${weatherModifier}</span>
           </div>` 
        : '';

    avatarEmojiEl.innerHTML = `
        <div class="relative inline-block transition-transform duration-300 hover:scale-105">
            <img src="/src/assets/icons/${iconFile}" alt="Health Avatar" class="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-xl animate-float" />
            ${emojiHtml}
        </div>
    `;
    avatarMessageEl.innerText = message;
}

export function updateUI(data) {
    state.latestAirQualityData = data; 
    const aqi = data.main.aqi;
    const comps = data.components;
    
    const aqiEl = document.getElementById('aqi-display');
    aqiEl.innerText = aqi;
    aqiEl.className = `text-6xl sm:text-7xl font-black aqi-${aqi} glow-text transition-colors duration-500`;

    const body = document.getElementById('body-bg');
    const panel = document.getElementById('main-panel');
    const alert = document.getElementById('alert-banner');
    
    if(aqi >= 4) {
        body.classList.add('danger-vibe');
        panel.classList.add('danger-panel');
        alert.classList.remove('hidden');
    } else {
        body.classList.remove('danger-vibe');
        panel.classList.remove('danger-panel');
        alert.classList.add('hidden');
    }

    const grid = document.getElementById('components-grid');
    grid.innerHTML = '';
    const metrics = [
        { label: 'PM2.5', value: comps.pm2_5.toFixed(1), highlight: comps.pm2_5 > 35 },
        { label: 'PM10', value: comps.pm10.toFixed(1), highlight: comps.pm10 > 50 },
        { label: 'CO', value: comps.co.toFixed(1), highlight: comps.co > 500 },
        { label: 'Ozone', value: comps.o3.toFixed(1), highlight: comps.o3 > 100 }
    ];

    const metricDescriptions = {
        'PM2.5': 'Partikel halus (asap/debu). Standar aman < 15 µg/m³',
        'PM10': 'Partikel kasar (debu jalan). Standar aman < 45 µg/m³',
        'CO': 'Karbon Monoksida (emisi gas buang kendaraan).',
        'Ozone': 'Ozon permukaan (pemicu iritasi pernapasan).'
    };

    metrics.forEach(m => {
        const highlightClass = m.highlight ? 'text-g-red-medium glow-text' : 'text-g-grey-light';
        const tooltipText = metricDescriptions[m.label] || '';
        // Enhanced: Changed font-medium to font-semibold for numbers to increase readability
        grid.innerHTML += `
            <div data-js-tooltip="${tooltipText}" class="stat-card border border-g-grey-light/10 bg-g-grey-light/5 rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center gap-1 relative cursor-help">
                <span class="text-[10px] sm:text-xs font-bold text-g-grey uppercase tracking-wider pointer-events-none">${m.label}</span>
                <span class="text-xl sm:text-2xl font-semibold ${highlightClass} pointer-events-none">${m.value}</span>
                <span class="text-[9px] sm:text-[10px] text-g-grey/80 pointer-events-none">µg/m³</span>
            </div>
        `;
    });

    updateAvatar(aqi);
    initParticles(comps.pm2_5, comps.co, aqi);
    
    document.getElementById('ai-response-container').classList.add('hidden');
    document.getElementById('btn-ai').classList.remove('hidden');
}

export function drawSparkline(forecastDataList) {
    const canvas = document.getElementById('pm25-sparkline');
    if (!canvas) return;

    let tooltipEl = document.getElementById('chart-tooltip');
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'chart-tooltip';
        tooltipEl.className = 'fixed hidden bg-[#202124]/95 text-[#F1F3F4] text-xs py-1.5 px-2.5 rounded-lg border border-[#F1F3F4]/20 shadow-xl z-[100] pointer-events-none transform -translate-x-1/2 -translate-y-full transition-colors duration-300';
        document.body.appendChild(tooltipEl);
    }

    const dataPoints = forecastDataList.map(item => item.components.pm2_5);

    if (canvas._hoverListener) {
        canvas.removeEventListener('mousemove', canvas._hoverListener);
        canvas.removeEventListener('mouseleave', canvas._leaveListener);
    }

    canvas._hoverListener = (e) => {
        const rect = canvas.getBoundingClientRect();
        const cssMouseX = e.clientX - rect.left;
        
        const cssPLeft = 35;
        const cssPRight = 15;
        const cssDrawW = rect.width - cssPLeft - cssPRight;
        const cssStep = cssDrawW / Math.max((dataPoints.length - 1), 1);

        let index = Math.round((cssMouseX - cssPLeft) / cssStep);
        
        if (index >= 0 && index < dataPoints.length && cssMouseX >= cssPLeft - cssStep && cssMouseX <= (rect.width - cssPRight + cssStep)) {
            index = Math.max(0, Math.min(index, dataPoints.length - 1));
            const val = dataPoints[index];
            const dataItem = forecastDataList[index];
            
            let localTime = new Date(dataItem.dt * 1000);
            if (state.isTimezoneSet) {
                const utcTime = localTime.getTime() + (localTime.getTimezoneOffset() * 60000);
                localTime = new Date(utcTime + (state.currentTimezoneOffset * 1000));
            }
            const timeStr = localTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            
            tooltipEl.innerHTML = `
                <div class="font-bold text-[#D2E3FC]">${val.toFixed(1)} <span class="text-[9px] font-normal text-[#9AA0A6]">µg/m³</span></div>
                <div class="text-[10px] text-[#F1F3F4] mt-0.5">${timeStr}</div>
            `;
            
            if (document.body.classList.contains('theme-day')) {
                tooltipEl.style.backgroundColor = '#ffffff';
                tooltipEl.style.color = '#202124';
                tooltipEl.style.borderColor = 'rgba(0,0,0,0.1)';
                tooltipEl.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                tooltipEl.querySelector('.text-\\[\\#D2E3FC\\]').classList.replace('text-[#D2E3FC]', 'text-g-blue-medium');
                tooltipEl.querySelector('.text-\\[\\#9AA0A6\\]').classList.replace('text-[#9AA0A6]', 'text-g-grey');
                tooltipEl.querySelector('.text-\\[\\#F1F3F4\\]').classList.replace('text-[#F1F3F4]', 'text-g-black');
            } else {
                tooltipEl.style.backgroundColor = 'rgba(32,33,36,0.95)';
                tooltipEl.style.color = '#F1F3F4';
                tooltipEl.style.borderColor = 'rgba(241,243,244,0.2)';
            }
            
            tooltipEl.style.left = `${e.clientX}px`;
            tooltipEl.style.top = `${e.clientY - 15}px`;
            tooltipEl.classList.remove('hidden');
            
            renderSparklineCanvas(forecastDataList, index);
        } else {
            tooltipEl.classList.add('hidden');
            renderSparklineCanvas(forecastDataList, -1);
        }
    };

    canvas._leaveListener = () => {
        tooltipEl.classList.add('hidden');
        renderSparklineCanvas(forecastDataList, -1);
    };

    canvas.addEventListener('mousemove', canvas._hoverListener);
    canvas.addEventListener('mouseleave', canvas._leaveListener);

    renderSparklineCanvas(forecastDataList, -1);
}

function renderSparklineCanvas(forecastDataList, hoverIndex) {
    const canvas = document.getElementById('pm25-sparkline');
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

    const dataPoints = forecastDataList.map(item => item.components.pm2_5);
    const max = Math.max(...dataPoints, 50); 
    const min = 0;
    
    const pTop = 15 * dpr;
    const pBottom = 20 * dpr; 
    const pLeft = 35 * dpr;   
    const pRight = 15 * dpr;
    
    const drawW = width - pLeft - pRight;
    const drawH = height - pTop - pBottom;
    const step = drawW / Math.max((dataPoints.length - 1), 1);

    const getX = (i) => pLeft + (i * step);
    const getY = (val) => (pTop + drawH) - ((val - min) / (max - min)) * drawH;

    // Enhanced: Check theme to ensure canvas text contrasts properly with the background
    const isDayMode = document.body.classList.contains('theme-day');
    const axisTextColor = isDayMode ? "#5F6368" : "#9AA0A6";

    // Draw Y-axis labels
    ctx.font = `${10 * dpr}px 'Google Sans', sans-serif`;
    ctx.fillStyle = axisTextColor;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(Math.round(max), pLeft - (6 * dpr), pTop);
    ctx.fillText(Math.round(max / 2), pLeft - (6 * dpr), pTop + drawH / 2);
    ctx.fillText(0, pLeft - (6 * dpr), pTop + drawH);

    // Draw X-axis labels (Time)
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i < forecastDataList.length; i += 6) { 
        const x = getX(i);
        let localTime = new Date(forecastDataList[i].dt * 1000);
        if (state.isTimezoneSet) {
            const utcTime = localTime.getTime() + (localTime.getTimezoneOffset() * 60000);
            localTime = new Date(utcTime + (state.currentTimezoneOffset * 1000));
        }
        const timeStr = localTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        ctx.fillText(timeStr, x, pTop + drawH + (6 * dpr));
    }

    // Draw Sparkline Path
    ctx.beginPath();
    ctx.strokeStyle = '#4285F4'; // Google Medium Blue
    ctx.lineWidth = 3 * dpr; // Enhanced: Thicker line for better visibility
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    let gradient = ctx.createLinearGradient(0, pTop, 0, pTop + drawH);
    gradient.addColorStop(0, 'rgba(66, 133, 244, 0.6)');
    gradient.addColorStop(1, 'rgba(66, 133, 244, 0.0)');

    ctx.moveTo(getX(0), getY(dataPoints[0]));
    for (let i = 1; i < dataPoints.length; i++) {
        ctx.lineTo(getX(i), getY(dataPoints[i]));
    }
    ctx.stroke();
    
    // Fill area under the line
    ctx.lineTo(getX(dataPoints.length - 1), pTop + drawH);
    ctx.lineTo(getX(0), pTop + drawH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw Hover Indicator (Vertical Line + Dot)
    if (hoverIndex >= 0 && hoverIndex < dataPoints.length) {
        const hx = getX(hoverIndex);
        const hy = getY(dataPoints[hoverIndex]);

        // Vertical dashed line
        ctx.beginPath();
        ctx.strokeStyle = isDayMode ? 'rgba(95, 99, 104, 0.5)' : 'rgba(154, 160, 166, 0.5)';
        ctx.lineWidth = 1 * dpr;
        ctx.setLineDash([4 * dpr, 4 * dpr]);
        ctx.moveTo(hx, pTop);
        ctx.lineTo(hx, pTop + drawH);
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash

        // Highlight dot
        ctx.beginPath();
        ctx.arc(hx, hy, 4 * dpr, 0, 2 * Math.PI);
        ctx.fillStyle = isDayMode ? '#ffffff' : '#202124'; // Match background
        ctx.fill();
        ctx.lineWidth = 2 * dpr;
        ctx.strokeStyle = isDayMode ? '#174EA6' : '#D2E3FC'; // Contrast border
        ctx.stroke();
    }
}