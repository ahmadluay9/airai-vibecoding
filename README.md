# Luminair - The smart pulse of your environment

Luminair is a real-time air quality and weather visualization dashboard that blends data with generative art. It provides users with a "vibe" of their current environment using atmospheric data, ambient visuals, and AI-powered insights.

## ✨ Features

- **Real-time Air Quality (AQI):** Detailed breakdown of pollutants (PM2.5, PM10, NO2, etc.) using OpenWeatherMap API.
- **Dynamic Weather Visuals:** Generative background canvas that changes based on weather conditions (Clear, Clouds, Rain, etc.).
- **Gemini AI Integration:** Get personalized "atmospheric vibe" analysis and health recommendations powered by Google's Gemini AI.
- **Interactive Map:** Choose your location globally using an integrated Leaflet map with Nominatim geocoding.
- **Predictive Trends:** 24-hour sparkline forecast for PM2.5 levels.
- **Responsive Design:** A polished, "glassmorphic" UI built with Tailwind CSS v4.

## 🛠️ Project Structure

```text
luminair/
│
├── public/                     # Static assets
│   └── favicon.ico             # App icon
│
├── src/                        # Source code
│   ├── styles/                 
│   │   └── main.css            # Tailwind v4 entry point
│   │
│   ├── js/                     
│   │   ├── main.js             # App logic & initialization
│   │   ├── api.js              # Fetching data from APIs
│   │   ├── ui.js               # DOM manipulation & Sparklines
│   │   ├── canvas.js           # Generative art background
│   │   └── utils.js            # Helper functions
│   │
│   └── assets/                 
│       └── fonts/              # Local font files (Google Sans)
│
├── .env.example                # Template for API keys
├── index.html                  # Main entry point
├── package.json                # Dependencies & Scripts
├── vite.config.js              # Vite configuration
└── README.md                   # Documentation
```

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
