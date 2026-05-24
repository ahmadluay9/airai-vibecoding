// --- 0. GLOBAL STATE & UTILS ---
const API_KEY = import.meta.env.VITE_API_KEY || '';
let latestAirQualityData = null;
let currentWeather = 'Clear';
let isDayTime = false;
let rainArray = [];
let lightningFlash = 0;

// Coordinate State & Sync Logic
let currentLat = -6.2088; // Default to Jakarta
let currentLon = 106.8456;
let syncIntervalId = null;
let currentTimezoneOffset = 0;
let isTimezoneSet = false;

function updateDateTime() {
    const now = new Date();
    let localTime = now;

    if (isTimezoneSet) {
        // Calculate UTC time then apply the specific location's timezone offset
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
        localTime = new Date(utcTime + (currentTimezoneOffset * 1000));
    }

    const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = localTime.toLocaleDateString('en-US', optionsDate);
    // Force 24-hour format with colons (HH:MM:SS)
    const timeString = localTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    document.getElementById('current-datetime').innerText = `${dateString} | ${timeString} ${isTimezoneSet ? '(Local Time)' : ''}`;
}
setInterval(updateDateTime, 1000);
updateDateTime();

const startAutoSync = () => {
    if (syncIntervalId) clearInterval(syncIntervalId);
    // Refresh every 15 minutes
    syncIntervalId = setInterval(async () => {
        const statusEl = document.getElementById('status-text');
        const pingSolid = document.getElementById('ping-solid');
        
        statusEl.innerHTML = "BACKGROUND SYNCING...";
        statusEl.classList.remove('text-g-blue-medium', 'text-g-red-medium');
        statusEl.classList.add('text-g-green-medium');
        
        document.getElementById('ping-dot').classList.remove('hidden'); 
        
        pingSolid.classList.remove('bg-g-blue-medium', 'bg-g-red-medium');
        pingSolid.classList.add('bg-g-green-medium');
        
        await fetchRealAirData(currentLat, currentLon);
    }, 15 * 60 * 1000); 
};


// --- 1. GENERATIVE ART SETUP (Variables & Canvas) ---
const canvas = document.getElementById('canvas-container');
const ctx = canvas.getContext('2d');
let particlesArray = [];

const mouse = { x: null, y: null, radius: 120 };
window.addEventListener('mousemove', (e) => { mouse.x = e.x; mouse.y = e.y; });
window.addEventListener('mouseout', () => { mouse.x = null; mouse.y = null; });
window.addEventListener('touchmove', (e) => { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; });
window.addEventListener('touchend', () => { mouse.x = null; mouse.y = null; });

function resizeCanvas() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Raindrop {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height - canvas.height;
        this.length = Math.random() * 20 + 10;
        this.speed = Math.random() * 10 + 15;
    }
    update() {
        this.y += this.speed;
        if (this.y > canvas.height) {
            this.y = -this.length;
            this.x = Math.random() * canvas.width;
        }
    }
    draw() {
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.length);
        // Use Google Light Grey with transparency
        ctx.strokeStyle = isDayTime ? 'rgba(154, 160, 166, 0.4)' : 'rgba(241, 243, 244, 0.3)';
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        ctx.stroke();
    }
}

class Particle {
    constructor(aqi, pm25, co) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * (pm25 > 35 ? 5 : 2) + 0.5;
        const speedMult = Math.max(0.5, co / 150);
        this.speedX = (Math.random() * 2 - 1) * speedMult;
        this.speedY = (Math.random() * 2 - 1) * speedMult;
        
        // Exact RGB mappings to the Google Color Palette
        const gColors = {
            1: 'rgba(52, 168, 83,',   // Medium Green
            2: 'rgba(251, 188, 4,',   // Yellow
            3: 'rgba(227, 116, 0,',   // Orange
            4: 'rgba(234, 67, 53,',   // Medium Red
            5: 'rgba(165, 14, 14,'    // Red
        };
        
        const alpha = Math.random() * 0.4 + 0.6; // High contrast visibility
        this.color = `${gColors[aqi] || gColors[1]} ${alpha})`;
    }
    update() {
        this.x += this.speedX; this.y += this.speedY;
        if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
        if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;

        if (mouse.x != null && mouse.y != null) {
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < mouse.radius) {
                const forceDirectionX = dx / distance;
                const forceDirectionY = dy / distance;
                const force = (mouse.radius - distance) / mouse.radius;
                const pushSpeed = 4;
                this.x -= forceDirectionX * force * pushSpeed;
                this.y -= forceDirectionY * force * pushSpeed;
            }
        }
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

