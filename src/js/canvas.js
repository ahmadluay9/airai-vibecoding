import { state } from './state.js';

let canvas, ctx;
let particlesArray = [];
let rainArray = [];
let lightningFlash = 0;
const mouse = { x: null, y: null, radius: 120 };

export function initCanvas() {
    canvas = document.getElementById('canvas-container');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    
    window.addEventListener('mousemove', (e) => { mouse.x = e.x; mouse.y = e.y; });
    window.addEventListener('mouseout', () => { mouse.x = null; mouse.y = null; });
    window.addEventListener('touchmove', (e) => { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; });
    window.addEventListener('touchend', () => { mouse.x = null; mouse.y = null; });
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
}

function resizeCanvas() {
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight;
}

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
        // Use Google Light Grey with transparency, reactive to theme
        ctx.strokeStyle = state.isDayTime ? 'rgba(154, 160, 166, 0.4)' : 'rgba(241, 243, 244, 0.3)';
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

export function initParticles(pm25, co, aqi) {
    const aqiMultiplier = [1, 2, 4, 8, 15][Math.max(0, aqi - 1)] || 1;
    const baseCount = Math.floor(pm25 * 10);
    const targetCount = Math.min(baseCount * aqiMultiplier, 1500) + (aqi * 50); 
    
    particlesArray = [];
    for (let i = 0; i < targetCount; i++) {
        particlesArray.push(new Particle(aqi, pm25, co));
    }
}

export function setWeatherCondition(condition) {
    state.currentWeather = condition;
    rainArray = [];
    if (condition === 'Rain' || condition === 'Drizzle' || condition === 'Thunderstorm') {
        for (let i = 0; i < 150; i++) rainArray.push(new Raindrop());
    }
}

export function animateParticles() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.currentWeather === 'Clear') {
        let gradient = ctx.createRadialGradient(canvas.width * 0.8, canvas.height * 0.1, 0, canvas.width * 0.8, canvas.height * 0.1, 500);
        
        if (state.isDayTime) {
            gradient.addColorStop(0, 'rgba(254, 239, 195, 0.5)'); // Google Light Yellow
            gradient.addColorStop(1, 'rgba(254, 239, 195, 0)');
        } else {
            gradient.addColorStop(0, 'rgba(254, 239, 195, 0.1)');
            gradient.addColorStop(1, 'rgba(254, 239, 195, 0)');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (state.currentWeather === 'Thunderstorm') {
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