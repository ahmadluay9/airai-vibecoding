# index.html
```html
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Luminair - The smart pulse of your environment</title>
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    
    <!-- CSS Dependencies -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link rel="stylesheet" href="/src/styles/main.css">
</head>

<body id="body-bg" class="font-sans antialiased text-g-black bg-[#F8F9FA] min-h-screen relative">
    
    <!-- Retained Background Feature -->
    <canvas id="canvas-container"></canvas>

    <!-- Top Alert Banner -->
    <div class="w-full bg-g-black text-g-grey-light text-[10px] py-1.5 text-center font-mono tracking-wide relative z-10">
        <span class="text-g-blue-medium mr-1">●</span> WHO chemical guidelines updated. Check specific pollutant levels for safety updates.
    </div>

    <!-- Header Navigation -->
    <header class="w-full bg-white/90 backdrop-blur-md border-b border-g-grey-light px-6 sm:px-10 py-4 flex flex-col md:flex-row justify-between items-center gap-4 relative z-10 card-shadow">
        <!-- Logo Area -->
        <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-g-black flex items-center justify-center p-2 shadow-sm">
                <img src="/src/assets/icons/luminair-icon.png" alt="Luminair" class="w-full h-full object-contain" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                <svg class="w-6 h-6 text-g-blue-medium hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A4 4 0 002 11V9a2 2 0 00-2-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m-6 9v-1a5 5 0 015-5h1a5 5 0 015 5v1a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path></svg>
            </div>
            <div>
                <div class="text-[10px] font-bold text-g-blue tracking-widest uppercase flex items-center gap-2">Luminair <span class="bg-g-grey-light text-g-grey-dark px-1.5 py-0.5 rounded">V1.5</span></div>
                <h1 class="text-xl sm:text-2xl font-black tracking-tight text-g-black leading-none mt-1">The smart pulse of your environment</h1>
            </div>
        </div>
        
        <!-- Search & GPS -->
        <div class="flex items-center gap-3 w-full md:w-auto">
            <div class="relative flex-1 md:w-80 flex items-center gap-2">
                <div class="relative w-full">
                    <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-g-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    <input type="text" id="location-input" placeholder="Query any global coordinates or town..." class="w-full bg-white border border-g-grey/30 rounded-full pl-9 pr-4 py-2 text-sm text-g-grey-dark focus:outline-none focus:border-g-blue-medium focus:ring-1 focus:ring-g-blue-medium transition-shadow">
                </div>
                <button id="btn-map-toggle" class="bg-white border border-g-grey/30 hover:bg-g-grey-light text-g-grey-dark p-2 rounded-full transition-colors flex items-center justify-center shrink-0" data-js-tooltip="Open Interactive Map">
                    <img src="/src/assets/icons/map.png" alt="Map" class="w-5 h-5 opacity-80" onerror="this.src='https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/map.svg'; this.className='w-5 h-5 opacity-80';"/>
                </button>
            </div>
            <button id="btn-sync-gps" class="bg-g-black hover:bg-[#3c4043] text-white px-5 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 shrink-0">
                <svg class="w-4 h-4 text-g-blue-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>
                Sync GPS
            </button>
        </div>
    </header>

    <!-- Main Container -->
    <main class="max-w-[1400px] mx-auto w-full relative z-10 pb-20">
        
        <!-- Presets Row -->
        <div class="px-6 sm:px-10 py-5 flex items-center gap-3 overflow-x-auto scrollbar-hide">
            <span class="text-[10px] font-bold text-g-grey uppercase tracking-widest shrink-0 mr-2">Exploration Presets:</span>
            <button class="preset-btn px-4 py-1.5 rounded-full border border-g-grey/20 bg-white/60 backdrop-blur-sm text-xs font-semibold text-g-grey-dark hover:border-g-blue-medium hover:text-g-blue transition-colors shrink-0">Singapore</button>
            <button class="preset-btn px-4 py-1.5 rounded-full border border-g-grey/20 bg-white/60 backdrop-blur-sm text-xs font-semibold text-g-grey-dark hover:border-g-blue-medium hover:text-g-blue transition-colors shrink-0">New York</button>
            <button class="preset-btn px-4 py-1.5 rounded-full border border-g-grey/20 bg-white/60 backdrop-blur-sm text-xs font-semibold text-g-grey-dark hover:border-g-blue-medium hover:text-g-blue transition-colors shrink-0">London</button>
            <button class="preset-btn px-4 py-1.5 rounded-full border border-g-grey/20 bg-white/60 backdrop-blur-sm text-xs font-semibold text-g-grey-dark hover:border-g-blue-medium hover:text-g-blue transition-colors shrink-0">Tokyo</button>
            <button class="preset-btn px-4 py-1.5 rounded-full border border-g-grey/20 bg-white/60 backdrop-blur-sm text-xs font-semibold text-g-grey-dark hover:border-g-blue-medium hover:text-g-blue transition-colors shrink-0">Jakarta</button>
        </div>

        <!-- Dashboard Grid Row 1 -->
        <div class="px-6 sm:px-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            <!-- Col 1: AQI -->
            <div class="lg:col-span-5 bg-white/95 backdrop-blur-md border border-g-grey-light rounded-3xl p-8 card-shadow flex flex-col h-full">
                <div class="flex justify-between items-start mb-8">
                    <div>
                        <div class="text-[10px] font-bold text-g-grey tracking-widest uppercase">Atmospheric Health</div>
                        <h2 class="text-xl font-bold text-g-black">Air Quality Index</h2>
                    </div>
                    <div class="bg-[#F8F9FA] border border-g-grey-light px-3 py-1 rounded-full text-[10px] font-bold text-g-grey-dark uppercase tracking-widest flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-g-green-medium animate-pulse"></span> Live Feed
                    </div>
                </div>

                <div class="flex-1 flex flex-col items-center justify-center py-6">
                    <div class="relative w-56 h-32 flex justify-center overflow-hidden">
                        <svg viewBox="0 0 100 50" class="w-full absolute top-0 left-0 overflow-visible">
                            <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--color-g-grey-light)" stroke-width="10" stroke-linecap="round"/>
                            <path id="aqi-gauge-path" d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--color-g-grey)" stroke-width="10" stroke-linecap="round" stroke-dasharray="125.6" stroke-dashoffset="125.6" class="transition-all duration-1000 ease-out"/>
                        </svg>
                        <div class="absolute bottom-0 flex flex-col items-center">
                            <span class="text-[10px] font-bold text-g-grey-dark uppercase tracking-widest mb-1">Intl AQI</span>
                            <span id="aqi-display" class="text-6xl font-black text-g-grey leading-none tracking-tighter">-</span>
                            <span id="aqi-label" class="text-sm font-bold text-g-grey-dark mt-2 bg-white px-2 rounded-full border border-g-grey-light">Calculating</span>
                        </div>
                    </div>
                </div>

                <div class="mt-auto">
                    <h3 id="location-name" class="text-sm font-bold text-g-black mb-1">Locating via GPS...</h3>
                    <p class="text-xs text-g-grey-dark leading-relaxed">Air quality impacts health differently depending on individual sensitivities.</p>
                    <div id="aqi-alert" class="mt-6 bg-white border border-g-grey/20 text-g-grey-dark p-4 rounded-lg flex items-start gap-3 text-sm font-medium hidden">
                        <!-- Filled by JS based on AQI level -->
                    </div>
                </div>
            </div>

            <!-- Col 2: Allergen (Mocked for Visual Parity) -->
            <div class="lg:col-span-4 bg-white/95 backdrop-blur-md border border-g-grey-light rounded-3xl p-8 card-shadow flex flex-col">
                <div class="flex justify-between items-start mb-8">
                    <div>
                        <div class="text-[10px] font-bold text-g-grey tracking-widest uppercase">Organic Triggers</div>
                        <h2 class="text-xl font-bold text-g-black">Allergen Activity</h2>
                    </div>
                    <span class="text-[10px] text-g-grey font-medium">Simulated</span>
                </div>
                
                <div class="space-y-6 flex-1">
                    <div>
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-sm font-bold text-g-grey-dark flex items-center gap-2">🌾 Grass Pollen</span>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded border text-g-red-medium bg-g-red-light/30 border-g-red-medium/30">HIGH</span>
                        </div>
                        <div class="h-1.5 bg-g-grey-light rounded-full w-full mb-1"><div class="h-full bg-g-red-medium rounded-full w-[85%]"></div></div>
                        <p class="text-[10px] text-g-grey italic">Lawn care cut, summer fields. Heavy sneeze factor.</p>
                    </div>
                    <div>
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-sm font-bold text-g-grey-dark flex items-center gap-2">🌲 Tree Pollen</span>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded border text-g-orange bg-g-yellow-light/50 border-g-yellow/50">MODERATE</span>
                        </div>
                        <div class="h-1.5 bg-g-grey-light rounded-full w-full mb-1"><div class="h-full bg-g-yellow rounded-full w-[50%]"></div></div>
                        <p class="text-[10px] text-g-grey italic">Oaks, birches, pines. Classic spring flare-up trigger.</p>
                    </div>
                    <div>
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-sm font-bold text-g-grey-dark flex items-center gap-2">🌱 Weed Pollen</span>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded border text-g-orange bg-g-yellow-light/50 border-g-yellow/50">MODERATE</span>
                        </div>
                        <div class="h-1.5 bg-g-grey-light rounded-full w-full mb-1"><div class="h-full bg-g-yellow rounded-full w-[40%]"></div></div>
                        <p class="text-[10px] text-g-grey italic">Nettles, ragweed, mugwort. Peak late summer irritant.</p>
                    </div>
                    <div>
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-sm font-bold text-g-grey-dark flex items-center gap-2">🍄 Mould Spores</span>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded border text-g-orange bg-g-yellow-light/50 border-g-yellow/50">MODERATE</span>
                        </div>
                        <div class="h-1.5 bg-g-grey-light rounded-full w-full mb-1"><div class="h-full bg-g-yellow rounded-full w-[60%]"></div></div>
                        <p class="text-[10px] text-g-grey italic">Damp decaying foliage, humid walls, cellar dust.</p>
                    </div>
                </div>

                <div class="mt-6 bg-g-blue-light/30 border border-g-blue-light p-4 rounded-lg">
                    <h4 class="text-xs font-bold text-g-blue flex items-center gap-2 mb-1"><span class="text-g-blue-medium">🛡️</span> Asthma Reminder</h4>
                    <p class="text-[10px] text-g-grey-dark leading-relaxed">Ozone and particulate dust act as multipliers for organic pollens. Keep indoors filters active!</p>
                </div>
            </div>

            <!-- Col 3: Geo Ledger & Status -->
            <div class="lg:col-span-3 bg-white/95 backdrop-blur-md border border-g-grey-light rounded-3xl p-8 card-shadow flex flex-col">
                <div class="mb-8">
                    <div class="text-[10px] font-bold text-g-grey tracking-widest uppercase">Location Ledger</div>
                    <h2 class="text-xl font-bold text-g-black">Geographic Info</h2>
                    <p class="text-xs text-g-grey-dark mt-2">Observing local space relative to maritime and terrain currents.</p>
                </div>

                <!-- Added API Status indicator to the top of the ledger -->
                <div class="bg-[#F8F9FA] rounded-xl p-5 space-y-4 font-mono text-xs text-g-grey-dark border border-g-grey-light my-auto">
                    <div class="flex justify-between items-center"><span class="text-g-grey">API Status</span> <span id="api-status" class="font-bold flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-g-grey animate-pulse"></span> Connecting...</span></div>
                    <div class="flex justify-between items-center"><span class="text-g-grey">Latitude</span> <span id="geo-lat" class="font-bold text-g-black">-</span></div>
                    <div class="flex justify-between items-center"><span class="text-g-grey">Longitude</span> <span id="geo-lon" class="font-bold text-g-black">-</span></div>
                    <div class="flex justify-between items-center"><span class="text-g-grey">Network Sync</span> <span id="header-sync" class="font-bold text-g-black">-</span></div>
                    <div class="flex justify-between items-center"><span class="text-g-grey">Weather</span> <span id="header-weather" class="font-bold text-g-black">-</span></div>
                </div>
            </div>
        </div>

        <!-- Dashboard Grid Row 2: Pollutants -->
        <div class="px-6 sm:px-10 py-10">
            <div class="flex justify-between items-end mb-6">
                <div>
                    <div class="text-[10px] font-bold text-g-grey tracking-widest uppercase">Active Metrics</div>
                    <h2 class="text-xl font-bold text-g-black">Chemical Pollutant Breakdown</h2>
                </div>
                <div class="text-xs text-g-grey-dark">Compared against <span class="font-bold text-g-black">WHO Guidelines</span></div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- Pollutant Cards -->
                <div class="bg-white/95 backdrop-blur-md border border-g-grey-light rounded-2xl p-6 card-shadow relative overflow-hidden group hover:border-g-blue-medium transition-colors">
                    <div class="flex justify-between items-start mb-6">
                        <div><h3 class="text-lg font-black text-g-black leading-none">PM2.5</h3><p class="text-[10px] text-g-grey mt-1">Fine Particulates</p></div>
                        <span id="badge-pm25" class="text-[10px] font-bold px-2 py-0.5 rounded border text-g-grey">-</span>
                    </div>
                    <div id="val-pm25" class="text-4xl font-black text-g-black mb-6">-</div>
                    <div class="flex justify-between text-[10px] text-g-grey font-medium mb-2"><span>Guideline: 15µg/m³</span><span id="pct-pm25">-</span></div>
                    <div class="h-2 bg-g-grey-light rounded-full w-full mb-4"><div id="bar-pm25" class="h-full bg-g-grey rounded-full w-0 transition-all duration-700"></div></div>
                </div>

                <div class="bg-white/95 backdrop-blur-md border border-g-grey-light rounded-2xl p-6 card-shadow relative overflow-hidden group hover:border-g-blue-medium transition-colors">
                    <div class="flex justify-between items-start mb-6">
                        <div><h3 class="text-lg font-black text-g-black leading-none">PM10</h3><p class="text-[10px] text-g-grey mt-1">Coarse Dust</p></div>
                        <span id="badge-pm10" class="text-[10px] font-bold px-2 py-0.5 rounded border text-g-grey">-</span>
                    </div>
                    <div id="val-pm10" class="text-4xl font-black text-g-black mb-6">-</div>
                    <div class="flex justify-between text-[10px] text-g-grey font-medium mb-2"><span>Guideline: 45µg/m³</span><span id="pct-pm10">-</span></div>
                    <div class="h-2 bg-g-grey-light rounded-full w-full mb-4"><div id="bar-pm10" class="h-full bg-g-grey rounded-full w-0 transition-all duration-700"></div></div>
                </div>

                <div class="bg-white/95 backdrop-blur-md border border-g-grey-light rounded-2xl p-6 card-shadow relative overflow-hidden group hover:border-g-blue-medium transition-colors">
                    <div class="flex justify-between items-start mb-6">
                        <div><h3 class="text-lg font-black text-g-black leading-none">CO</h3><p class="text-[10px] text-g-grey mt-1">Carbon Monoxide</p></div>
                        <span id="badge-co" class="text-[10px] font-bold px-2 py-0.5 rounded border text-g-grey">-</span>
                    </div>
                    <div id="val-co" class="text-4xl font-black text-g-black mb-6">-</div>
                    <div class="flex justify-between text-[10px] text-g-grey font-medium mb-2"><span>Guideline: 4000µg/m³</span><span id="pct-co">-</span></div>
                    <div class="h-2 bg-g-grey-light rounded-full w-full mb-4"><div id="bar-co" class="h-full bg-g-grey rounded-full w-0 transition-all duration-700"></div></div>
                </div>
                
                <div class="bg-white/95 backdrop-blur-md border border-g-grey-light rounded-2xl p-6 card-shadow relative overflow-hidden group hover:border-g-blue-medium transition-colors">
                    <div class="flex justify-between items-start mb-6">
                        <div><h3 class="text-lg font-black text-g-black leading-none">NO2</h3><p class="text-[10px] text-g-grey mt-1">Nitrogen Dioxide</p></div>
                        <span id="badge-no2" class="text-[10px] font-bold px-2 py-0.5 rounded border text-g-grey">-</span>
                    </div>
                    <div id="val-no2" class="text-4xl font-black text-g-black mb-6">-</div>
                    <div class="flex justify-between text-[10px] text-g-grey font-medium mb-2"><span>Guideline: 25µg/m³</span><span id="pct-no2">-</span></div>
                    <div class="h-2 bg-g-grey-light rounded-full w-full mb-4"><div id="bar-no2" class="h-full bg-g-grey rounded-full w-0 transition-all duration-700"></div></div>
                </div>

                <div class="bg-white/95 backdrop-blur-md border border-g-grey-light rounded-2xl p-6 card-shadow relative overflow-hidden group hover:border-g-blue-medium transition-colors">
                    <div class="flex justify-between items-start mb-6">
                        <div><h3 class="text-lg font-black text-g-black leading-none">O3</h3><p class="text-[10px] text-g-grey mt-1">Ozone</p></div>
                        <span id="badge-o3" class="text-[10px] font-bold px-2 py-0.5 rounded border text-g-grey">-</span>
                    </div>
                    <div id="val-o3" class="text-4xl font-black text-g-black mb-6">-</div>
                    <div class="flex justify-between text-[10px] text-g-grey font-medium mb-2"><span>Guideline: 100µg/m³</span><span id="pct-o3">-</span></div>
                    <div class="h-2 bg-g-grey-light rounded-full w-full mb-4"><div id="bar-o3" class="h-full bg-g-grey rounded-full w-0 transition-all duration-700"></div></div>
                </div>

                <div class="bg-white/95 backdrop-blur-md border border-g-grey-light rounded-2xl p-6 card-shadow relative overflow-hidden group hover:border-g-blue-medium transition-colors">
                    <div class="flex justify-between items-start mb-6">
                        <div><h3 class="text-lg font-black text-g-black leading-none">SO2</h3><p class="text-[10px] text-g-grey mt-1">Sulphur Dioxide</p></div>
                        <span id="badge-so2" class="text-[10px] font-bold px-2 py-0.5 rounded border text-g-grey">-</span>
                    </div>
                    <div id="val-so2" class="text-4xl font-black text-g-black mb-6">-</div>
                    <div class="flex justify-between text-[10px] text-g-grey font-medium mb-2"><span>Guideline: 40µg/m³</span><span id="pct-so2">-</span></div>
                    <div class="h-2 bg-g-grey-light rounded-full w-full mb-4"><div id="bar-so2" class="h-full bg-g-grey rounded-full w-0 transition-all duration-700"></div></div>
                </div>
            </div>
        </div>

        <!-- Dashboard Grid Row 3: Retained Tools (Forecast & Sparkline) -->
        <div class="px-6 sm:px-10 pb-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white/95 backdrop-blur-md border border-g-grey-light rounded-2xl p-6 card-shadow">
                <div class="flex justify-between items-center mb-4">
                    <span class="text-[10px] font-bold text-g-grey uppercase tracking-widest">Prediksi PM2.5</span>
                    <div class="flex gap-1 bg-[#F8F9FA] border border-g-grey-light rounded p-0.5">
                        <button id="btn-aqi-24h" class="text-[9px] font-bold px-2 py-1 rounded shadow-sm bg-white text-g-blue-medium">24H</button>
                        <button id="btn-aqi-5d" class="text-[9px] font-bold px-2 py-1 rounded text-g-grey hover:text-g-black transition-colors">5D</button>
                    </div>
                </div>
                <canvas id="pm25-sparkline" width="600" height="60" class="w-full h-[60px]"></canvas>
            </div>
            
            <div class="bg-white/95 backdrop-blur-md border border-g-grey-light rounded-2xl p-6 card-shadow">
                <div class="flex justify-between items-center mb-4">
                    <span class="text-[10px] font-bold text-g-grey uppercase tracking-widest">Prakiraan Cuaca</span>
                    <div class="flex gap-1 bg-[#F8F9FA] border border-g-grey-light rounded p-0.5">
                        <button id="btn-weather-24h" class="text-[9px] font-bold px-2 py-1 rounded shadow-sm bg-white text-g-blue-medium">24H</button>
                        <button id="btn-weather-5d" class="text-[9px] font-bold px-2 py-1 rounded text-g-grey hover:text-g-black transition-colors">5D</button>
                    </div>
                </div>
                <div id="weather-forecast-container" class="flex overflow-x-auto gap-3 pb-2 scrollbar-hide min-h-[70px]"></div>
            </div>
        </div>

        <!-- Dashboard Grid Row 4: AI Clinician Advisory -->
        <div class="px-6 sm:px-10 pb-12">
            <div class="bg-g-black rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
                <!-- AI Loading State -->
                <div id="ai-loading" class="flex flex-col items-center justify-center py-20 relative z-10 hidden">
                    <svg class="animate-spin h-8 w-8 text-g-blue-medium mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span class="text-g-blue-light text-sm font-medium tracking-wide">Synthesizing clinical data...</span>
                </div>

                <!-- AI Content State -->
                <div id="ai-content-block" class="relative z-10">
                    <div class="flex items-center gap-3 mb-8">
                        <div class="w-10 h-10 rounded-lg bg-g-blue-medium/20 flex items-center justify-center">
                            <span class="text-xl">✨</span>
                        </div>
                        <div>
                            <div class="text-[10px] font-bold text-g-blue-medium tracking-widest uppercase">AI Cognitive Guard</div>
                            <h2 class="text-2xl font-black text-white leading-none mt-1">AI Clinician Advisory</h2>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div class="lg:col-span-2 space-y-6">
                            <div class="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <h3 class="text-[10px] font-bold text-g-blue-medium tracking-widest uppercase mb-3">Atmospheric Safety Digest</h3>
                                <p id="ai-digest" class="text-g-grey-light leading-relaxed font-medium">Monitoring conditions locally. Waiting for environmental sensor sync...</p>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 border border-white/10 rounded-2xl p-6">
                                <div>
                                    <div class="flex justify-between items-center mb-4">
                                        <h3 class="text-sm font-bold text-white">Vulnerable Individuals</h3>
                                        <span id="ai-vuln-risk" class="text-[10px] font-bold text-g-grey">-</span>
                                    </div>
                                    <ul id="ai-vuln-bullets" class="text-xs text-g-grey-light space-y-3"></ul>
                                </div>
                                <div>
                                    <h3 class="text-sm font-bold text-white mb-4">General Population</h3>
                                    <ul id="ai-gen-bullets" class="text-xs text-g-grey-light space-y-3"></ul>
                                </div>
                            </div>
                        </div>

                        <div class="lg:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
                            <div class="flex justify-between items-center mb-4">
                                <h3 class="text-[10px] font-bold text-g-grey tracking-widest uppercase">Breathing Helper</h3>
                                <span class="w-2 h-2 rounded-full bg-g-blue-medium animate-pulse"></span>
                            </div>
                            <div class="flex-1 bg-[#1A1A1C] rounded-xl flex items-center justify-center relative overflow-hidden min-h-[200px] border border-white/10 mb-6">
                                <div id="pacer-circle" class="w-32 h-32 rounded-full border-2 border-white/20 flex items-center justify-center transition-all duration-[4000ms] ease-in-out">
                                    <span id="pacer-text" class="text-xs font-medium text-g-grey-light transition-colors">Ready to guide</span>
                                </div>
                            </div>
                            <button id="btn-pacer" class="w-full bg-g-blue-medium hover:bg-g-blue text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 text-sm mt-auto">
                                🧘 Start Breathing Pacer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- Map Modal -->
    <div id="map-modal" class="hidden fixed inset-0 z-[200] bg-g-black/80 backdrop-blur-sm flex items-center justify-center">
        <div class="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl m-4 border border-g-grey-light">
            <div class="p-4 border-b border-g-grey-light flex justify-between items-center">
                <h3 class="font-bold text-g-black">Select Location</h3>
                <button id="btn-close-map" class="text-g-grey hover:text-g-red-medium text-2xl leading-none">&times;</button>
            </div>
            <div id="map-view" class="w-full h-96 bg-[#F8F9FA]"></div>
            <div class="p-4 bg-[#F8F9FA] flex justify-end gap-3 border-t border-g-grey-light">
                <button id="btn-cancel-map" class="px-4 py-2 text-sm font-medium text-g-grey-dark hover:bg-g-grey-light rounded-lg">Cancel</button>
                <button id="btn-confirm-map" disabled class="px-4 py-2 text-sm font-medium text-white bg-g-blue-medium hover:bg-g-blue rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">Confirm location</button>
            </div>
        </div>
    </div>

    <!-- Leaflet JS -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    
    <!-- Module Script -->
    <script type="module" src="/src/js/main.js"></script>
</body>
</html>
```

