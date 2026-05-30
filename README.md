# Luminair - The smart pulse of your environment

Luminair is an immersive, real-time air quality and weather visualization dashboard that fuses raw atmospheric science with interactive generative art and procedural soundscapes. It provides users with a comprehensive, multi-sensory "vibe" of their local environment by blending precise atmospheric metrics, weather forecasts, ambient audio synthesis, and Google Gemini AI health recommendations tailored to individual demographic profiles.

---

## ✨ Features

- **Real-time Air Quality (AQI):** Detailed breakdown of pollutants (PM2.5, PM10, CO, NO2, O3, SO2) utilizing the OpenWeatherMap Air Pollution API.
- **Dynamic Weather Visuals:** Generative HTML5 background canvas that dynamically changes based on weather conditions (Clear, Clouds, Rain, Storm, Snow) and time of day (Day/Night).
- **Procedural Ambient Audio:** Interactive Web Audio API soundscape synthesizing wind, rain, and toxic sub-bass drones procedurally from scratch depending on real-time atmospheric health.
- **Gemini AI Integration:** Personalized medical/health "atmospheric vibe" analysis, safe-window predictions, action checklists, and pollutant context powered by Google's Gemini AI.
- **Interactive Map Interface:** Global geolocated map centering powered by Leaflet.js and Nominatim reverse-geocoding, allowing users to tap anywhere globally to scan atmospheric health.
- **Multi-day & 24h Trends:** Custom canvas-rendered sparklines showcasing pollutant forecasts and daily maximums.
- **Text-to-Speech Narrator:** Fully integrated SpeechSynthesis interface allowing users to hear their AI climate advisor read out reports.
- **Responsive Theme:** A polished, fully modern dark-themed glassmorphism interface styled with Tailwind CSS v4.

---

## 🛠️ Application Architecture

Luminair is designed with a modern, high-performance web architecture consisting of a rich, client-side frontend, direct external API communication channels, and a containerized cloud backend infrastructure.

```mermaid
graph TD
    subgraph Client Browser [Client-Side Browser Environment]
        MainJS[main.js: App Init] --> State[state.js: App State]
        MainJS --> UI[ui.js: DOM & Sparkline Render]
        MainJS --> Audio[audio.js: Web Audio API Synth]
        MainJS --> Canvas[canvas.js: Generative BG Engine]
        API[api.js: Fetch & AI Engine] --> State
        API --> UI
        API --> Audio
        UI --> TTS[Web Speech TTS Narrator]
        Map[Leaflet Map: Location Selector] --> API
    end

    subgraph External APIs [External Integration Networks]
        API -- Weather / Geocoding --> OWM[OpenWeatherMap API]
        API -- Real-time Radiation --> UV[UV Index API]
        API -- Structured Advisory --> Gemini[Google Gemini AI API]
    end

    subgraph Production Cloud [Containerized Infrastructure]
        Docker[Dockerfile / Cloud Run] --> Nginx[Nginx Web Server]
        Nginx --> |Serves Built Assets| Client Browser
        Docker --> |CMD Sed Injector| SecretInj[Dynamic Runtime Environment Injector]
        SecretInj -.-> |Injects API Keys on Container Start| Client Browser
    end
```

### 1. Frontend (The Client-Side Experience)
The user interface is engineered to run entirely in the browser, using optimized client-side technologies to deliver a fluid, "glassmorphic" experience.

* **Core Logic & State:** Implemented using modular **ES6+ Vanilla JavaScript** (split into `main.js`, `api.js`, `ui.js`, `canvas.js`, `audio.js`, `state.js`, and `utils.js`). By avoiding heavy client-side frameworks, the application loads instantly and executes with minimal overhead. State parameters (like current coordinates, active profiles, and forecast histories) are stored globally inside `state.js`.
* **Styling & UI System:** Built with **Tailwind CSS v4**. It features an elegant glassmorphism theme with smooth backdrop-blur panels, customized typography (Google Sans), fluid hover states, and atmospheric colors that dynamically shift based on current weather and time of day.
* **Procedural Generative Background (`canvas.js`):** An interactive HTML5 Canvas background animation that dynamically matches local weather. It procedurally renders particle systems and visual effects for different weather states:
  * **Clear:** Soft, drifting ambient particles and warm radiant gradients.
  * **Clouds/Mist:** Dense, rolling vapor clouds shifting across the header.
  * **Rain/Drizzle:** Dripping physics-based rain streaks sliding down the screen.
  * **Storm:** Dynamic lightning flashes and turbulent, high-speed particle winds.
  * **Snow:** Floating, slow-falling crystallites.
