import { state } from './state.js';

// Robust element selector to handle dynamic class injections that corrupt IDs
export const getEl = (id) => {
    const el = document.getElementById(id);
    if (el) return el;
    try {
        return document.querySelector(`[id^="${id}"]`);
    } catch (e) {
        return null;
    }
};

export function getAQIColorAndLabel(aqi) {
    // Colors mapped exactly to Google News Custom Palette for International AQI (1-5)
    if (aqi === 1) return { 
        color: '#34A853', label: 'Good', border: 'border-g-green-medium/30', text: 'text-g-green-medium', bg: 'bg-g-green-light/30',
        desc: 'Air quality is considered satisfactory, and air pollution poses little or no risk.',
        advice: 'Ideal air quality. Enjoy your normal outdoor activities.'
    };
    if (aqi === 2) return { 
        color: '#FBBC04', label: 'Fair', border: 'border-g-yellow/50', text: 'text-g-yellow', bg: 'bg-g-yellow-light/30',
        desc: 'Air quality is acceptable; however, there may be a moderate health concern for a very small number of people who are unusually sensitive.',
        advice: 'Good day for outdoor activities. Unusually sensitive people should consider reducing prolonged exertion.'
    };
    if (aqi === 3) return { 
        color: '#E37400', label: 'Moderate', border: 'border-g-orange/30', text: 'text-g-orange', bg: 'bg-g-orange/10',
        desc: 'Members of sensitive groups may experience health effects. The general public is not likely to be affected.',
        advice: 'Active children and adults, and people with respiratory disease, such as asthma, should limit prolonged outdoor exertion.'
    };
    if (aqi === 4) return { 
        color: '#EA4335', label: 'Poor', border: 'border-g-red-medium/30', text: 'text-g-red-medium', bg: 'bg-g-red-light/30',
        desc: 'Some members of the general public may experience health effects; sensitive groups may experience more serious health effects.',
        advice: 'High pollution. Everyone should consider limiting strenuous workout outdoor and wear particulate masks (N95).'
    };
    return { 
        color: '#A50E0E', label: 'Very Poor', border: 'border-g-red', text: 'text-g-red', bg: 'bg-g-red-light/80',
        desc: 'Health warnings of emergency conditions. The entire population is more likely to be affected.',
        advice: 'Hazardous conditions. Avoid all outdoor exertion. Remain indoors and keep windows closed.'
    };
}

export function updateDateTime() {
    const now = new Date();
    let localTime = now;
    if (state.isTimezoneSet) {
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
        localTime = new Date(utcTime + (state.currentTimezoneOffset * 1000));
    }
    return localTime;
}

export function initGlobalTooltip() {
    let globalTooltip = document.createElement('div');
    globalTooltip.id = 'global-tooltip';
    globalTooltip.className = 'fixed hidden py-1.5 px-3 rounded-lg text-xs font-medium whitespace-normal max-w-[220px] text-center z-[9999] pointer-events-none drop-shadow-xl transition-opacity duration-150 bg-g-black text-g-grey-light border border-g-grey-dark';
    document.body.appendChild(globalTooltip);

    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('[data-js-tooltip]');
        if (target) {
            const text = target.getAttribute('data-js-tooltip');
            if (!text) return;
            globalTooltip.innerHTML = text;
            globalTooltip.classList.remove('hidden');
            globalTooltip.style.opacity = '1';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!globalTooltip.classList.contains('hidden')) {
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

export function convertHTMLTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach(el => {
        el.setAttribute('data-js-tooltip', el.getAttribute('data-tooltip'));
        el.removeAttribute('data-tooltip');
        el.classList.add('cursor-help');
    });
}