# src/js/main.js
```javascript
import { state } from './state.js';
import { initCanvas } from './canvas.js';
import { performLocationSync, fetchLocationName, fetchRealAirData, analyzeAirWithGemini, searchLocation } from './api.js';
import { toggleForecastMode } from './ui.js';

const startAutoSync = () => {
    if (state.syncIntervalId) clearInterval(state.syncIntervalId);
    state.syncIntervalId = setInterval(async () => {
        await fetchRealAirData(state.currentLat, state.currentLon);
    }, 15 * 60 * 1000); 
};

function initMapModal() {
    const modal = document.getElementById('map-modal');
    const openBtn = document.getElementById('btn-map-toggle');
    const closeBtn = document.getElementById('btn-close-map');
    const cancelBtn = document.getElementById('btn-cancel-map');
    const confirmBtn = document.getElementById('btn-confirm-map');
    
    let map, marker;
    let tempLat = state.currentLat, tempLon = state.currentLon;

    const openModal = () => {
        if (modal) modal.classList.remove('hidden');
        setTimeout(() => {
            if(!map) {
                if (typeof L === 'undefined') return;
                map = L.map('map-view').setView([state.currentLat, state.currentLon], 10);
                L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);
                marker = L.marker([state.currentLat, state.currentLon]).addTo(map);
                
                map.on('click', (e) => {
                    tempLat = e.latlng.lat;
                    tempLon = e.latlng.lng;
                    marker.setLatLng([tempLat, tempLon]);
                    if (confirmBtn) confirmBtn.disabled = false;
                });
            } else {
                map.invalidateSize();
                map.setView([state.currentLat, state.currentLon], 10);
                marker.setLatLng([state.currentLat, state.currentLon]);
                if (confirmBtn) confirmBtn.disabled = true;
            }
        }, 100);
    };

    const closeModal = () => {
        if (modal) modal.classList.add('hidden');
    };

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            state.currentLat = tempLat;
            state.currentLon = tempLon;
            closeModal();
            const locName = document.getElementById('location-name');
            if (locName) locName.innerText = "Locating on Map...";
            if (locName) locName.innerText = await fetchLocationName(tempLat, tempLon);
            await fetchRealAirData(tempLat, tempLon);
            analyzeAirWithGemini();
        });
    }
}

function initApp() {
    initCanvas();
    initMapModal();
    
    performLocationSync().then(startAutoSync);

    // Bind Forecast Toggles
    const btnAqi24h = document.getElementById('btn-aqi-24h');
    const btnAqi5d = document.getElementById('btn-aqi-5d');
    const btnWeather24h = document.getElementById('btn-weather-24h');
    const btnWeather5d = document.getElementById('btn-weather-5d');

    if (btnAqi24h) btnAqi24h.addEventListener('click', () => toggleForecastMode('aqi', '24h'));
    if (btnAqi5d) btnAqi5d.addEventListener('click', () => toggleForecastMode('aqi', '5d'));
    if (btnWeather24h) btnWeather24h.addEventListener('click', () => toggleForecastMode('weather', '24h'));
    if (btnWeather5d) btnWeather5d.addEventListener('click', () => toggleForecastMode('weather', '5d'));

    const btnSync = document.getElementById('btn-sync-gps');
    if (btnSync) {
        btnSync.addEventListener('click', () => {
            performLocationSync().then(startAutoSync);
        });
    }
    
    const searchInput = document.getElementById('location-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && searchInput.value.trim() !== '') {
                searchLocation(searchInput.value, startAutoSync);
            }
        });
    }

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const city = e.target.innerText;
            if (searchInput) searchInput.value = city;
            searchLocation(city, startAutoSync);
        });
    });
    
    const pacerBtn = document.getElementById('btn-pacer');
    const pacerCircle = document.getElementById('pacer-circle');
    const pacerText = document.getElementById('pacer-text');
    let pacerInterval;
    
    if (pacerBtn && pacerCircle && pacerText) {
        pacerBtn.addEventListener('click', () => {
            if (pacerBtn.innerText.includes('Start')) {
                pacerBtn.innerText = 'Stop Pacer';
                // Use g-red-medium for stopping
                pacerBtn.classList.replace('bg-g-blue-medium', 'bg-g-red-medium');
                pacerBtn.classList.replace('hover:bg-g-blue', 'hover:bg-g-red');
                pacerText.innerText = 'Inhale...';
                let inhale = true;
                pacerInterval = setInterval(() => {
                    inhale = !inhale;
                    pacerText.innerText = inhale ? 'Inhale...' : 'Exhale...';
                    pacerCircle.style.transform = inhale ? 'scale(1.5)' : 'scale(1)';
                    // Pulse between Google Green and Google Blue
                    pacerCircle.style.borderColor = inhale ? '#34A853' : '#4285F4';
                }, 4000);
            } else {
                clearInterval(pacerInterval);
                pacerBtn.innerText = 'Start Breathing Pacer';
                pacerBtn.classList.replace('bg-g-red-medium', 'bg-g-blue-medium');
                pacerBtn.classList.replace('hover:bg-g-red', 'hover:bg-g-blue');
                pacerCircle.style.transform = 'scale(1)';
                pacerCircle.style.borderColor = 'rgba(255,255,255,0.2)';
                pacerText.innerText = 'Ready to guide';
            }
        });
    }
}

window.addEventListener('DOMContentLoaded', initApp);
```

```