* **Procedural Audio Synthesis (`audio.js`):** Rather than playing static audio loops, Luminair uses the browser's **Web Audio API** to procedurally synthesize a real-time ambient soundscape from scratch:
  * *Procedural Rain Generator:* Generates falling rain noise by filtering procedurally created white noise buffers via a dynamic `BiquadFilterNode` (lowpass).
  * *Procedural Wind Generator:* Models blowing wind rumbles using modulated noise coupled with an LFO (Low-Frequency Oscillator) that automatically sweeps filter frequencies every 4 seconds.
  * *Cyberpunk Toxic Drone:* Activates a low-frequency, dissonant sub-bass drone (blending a sawtooth and a sine wave oscillator) when the Air Quality Index is dangerous (AQI >= 4).
  * *Real-Time Morphing:* The audio engine dynamically fades elements in/out and widens/closes filter cutoffs based on incoming API weather and pollutant changes.
* **Interactive Geolocation & Maps:**
  * Integrates **Leaflet.js** and **Nominatim API (OpenStreetMap)** to display an interactive vector map.
  * Features a dual-synchronized map system (main sidebar map and an advanced location-selection modal map).
  * Automatically attempts HTML5 GPS Geolocation and falls back to IP-based coordinates (via `get.geojs.io`) or default defaults (Jakarta) if GPS permissions are denied.
* **Interactive Sparklines & Trend Visualizations (`ui.js`):** Draws responsive pollutant curves directly on custom canvas interfaces to represent 24-hour and 5-day trends for PM2.5, PM10, and other components.
* **Text-To-Speech (TTS) Narrator:** Integrates with the browser's native **SpeechSynthesis Web API** to vocally read out the generated AI clinical safety advice. It includes play, pause, resume, and voice prioritization (preferring natural English voices).

### 2. API Integrations
Luminair serves as an intelligent hub that pulls data from multiple external sources and pipes it into an advanced AI model.

* **OpenWeatherMap API:**
  * *Current Weather:* Retrieves real-time temperature, wind speed, wind angle, humidity, atmospheric pressure, and visibility.
  * *Air Pollution (AQI):* Fetches the official Air Quality Index (scale of 1 to 5) alongside exact particulate concentrations (PM2.5, PM10, CO, NO2, O3, SO2).
  * *5-Day Forecast:* Provides temperature forecasts in 3-hour blocks to calculate daily highs and lows.
  * *Air Pollution Forecast:* Supplies predictive pollutant levels used to draw predictive trend lines.
  * *Geocoding:* Performs reverse-geocoding to translate GPS coordinates into human-readable city names.
* **UV Index API:** Obtains real-time UV radiation figures, employing a weather-aware fallback formula if the API reaches its rate limits.
* **Google Gemini AI (`gemini-3.5-flash`):**
  * Communicates directly with the Gemini REST endpoint to analyze atmospheric conditions in real-time.
  * Uses a **Strict JSON Schema** (`responseSchema`) to enforce reliable, structured data payloads containing:
    * `digest`: A clinical 2-sentence atmospheric safety summary.
    * `personalizedAdvice`: Direct advice tailored to the active demographic profile (e.g., Sensitive Groups, Children, Elderly, Active Outdoors, or General).
    * `safeWindow`: Recommended 2-3 hour timeframe for outdoor activities over the next day.
    * `actionChecklist`: Highly actionable tactical items (e.g., "Wear an N95 mask", "Activate HEPA filters").
    * `pollutantContext`: A single explanatory sentence correlating the dominant pollutant with wind/weather causes.
  * Dynamically renders profile-specific panels, manages connection status banners, and reverts to simulated safety advisories if API keys are absent.

