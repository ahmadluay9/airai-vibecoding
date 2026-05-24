# airai-vibecoding

napas-live-air-vibe/
│
├── public/                     # Static assets (Served directly, not processed by Vite)
│   └── favicon.ico             # App icon
│
├── src/                        # Source code (Processed and bundled by Vite)
│   ├── styles/                 
│   │   └── main.css            # Tailwind v4 entry point (@import "tailwindcss" & @theme)
│   │
│   ├── js/                     
│   │   └── main.js             # Modular JavaScript (App logic, API, Canvas)
│   │
│   └── assets/                 
│       └── fonts/              # Local font files for @font-face
│           ├── GoogleSans-Variable.ttf
│           └── GoogleSans-Italic-Variable.ttf
│
├── .env                        # Environment variables (VITE_API_KEY, VITE_GEMINI_API_KEY)
├── .env.example                # Template for environment variables (safe to commit)
├── .gitignore                  # Ignored files (node_modules/, .env, dist/)
├── index.html                  # Main HTML entry point (MUST be in the root for Vite!)
├── package.json                # NPM dependencies and scripts (dev, build, preview)
├── vite.config.js              # Vite configuration (Includes the Tailwind v4 plugin)
└── README.md                   # Project documentation