function initParticles(pm25, co, aqi) {
    // Significantly increase particle count based on AQI level (1 to 5)
    // Multipliers: Good(1x), Fair(2x), Mod(4x), Poor(8x), Very Poor(15x)
    const aqiMultiplier = [1, 2, 4, 8, 15][Math.max(0, aqi - 1)] || 1;
    const baseCount = Math.floor(pm25 * 10);
    
    // Scale up the maximum cap to allow for very dense visual pollution
    const targetCount = Math.min(baseCount * aqiMultiplier, 1500) + (aqi * 50); 
    
    particlesArray = [];
    for (let i = 0; i < targetCount; i++) {
        particlesArray.push(new Particle(aqi, pm25, co));
    }
}

function setWeatherCondition(condition) {
    currentWeather = condition;
    rainArray = [];
    if (condition === 'Rain' || condition === 'Drizzle' || condition === 'Thunderstorm') {
        for (let i = 0; i < 150; i++) rainArray.push(new Raindrop());
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentWeather === 'Clear') {
        let gradient = ctx.createRadialGradient(canvas.width * 0.8, canvas.height * 0.1, 0, canvas.width * 0.8, canvas.height * 0.1, 500);
        
        if (isDayTime) {
            // Google Light Yellow (#FEEFC3)
            gradient.addColorStop(0, 'rgba(254, 239, 195, 0.5)');
            gradient.addColorStop(1, 'rgba(254, 239, 195, 0)');
        } else {
            gradient.addColorStop(0, 'rgba(254, 239, 195, 0.1)');
            gradient.addColorStop(1, 'rgba(254, 239, 195, 0)');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (currentWeather === 'Thunderstorm') {
        if (Math.random() < 0.005) lightningFlash = 1; 
        if (lightningFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${lightningFlash})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            lightningFlash -= 0.05;
        }
    }

    rainArray.forEach(r => { r.update(); r.draw(); });
    particlesArray.forEach(p => { p.update(); p.draw(); });
    
    requestAnimationFrame(animateParticles);
}

// --- 2. UPDATE UI LOGIC ---
function updateUI(data) {
    latestAirQualityData = data; 
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
        grid.innerHTML += `
            <div data-tooltip="${tooltipText}" class="stat-card border border-g-grey-light/10 bg-g-grey-light/5 rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center gap-1 relative">
                <span class="text-[10px] sm:text-xs font-bold text-g-grey uppercase tracking-wider">${m.label}</span>
                <span class="text-xl sm:text-2xl font-medium ${highlightClass}">${m.value}</span>
                <span class="text-[9px] sm:text-[10px] text-g-grey/80">µg/m³</span>
            </div>
        `;
    });

    initParticles(comps.pm2_5, comps.co, aqi);
    
    document.getElementById('ai-response-container').classList.add('hidden');
    document.getElementById('btn-ai').classList.remove('hidden');
}