### 3. Backend, Containerization, and Deployment (Infrastructure)
While the frontend logic is client-side, the backend architecture is built for containerized, cloud-native deployments.

* **Nginx Web Server:** Operates as the high-performance production server inside a minimal Nginx Alpine image, serving pre-built, compressed static files efficiently.
* **Multi-Stage Dockerfile (`Dockerfile`):**
  * *Build Stage:* Uses a `node:24-slim` container to install node dependencies and execute a production-optimized build using Vite (`npm run build`).
  * *Production Stage:* Copies compiled static assets from `/dist` directly into a lightweight `nginx:alpine` image.
* **Runtime Secret Injection (The `sed` Startup Pattern):**
  * Standard SPAs bake environment variables at compile-time, which normally prevents changing API keys without a complete rebuild.
  * Luminair solves this by leaving placeholders (`PLACEHOLDER_VITE_API_KEY` and `PLACEHOLDER_VITE_GEMINI_API_KEY`) inside the built JavaScript assets.
  * At container launch, a custom `sh` script in the Docker `CMD` sweeps the `/usr/share/nginx/html` directory and uses `sed` on the fly to inject the live production environment variables (`$VITE_API_KEY`, `$VITE_GEMINI_API_KEY`) and the dynamic port (`$PORT`) directly into the served bundle.
  * This allows the same Docker image to be securely deployed across environments while integration secrets remain safely managed in cloud managers.
* **Google Cloud Run Deployment (`deploy-cloud-run.sh`):**
  * Automates deployment using Google Cloud SDK (`gcloud`).
  * Loads configurations from `.env`, verifies key dependencies, and pushes the code as a Serverless Cloud Run service that automatically scales to zero when idle.

---

## 📂 Project Structure

```text
luminair/
│
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD deployment pipeline
│
├── .antigravitycli/            # CLI configuration files
│
├── public/                     # Static assets
│   ├── assets/
│   │   ├── bg/                 # Weather state backdrops
│   │   └── icons/              # Weather/AQI metrics dashboard icons (public copy)
│   └── favicon.ico             # App icon
│
├── src/                        # Source code
│   ├── styles/                 
│   │   └── main.css            # Tailwind v4 entry point & custom rules
│   │
│   ├── js/                     
│   │   ├── main.js             # Application bootstrap & event listener binds
│   │   ├── api.js              # Fetching and AI prompt/JSON schema logic
│   │   ├── ui.js               # UI updates, forecast grouping, & sparkline drawing
│   │   ├── canvas.js           # Generative weather background animation
│   │   ├── audio.js            # Procedural Web Audio API sound synthesis
│   │   ├── state.js            # Global reactive application state
│   │   └── utils.js            # Helper utilities and DOM query shortcuts
│   │
│   └── assets/                 
│       └── fonts/              # Local font files (Google Sans)
│
├── terraform/                  # Terraform Infrastructure-as-Code Configuration
│   ├── main.tf                 # Google Artifact Registry & Cloud Run v2 provisioning
│   ├── providers.tf            # Google cloud provider settings
│   ├── variables.tf            # Deployment variable inputs
│   ├── outputs.tf              # Cloud Run and Artifact Registry URI exports
│   └── terraform.tfvars.example # Template for GCP credentials and API keys
│
├── .env                        # Production/Local environment variables
├── .env.example                # Template for API keys
├── .Dockerignore               # Excluded container building resources
├── Dockerfile                  # Multi-stage production container model
├── nginx.conf                  # Production routing & dynamic PORT support
├── deploy-cloud-run.sh         # Google Cloud Run delivery script
├── index.html                  # Main entry point (Glassmorphic DOM layout)
├── package.json                # Project script specifications & libraries
├── vite.config.js              # Vite bundler configuration
└── README.md                   # Project Documentation
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (Latest LTS recommended)
- API Keys for:
  - [OpenWeatherMap](https://openweathermap.org/api) (Air Quality & Weather)
  - [Google Gemini AI](https://aistudio.google.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ahmadluay9/airai-vibecoding.git
   cd airai-vibecoding
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup environment variables:
   Copy `.env.example` to `.env` and add your API keys.
   ```bash
   cp .env.example .env
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## 📜 License
This project is licensed under the ISC License.
