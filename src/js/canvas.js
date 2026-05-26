import { state } from './state.js';

export function initCanvas() {
    const canvas = document.getElementById('canvas-container');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();
    
    function animate() {
        ctx.clearRect(0,0, canvas.width, canvas.height);
        // Draw some gentle floating particles based on AQI
        ctx.fillStyle = state.isDayTime ? 'rgba(52, 168, 83, 0.2)' : 'rgba(154, 160, 166, 0.1)';
        ctx.beginPath();
        ctx.arc(Math.sin(Date.now()/2000) * 100 + canvas.width/2, Math.cos(Date.now()/3000) * 100 + canvas.height/2, 50, 0, Math.PI*2);
        ctx.fill();
        requestAnimationFrame(animate);
    }
    animate();
}