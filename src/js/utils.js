import { state } from './state.js';

let globalTooltip = null;

// --- GLOBAL TOOLTIP SYSTEM ---
export function initGlobalTooltip() {
    globalTooltip = document.createElement('div');
    globalTooltip.id = 'global-tooltip';
    // Fixed positioning escapes all overflow clipping containers
    globalTooltip.className = 'fixed hidden py-1.5 px-3 rounded-lg text-xs font-medium whitespace-normal max-w-[220px] text-center z-[9999] pointer-events-none drop-shadow-xl transition-opacity duration-150';
    document.body.appendChild(globalTooltip);

    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('[data-js-tooltip]');
        if (target) {
            const text = target.getAttribute('data-js-tooltip');
            if (!text) return;
            
            globalTooltip.innerHTML = text;
            
            // Adapt to the current Theme
            if (document.body.classList.contains('theme-day')) {
                globalTooltip.style.backgroundColor = '#F1F3F4';
                globalTooltip.style.color = '#202124';
                globalTooltip.style.border = '1px solid rgba(32, 33, 36, 0.15)';
            } else {
                globalTooltip.style.backgroundColor = '#202124';
                globalTooltip.style.color = '#F1F3F4';
                globalTooltip.style.border = '1px solid rgba(241, 243, 244, 0.15)';
            }
            
            globalTooltip.classList.remove('hidden');
            globalTooltip.style.opacity = '1';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!globalTooltip.classList.contains('hidden')) {
            // Smart Positioning: Pop down if near the top of the browser, pop up otherwise
            if (e.clientY < 60) {
                globalTooltip.style.transform = 'translate(-50%, 15px)';
            } else {
                globalTooltip.style.transform = 'translate(-50%, calc(-100% - 10px))';
            }
            globalTooltip.style.left = `${e.clientX}px`;
            globalTooltip.style.top = `${e.clientY}px`;
        }
    });

    document.addEventListener('mouseout', (e) => {
        const target = e.target.closest('[data-js-tooltip]');
        if (target) {
            globalTooltip.classList.add('hidden');
            globalTooltip.style.opacity = '0';
        }
    });
}

// Convert HTML CSS-tooltips to JS-tooltips automatically
export function convertHTMLTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach(el => {
        el.setAttribute('data-js-tooltip', el.getAttribute('data-tooltip'));
        el.removeAttribute('data-tooltip');
        el.classList.add('cursor-help');
    });
}

// --- TIME FORMATTING ---
export function updateDateTime() {
    const now = new Date();
    let localTime = now;

    if (state.isTimezoneSet) {
        // Calculate UTC time then apply the specific location's timezone offset
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
        localTime = new Date(utcTime + (state.currentTimezoneOffset * 1000));
    }

    const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = localTime.toLocaleDateString('en-US', optionsDate);
    // Force 24-hour format with colons (HH:MM:SS)
    const timeString = localTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    const datetimeEl = document.getElementById('current-datetime');
    if (datetimeEl) {
        datetimeEl.innerText = `${dateString} | ${timeString} ${state.isTimezoneSet ? '(Local Time)' : ''}`;
    }
}