import { state } from './state.js';

let audioCtx = null;
let masterGain = null;
let rainSource = null;
let windSource = null;
let droneOsc1 = null;
let droneOsc2 = null;

let filterRain = null;
let filterWind = null;
let droneGain = null;

// Helper to generate purely procedural white noise
function createNoiseBuffer() {
    const bufferSize = audioCtx.sampleRate * 5; // 5 second loop
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    return buffer;
}

export function initAudio() {
    if (audioCtx) return;
    
    // Initialize Web Audio API
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0; // Start completely muted
    masterGain.connect(audioCtx.destination);

    // 1. Procedural Rain Generator
    rainSource = audioCtx.createBufferSource();
    rainSource.buffer = createNoiseBuffer();
    rainSource.loop = true;
    filterRain = audioCtx.createBiquadFilter();
    filterRain.type = 'lowpass';
    filterRain.frequency.value = 100; // Muffled by default
    rainSource.connect(filterRain).connect(masterGain);
    rainSource.start();

    // 2. Procedural Wind Generator
    windSource = audioCtx.createBufferSource();
    windSource.buffer = createNoiseBuffer();
    windSource.loop = true;
    filterWind = audioCtx.createBiquadFilter();
    filterWind.type = 'lowpass';
    filterWind.frequency.value = 200; // Low rumble by default
    windSource.connect(filterWind).connect(masterGain);
    windSource.start();

    // 3. Toxic Air Drone (Cyberpunk hum for dangerous AQI)
    droneGain = audioCtx.createGain();
    droneGain.gain.value = 0; // Muted by default
    droneGain.connect(masterGain);
    
    droneOsc1 = audioCtx.createOscillator();
    droneOsc1.type = 'sawtooth';
    droneOsc1.frequency.value = 55;
    droneOsc1.connect(droneGain);
    droneOsc1.start();
    
    droneOsc2 = audioCtx.createOscillator();
    droneOsc2.type = 'sine';
    droneOsc2.frequency.value = 50;
    droneOsc2.connect(droneGain);
    droneOsc2.start();

    // Wind Modulation LFO (Sweeps the filter to sound like blowing wind)
    setInterval(() => {
        if (state.isAudioEnabled && audioCtx) {
            const windFreq = 100 + Math.random() * 500;
            filterWind.frequency.setTargetAtTime(windFreq, audioCtx.currentTime, 3);
        }
    }, 4000);
}

export function toggleAudio() {
    state.isAudioEnabled = !state.isAudioEnabled;
    const btnOff = document.getElementById('icon-audio-off');
    const btnOn = document.getElementById('icon-audio-on');
    const btnContainer = document.getElementById('btn-audio-toggle');
    
    if (state.isAudioEnabled) {
        // Browsers require audio context to be started AFTER a user clicks a button
        if (!audioCtx) initAudio();
        audioCtx.resume();
        masterGain.gain.setTargetAtTime(0.5, audioCtx.currentTime, 1);
        
        btnOff.classList.add('hidden');
        btnOn.classList.remove('hidden');
        btnContainer.setAttribute('data-js-tooltip', 'Matikan Ambient Sound');
        
        updateAudioEnvironment(); // Instantly apply current data state to audio
    } else {
        if (masterGain) masterGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5);
        
        btnOff.classList.remove('hidden');
        btnOn.classList.add('hidden');
        btnContainer.setAttribute('data-js-tooltip', 'Aktifkan Ambient Sound');
    }
}

// Function to morph the soundscape based on live API data
export function updateAudioEnvironment() {
    if (!audioCtx || !state.isAudioEnabled) return;
    
    // Morph Weather Sounds
    if (['Rain', 'Drizzle', 'Thunderstorm'].includes(state.currentWeather)) {
        filterRain.frequency.setTargetAtTime(1500, audioCtx.currentTime, 2); // Open filter to hear the rain
        filterWind.frequency.setTargetAtTime(200, audioCtx.currentTime, 2);  // Quiet the wind down
    } else {
        filterRain.frequency.setTargetAtTime(100, audioCtx.currentTime, 2);  // Muffle the rain entirely
    }

    // Morph AQI Sounds
    const currentAqi = state.latestAirQualityData?.main?.aqi || 1;
    if (currentAqi >= 4) {
        // Toxic Vibe: Fade in the dissonant sub-bass drone
        droneGain.gain.setTargetAtTime(0.12, audioCtx.currentTime, 3);
    } else {
        // Safe Vibe: Fade out the drone
        droneGain.gain.setTargetAtTime(0, audioCtx.currentTime, 3);
    }
}