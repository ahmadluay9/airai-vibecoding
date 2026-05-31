// By using strict Vite statics, we ensure Vite correctly compiles the env vars into the browser code.
const getApiKey = () => {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
        return import.meta.env.VITE_API_KEY;
    }
    return '';
};

const getGeminiKey = () => {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
        return import.meta.env.VITE_GEMINI_API_KEY;
    }
    return '';
};

export const state = {
    API_KEY: getApiKey(), 
    GEMINI_API_KEY: getGeminiKey(),
    
    // Live Data Storage
    latestAirQualityData: null,
    
    // System Status
    apiStatus: 'Connecting...',
    
    // User Profile for AI
    userProfile: 'General',
    
    currentWeather: 'Clear',
    isDayTime: true,
    currentLat: -6.2088,
    currentLon: 106.8456,
    syncIntervalId: null,
    currentTimezoneOffset: 0,
    isTimezoneSet: false,
    isAudioEnabled: false,

    // Forecast Tracking
    forecastMode: '24h',
    weatherForecastData24h: [],
    weatherForecastData5d: [],
    
    // PM2.5 Tracking
    selectedPollutant: 'pm2_5',
    pm25ForecastMode: '24h',
    pm25ForecastData24h: [],
    pm25ForecastData5d: [],

    // Multimodal Toggling Mode
    isMultimodalOnly: false
};