// --- 0. GLOBAL STATE & UTILS ---
const API_KEY = import.meta.env.VITE_API_KEY || '';
let latestAirQualityData = null;
let currentWeather = 'Clear';
let isDayTime = false;
let rainArray = [];
let lightningFlash = 0;

function updateDateTime() {
    const now = new Date();
    const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('id-ID', optionsDate);
    const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    document.getElementById('current-datetime').innerText = `${dateString} | ${timeString}`;
}
setInterval(updateDateTime, 1000);
updateDateTime();

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
    const targetCount = Math.min(Math.floor(pm25 * 8), 500) + 50; 
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

    metrics.forEach(m => {
        const highlightClass = m.highlight ? 'text-g-red-medium glow-text' : 'text-g-grey-light';
        grid.innerHTML += `
            <div class="stat-card border border-g-grey-light/10 bg-g-grey-light/5 rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center gap-1">
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
function drawSparkline(dataPoints) {
    const canvas = document.getElementById('pm25-sparkline');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    if (!dataPoints || dataPoints.length === 0) return;

    const max = Math.max(...dataPoints, 50); 
    const min = 0;
    const step = width / (dataPoints.length - 1);

    ctx.beginPath();
    ctx.strokeStyle = '#4285F4'; // Google Medium Blue
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    let gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(66, 133, 244, 0.6)');
    gradient.addColorStop(1, 'rgba(66, 133, 244, 0.0)');

    ctx.moveTo(0, height - ((dataPoints[0] - min) / (max - min)) * height);
    for (let i = 1; i < dataPoints.length; i++) {
        const x = i * step;
        const y = height - ((dataPoints[i] - min) / (max - min)) * height;
        ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
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
        // Rely on inherited colors so the text perfectly matches the Day/Night theme 
        // without hardcoding arbitrary Tailwind colors that might fail to compile.
        content.innerHTML = `<p class="mb-2 font-bold opacity-80">✨ Analisis NAPAS AI:</p>` + 
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
        const response = await fetch(url, { headers: { 'Accept-Language': 'id-ID,id;q=0.9' }});
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

async function fetchRealAirData(lat, lon) {
    try {
        try {
            const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=id`;
            const weatherRes = await fetch(weatherUrl);
            const weatherData = await weatherRes.json();
            
            if (weatherData && weatherData.weather) {
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
                const pm25Trend = forecastData.list.slice(0, 24).map(item => item.components.pm2_5);
                drawSparkline(pm25Trend);
            }
        } catch(e) {
            console.error("Gagal memuat sparkline trend polusi", e);
        }

        try {
            const weatherForecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=id`;
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
                document.getElementById('status-text').innerText = "DATA SYNCED";
                document.getElementById('status-text').classList.replace('text-g-green-medium', 'text-g-blue-medium');
                document.getElementById('ping-dot').classList.add('hidden'); 
                document.getElementById('ping-solid').classList.replace('bg-g-green-medium', 'bg-g-blue-medium');
            }
        } catch(e) {
            console.error("Gagal memuat kualitas udara", e);
        }

    } catch (error) {
        console.error("Kesalahan jaringan:", error);
        document.getElementById('status-text').innerText = "SYNC FAILED";
        document.getElementById('status-text').classList.replace('text-g-green-medium', 'text-g-red-medium');
        document.getElementById('ping-dot').classList.add('hidden');
        document.getElementById('ping-solid').classList.replace('bg-g-green-medium', 'bg-g-red-medium');
    }
}

// --- 6. INITIALIZATION LOOP ---
function initApp() {
    animateParticles();
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                document.getElementById('location-name').innerText = await fetchLocationName(lat, lon);
                await fetchRealAirData(lat, lon);
            },
            async (err) => {
                console.warn('Geolocation ditolak/error, menggunakan lokasi default (Jakarta).');
                const defaultLat = -6.2088;
                const defaultLon = 106.8456;
                document.getElementById('location-name').innerText = "Jakarta (Default)";
                await fetchRealAirData(defaultLat, defaultLon);
            }
        );
    } else {
        console.warn('Geolocation tidak didukung, menggunakan lokasi default (Jakarta).');
        const defaultLat = -6.2088;
        const defaultLon = 106.8456;
        document.getElementById('location-name').innerText = "Jakarta (Default)";
        fetchRealAirData(defaultLat, defaultLon);
    }
}

window.onload = initApp;