// --- 3. GRAFIK SPARKLINE ---
function drawSparkline(forecastDataList) {
    const canvas = document.getElementById('pm25-sparkline');
    if (!canvas) return;

    // Create Tooltip Element dynamically if it doesn't exist
    let tooltipEl = document.getElementById('chart-tooltip');
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'chart-tooltip';
        // Force explicit colors for the tooltip to ensure it's visible in both modes
        tooltipEl.className = 'absolute hidden bg-[#202124]/95 text-[#F1F3F4] text-xs py-1.5 px-2.5 rounded-lg border border-[#F1F3F4]/20 shadow-xl z-[100] pointer-events-none transform -translate-x-1/2 -translate-y-full';
        document.body.appendChild(tooltipEl);
    }

    const dataPoints = forecastDataList.map(item => item.components.pm2_5);

    // Clean up old event listeners to prevent duplication
    if (canvas._hoverListener) {
        canvas.removeEventListener('mousemove', canvas._hoverListener);
        canvas.removeEventListener('mouseleave', canvas._leaveListener);
    }

    // Attach Hover Listener
    canvas._hoverListener = (e) => {
        const rect = canvas.getBoundingClientRect();
        const cssMouseX = e.clientX - rect.left;
        
        const cssPLeft = 35;
        const cssPRight = 15;
        const cssDrawW = rect.width - cssPLeft - cssPRight;
        const cssStep = cssDrawW / Math.max((dataPoints.length - 1), 1);

        let index = Math.round((cssMouseX - cssPLeft) / cssStep);
        
        // Check if mouse is hovering within the valid chart X bounds (with small buffer)
        if (index >= 0 && index < dataPoints.length && cssMouseX >= cssPLeft - cssStep && cssMouseX <= (rect.width - cssPRight + cssStep)) {
            // Strictly bound the index
            index = Math.max(0, Math.min(index, dataPoints.length - 1));
            
            const val = dataPoints[index];
            const dataItem = forecastDataList[index];
            
            // Format time for tooltip
            let localTime = new Date(dataItem.dt * 1000);
            if (isTimezoneSet) {
                const utcTime = localTime.getTime() + (localTime.getTimezoneOffset() * 60000);
                localTime = new Date(utcTime + (currentTimezoneOffset * 1000));
            }
            const timeStr = localTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            
            tooltipEl.innerHTML = `
                <div class="font-bold text-[#D2E3FC]">${val.toFixed(1)} <span class="text-[9px] font-normal text-[#9AA0A6]">µg/m³</span></div>
                <div class="text-[10px] text-[#F1F3F4] mt-0.5">${timeStr}</div>
            `;
            
            tooltipEl.style.left = `${e.pageX}px`;
            tooltipEl.style.top = `${e.pageY - 15}px`;
            tooltipEl.classList.remove('hidden');
            
            renderSparklineCanvas(forecastDataList, index);
        } else {
            tooltipEl.classList.add('hidden');
            renderSparklineCanvas(forecastDataList, -1);
        }
    };

    // Attach Leave Listener
    canvas._leaveListener = () => {
        tooltipEl.classList.add('hidden');
        renderSparklineCanvas(forecastDataList, -1);
    };

    canvas.addEventListener('mousemove', canvas._hoverListener);
    canvas.addEventListener('mouseleave', canvas._leaveListener);

    // Initial render without hover
    renderSparklineCanvas(forecastDataList, -1);
}

// Sparkline Render Helper
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

    // Draw Y-axis labels
    ctx.font = `${10 * dpr}px 'Google Sans', sans-serif`;
    ctx.fillStyle = "#9AA0A6"; // g-grey
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
        if (isTimezoneSet) {
            const utcTime = localTime.getTime() + (localTime.getTimezoneOffset() * 60000);
            localTime = new Date(utcTime + (currentTimezoneOffset * 1000));
        }
        const timeStr = localTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        ctx.fillText(timeStr, x, pTop + drawH + (6 * dpr));
    }

    // Draw Sparkline Path
    ctx.beginPath();
    ctx.strokeStyle = '#4285F4'; // Google Medium Blue
    ctx.lineWidth = 2.5 * dpr;
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
        ctx.strokeStyle = 'rgba(154, 160, 166, 0.5)';
        ctx.lineWidth = 1 * dpr;
        ctx.setLineDash([4 * dpr, 4 * dpr]);
        ctx.moveTo(hx, pTop);
        ctx.lineTo(hx, pTop + drawH);
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash

        // Highlight dot
        ctx.beginPath();
        ctx.arc(hx, hy, 4 * dpr, 0, 2 * Math.PI);
        ctx.fillStyle = '#202124'; // Dark background
        ctx.fill();
        ctx.lineWidth = 2 * dpr;
        ctx.strokeStyle = '#D2E3FC'; // Google Light Blue border
        ctx.stroke();
    }
}

// --- 4. INTEGRASI GEMINI API (LLM) ---
const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || ""; 

