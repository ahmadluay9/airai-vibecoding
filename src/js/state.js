// Centralized state to prevent circular dependencies between modules
export const state = {
    API_KEY: import.meta.env.VITE_API_KEY || '',
    GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY || '',
    latestAirQualityData: null,
    currentWeather: 'Clear',
    isDayTime: false,
    currentLat: -6.2088, // Default to Jakarta
    currentLon: 106.8456,
    syncIntervalId: null,
    currentTimezoneOffset: 0,
    isTimezoneSet: false,
    isAudioEnabled: false
};