async function fetchGeminiWithRetry(prompt, retries = 5) {
    const delays = [1000, 2000, 4000, 8000, 16000];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`;
    
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

async function analyzeAirWithGemini() {
    if (!latestAirQualityData) return;
    
    const btn = document.getElementById('btn-ai');
    const container = document.getElementById('ai-response-container');
    const loading = document.getElementById('ai-loading');
    const content = document.getElementById('ai-content');

    btn.classList.add('hidden');
    container.classList.remove('hidden');
    loading.classList.remove('hidden');
    loading.classList.add('flex');
    content.innerText = '';

    const data = latestAirQualityData;
    const locationText = document.getElementById('location-name').innerText;
    const promptData = `Tolong analisis kondisi udara di ${locationText} ini. Cuaca: ${currentWeather}. AQI: ${data.main.aqi} (Skala 1-5). PM2.5: ${data.components.pm2_5} µg/m³. CO: ${data.components.co} µg/m³. NO2: ${data.components.no2} µg/m³.`;

    try {
        const aiResponse = await fetchGeminiWithRetry(promptData);
        loading.classList.add('hidden');
        loading.classList.remove('flex');
        
        // Custom SVG String to be injected into HTML content for the Gemini Logo
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

// Bind event listener to the button
document.getElementById('btn-ai').addEventListener('click', analyzeAirWithGemini);

// --- 5. LOKASI, CUACA & FETCH DATA ---
async function fetchLocationName(lat, lon) {
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

async function searchLocation(query) {
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
            currentLat = parseFloat(data[0].lat);
            currentLon = parseFloat(data[0].lon);
            
            // Reformat display name to City/Region
            let displayName = data[0].display_name.split(',').slice(0, 2).join(',').trim();
            document.getElementById('location-name').innerText = displayName;

            // Close search UI
            searchContainer.classList.add('hidden');
            searchContainer.classList.remove('flex');
            locHeader.classList.remove('hidden');
            searchInput.value = '';

            await fetchRealAirData(currentLat, currentLon);
            startAutoSync(); // Restart the 15-minute background timer
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

async function fetchRealAirData(lat, lon) {
    try {
        try {
            const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=en`;
            const weatherRes = await fetch(weatherUrl);
            const weatherData = await weatherRes.json();
            
            if (weatherData && weatherData.weather) {
                // Apply the new timezone offset and instantly force a clock update
                currentTimezoneOffset = weatherData.timezone || 0;
                isTimezoneSet = true;
                updateDateTime();
                
                const condition = weatherData.weather[0].main; 
                const desc = weatherData.weather[0].description;
                const iconCode = weatherData.weather[0].icon; 
                const temp = Math.round(weatherData.main.temp);
                
                isDayTime = iconCode.includes('d');
                
                const body = document.getElementById('body-bg');
                if (isDayTime) {
                    body.classList.add('theme-day');
                } else {
                    body.classList.remove('theme-day');
                }

                let icon = '☁️';
                if (condition === 'Clear') icon = isDayTime ? '☀️' : '🌙';
                if (condition === 'Rain' || condition === 'Drizzle') icon = '🌧️';
                if (condition === 'Thunderstorm') icon = '⛈️';

                document.getElementById('weather-status').innerHTML = `${icon} ${temp}°C | ${desc.toUpperCase()}`;
                setWeatherCondition(condition);
            }
        } catch(e) {
            console.error("Gagal memuat cuaca saat ini", e);
        }

        try {
            const forecastUrl = `https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
            const forecastRes = await fetch(forecastUrl);
            const forecastData = await forecastRes.json();
            if (forecastData && forecastData.list) {
                // IMPORTANT FIX: Pass the entire list of 24 entries to extract both PM2.5 and timestamps
                const next24hPollution = forecastData.list.slice(0, 24);
                drawSparkline(next24hPollution);
            }
        } catch(e) {
            console.error("Gagal memuat sparkline trend polusi", e);
        }

        try {
            const weatherForecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=en`;
            const wfRes = await fetch(weatherForecastUrl);
            const wfData = await wfRes.json();

            if (wfData && wfData.list) {
                const forecastContainer = document.getElementById('weather-forecast-container');
                forecastContainer.innerHTML = ''; 
                const next24h = wfData.list.slice(0, 8);

                next24h.forEach(item => {
                    const date = new Date(item.dt * 1000);
                    const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                    
                    let fIcon = '☁️';
                    if (item.weather[0].main === 'Clear') fIcon = item.weather[0].icon.includes('d') ? '☀️' : '🌙';
                    if (item.weather[0].main === 'Rain' || item.weather[0].main === 'Drizzle') fIcon = '🌧️';
                    if (item.weather[0].main === 'Thunderstorm') fIcon = '⛈️';

                    forecastContainer.innerHTML += `
                        <div class="flex flex-col items-center min-w-[65px] bg-g-grey-light/5 rounded-lg p-2 border border-g-grey-light/10 shrink-0">
                            <span class="text-[10px] text-g-grey">${timeStr}</span>
                            <span class="text-xl my-1">${fIcon}</span>
                            <span class="text-xs font-bold text-g-grey-light">${Math.round(item.main.temp)}°</span>
                        </div>
                    `;
                });
            }
        } catch(e) {
            console.error("Gagal memuat ramalan cuaca", e);
        }
        
        try {
            const aqUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
            const aqRes = await fetch(aqUrl);
            const aqData = await aqRes.json();
            
            if (aqData && aqData.list && aqData.list.length > 0) {
                updateUI(aqData.list[0]);
                
                // Set UI state ke "Synced" beserta info waktu sinkronisasi terakhir
                let localSyncTime = new Date();
                let gmtString = '';
                if (isTimezoneSet) {
                    const utcTime = localSyncTime.getTime() + (localSyncTime.getTimezoneOffset() * 60000);
                    localSyncTime = new Date(utcTime + (currentTimezoneOffset * 1000));
                    const offsetHours = currentTimezoneOffset / 3600;
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

// --- 6. INITIALIZATION LOOP ---
function initApp() {
    animateParticles();
    
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
        if(searchInput.value.trim() !== '') searchLocation(searchInput.value);
    });

    searchInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter' && searchInput.value.trim() !== '') searchLocation(searchInput.value);
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
                // Initialize map with CartoDB's Dark Matter tiles (styled brighter via CSS)
                map = L.map('map-view').setView([currentLat, currentLon], 10);
                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
                }).addTo(map);

                // Place initial marker
                mapMarker = L.marker([currentLat, currentLon]).addTo(map);

                // Setup click listener to drop new pins
                map.on('click', function(e) {
                    selectedLat = e.latlng.lat;
                    selectedLon = e.latlng.lng;
                    
                    if (mapMarker) {
                        map.removeLayer(mapMarker);
                    }
                    mapMarker = L.marker([selectedLat, selectedLon]).addTo(map);
                    btnConfirmMap.disabled = false; // Enable confirm button
                });
            }, 100);
        } else {
            setTimeout(() => {
                map.invalidateSize();
                map.setView([currentLat, currentLon], 10);
                if (mapMarker) {
                    map.removeLayer(mapMarker);
                }
                mapMarker = L.marker([currentLat, currentLon]).addTo(map);
            }, 100);
        }
    };

    const closeMap = () => {
        mapModal.classList.add('hidden');
        selectedLat = null;
        selectedLon = null;
        btnConfirmMap.disabled = true;
    };

    // Map Event Listeners
    if (btnMapToggle) btnMapToggle.addEventListener('click', openMap);
    if (btnCloseMap) btnCloseMap.addEventListener('click', closeMap);
    if (btnCancelMap) btnCancelMap.addEventListener('click', closeMap);
    
    if (btnConfirmMap) {
        btnConfirmMap.addEventListener('click', async () => {
            if (selectedLat && selectedLon) {
                currentLat = selectedLat;
                currentLon = selectedLon;
                
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

                document.getElementById('location-name').innerText = await fetchLocationName(currentLat, currentLon);
                await fetchRealAirData(currentLat, currentLon);
                startAutoSync();
            }
        });
    }

    // Initial Geolocation setup
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                currentLat = position.coords.latitude;
                currentLon = position.coords.longitude;
                document.getElementById('location-name').innerText = await fetchLocationName(currentLat, currentLon);
                await fetchRealAirData(currentLat, currentLon);
                startAutoSync(); 
            },
            async (err) => {
                console.warn('Geolocation ditolak/error, menggunakan lokasi default (Jakarta).');
                document.getElementById('location-name').innerText = "Jakarta (Default)";
                await fetchRealAirData(currentLat, currentLon);
                startAutoSync(); 
            }
        );
    } else {
        console.warn('Geolocation tidak didukung, menggunakan lokasi default (Jakarta).');
        document.getElementById('location-name').innerText = "Jakarta (Default)";
        fetchRealAirData(currentLat, currentLon).then(() => startAutoSync());
    }
}

window.onload = initApp;