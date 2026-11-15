# TerraPredict-AI

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.0-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org/)
[![NASA Earth Data](https://img.shields.io/badge/NASA-Earth%20Data-E03C31?logo=nasa&logoColor=white)](https://earthdata.nasa.gov/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Satellite-Driven Precision Agronomy & 3-Year Crop Succession Optimizer**  
> TerraPredict-AI bridges NASA Earth Observation satellites, United Nations FAO biophysical modeling, and beam-search algorithmic scheduling to deliver actionable, localized farming advice for any coordinate on Earth.

---

## Key Features

### 1. Interactive 3D Satellite Earth Globe
- **MapLibre GL JS & Three.js Canvas**: Smooth 3D digital globe wrapped in an interactive starry cosmic backdrop with realistic solar illumination.
- **Global Search & Presets**: Rapidly geocode any village, city, farm, or GPS coordinate, or jump to agricultural presets (Rourkela, Tokyo, Paris, New York, Himalayas).
- **Esri Satellite & Topo Basemaps**: Crisp high-resolution basemap imagery with toggleable administrative boundary and city labels.

### 2. Live NASA Earth Observation Layers
Toggle live spaceborne raster layers directly over the globe, powered by **NASA GIBS WMTS**:
- **Field Warmth & Heat (LST)**: MODIS Terra / ECOSTRESS Land Surface Temperature ($-20^\circ\text{C}$ to $45^\circ\text{C}$) to identify heat stress days ($\ge 35^\circ\text{C}$) and frost risk.
- **Soil Wetness (Moisture)**: NASA SMAP L4 surface and root-zone ($0\text{--}100\text{ cm}$) volumetric water content to verify seedbed germination thresholds.
- **Rainfall Pattern**: NASA GPM IMERG calibrated precipitation rates ($0\text{--}50+\text{ mm/day}$) and seasonal water accumulation.
- **Plant Health & Greenery**: MODIS / Landsat 8-day composite NDVI ($-0.1$ to $0.9$) tracking canopy photosynthetic activity.
- **Deep Groundwater Level**: NASA GRACE Tellus Mascon Liquid Water Equivalent Thickness anomalies ($-30\text{ cm}$ deficit to $+30\text{ cm}$ surplus).
- **Field Elevation & Drainage**: NASA SRTM 30-meter Digital Elevation Model for slope, surface drainage, and runoff analysis.

### 3. Smart Temporal Navigation & Nearest-Date Fallback
- **Automatic Fallback Clamping**: If a satellite mission has no data on your current observation date (e.g., GRACE Tellus ending in 2022, or SRTM static in 2000), the app automatically jumps to the nearest valid satellite pass with an amber notification pill.
- **Forward-Restoration Engine**: Remembers your primary target date (e.g., 2026). When you swap from a historical layer back to a modern instrument (like MODIS or SMAP), the observation date automatically leaps forward back to current data instead of remaining trapped in the past.

### 4. FAO EcoCrop ML Biophysical Screening
- **2,071+ Species Database**: Real-time screening against the United Nations Food and Agriculture Organization (FAO) EcoCrop database.
- **Hard Agronomic Gating**: Enforces thermal sowing corridors ($T_{\text{sow\_min}} \le T_{\text{mean}} \le T_{\text{sow\_max}}$) and minimum volumetric soil moisture before recommending a crop.
- **Composite Suitability Formula**:
  $$\text{Score} = (0.65 \times \text{Biophysical Fit}) + (0.20 \times \text{Drought Resilience}) + (0.15 \times \text{Regional Affinity})$$
- Differentiated suitability match percentages ($78\%\text{--}96\%$) reflecting microclimate, soil texture (clay/sand/silt), and regional traditional staples.

### 5. 3-Year Crop Succession Engine (Beam Search)
- **Monoculture Prevention**: Breaks pest cycles, prevents root-zone nutrient depletion, and curbs soil compaction.
- **Interactive 36-Month Gantt Succession Calendar**: Proportional multi-year timeline with milestone markers (Year 1 Monsoon, Year 2 Legume Succession, Year 3 Cash Stewardship) and synchronized click-to-scroll card inspection.
- **Four Stewardship Pillars**:
  - **Biological Nitrogen Fixation**: Legumes fix $+45\text{ kg N/ha}$, reducing synthetic fertilizer requirements.
  - **Root Layer Alternation**: Alternates deep taproots ($>1.2\text{ m}$) with medium fibrous roots to break subsoil hardpans and improve water infiltration.
  - **Continuous Soil Cover**: Minimizes bare fallow to prevent topsoil erosion and moisture loss.
  - **Cash Crop Economic Viability**: Balances soil restoration with high-value commercial harvests.
- **Three Selectable Strategic Plans**: *Soil-Regenerative*, *Water-Resilient*, and *Baseline Commercial*.

### 6. Farmer-Centric UX & Vernacular Delivery
- **Zero Technical Jargon**: Converts complex agronomic units into simple, practical guidelines (e.g., "Normal (500 mm)", "Dry (250 mm)", "Sow within 3–4 weeks", "0% Frost Risk").
- **Dynamic Botanical Photography**: Direct Wikimedia Commons API queries using authentic Latin binomials with persistent server caching, ensuring accurate imagery instead of generic stock photos.
- **Built-In Methodology Guide**: 5-chapter interactive modal explaining the architecture, NASA satellites, EcoCrop biophysical scoring, rotation models, and user guide.

---

## System Architecture

```text
+-----------------------------------------------------------------------------------+
|                                 USER INTERFACE                                    |
|   MapLibre GL 3D Globe  |  Spectral Overlays  |  Gantt Rotation Calendar  |  Docs |
+-----------------------------------------------------------------------------------+
                                          ▲
                                          │ HTTP / JSON
                                          ▼
+-----------------------------------------------------------------------------------+
|                        EXPRESS GATEWAY (Port 3001)                                |
|  - Request Validation & Geocoding                                                 |
|  - NASA POWER API 60-Day Telemetry Query (Temperature, Moisture, Rain, RH)        |
|  - Wikimedia Commons Botanical Photography Resolver & Image Caching               |
+-----------------------------------------------------------------------------------+
                                          ▲
                                          │ HTTP / JSON
                                          ▼
+-----------------------------------------------------------------------------------+
|                        ML FASTAPI SERVICE (Port 8001)                             |
|  - FAO EcoCrop Biophysical Scoring Engine (2,071 Species)                         |
|  - Thermal Sowing Corridor & Moisture Hard-Gates                                  |
|  - 3-Year Succession Beam Search Optimizer (Nitrogen, Root Depths, Soil Cover)   |
+-----------------------------------------------------------------------------------+
                                          ▲
                                          │ WMTS / REST
                                          ▼
+-----------------------------------------------------------------------------------+
|                              NASA DATA PLATFORMS                                  |
|  - NASA POWER API: Real-Time Agroclimatology Observations                         |
|  - NASA GIBS WMTS: MODIS, SMAP L4, GPM IMERG, Landsat NDVI, GRACE-FO, SRTM DEM    |
+-----------------------------------------------------------------------------------+
```

---

## Project Structure

```text
TerraPredict-AI/
├── frontend/                     # React 19 + Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── CropDrawer.jsx           # Single-Season & 3-Year Rotation Drawer
│   │   │   ├── DataVisualizer.jsx       # 12-Month Climate & Moisture Charts
│   │   │   └── HowItWorksModal.jsx      # 5-Chapter Architecture & Methodology Guide
│   │   ├── data/
│   │   │   └── mockCrops.js             # Fallback Crop & Strategy Data
│   │   ├── App.jsx                      # Main MapLibre 3D Globe & Dashboard
│   │   ├── index.css                    # Frosted Glass Styling & Dark Theme
│   │   └── main.jsx
│   ├── package.json
│   ├── vercel.json                      # Vercel Frontend Deployment Config
│   └── vite.config.js
├── backend/                      # Node.js Express Gateway
│   ├── data/
│   │   └── crop_images_cache.json       # Wikimedia Botanical Image Cache
│   ├── imageResolver.js                 # Wikipedia/Wikimedia Botanical Image Fetcher
│   ├── routing.js                       # Express Gateway & NASA POWER Integration
│   └── package.json
├── ml/                           # Python FastAPI Service & ML Algorithms
│   ├── data/
│   │   └── fao_ecocrop.json             # 2,071 Species Global Crop Database
│   ├── src/
│   │   ├── api.py                       # FastAPI Application Endpoints
│   │   ├── scoring.py                   # FAO EcoCrop Biophysical Scoring Model
│   │   └── rotation.py                  # 3-Year Succession Beam Search Engine
│   └── requirements.txt
├── Dockerfile                    # Production Multi-Stage Container
├── docker-compose.yml            # Docker Compose Orchestration
├── DEPLOYMENT.md                 # Step-by-Step Vercel & Container Guide
├── vercel.json                   # Root Vercel Build Config
└── README.md
```

---

## Quick Start (Local Development)

### Prerequisites
- **Node.js**: `v20.x` or later
- **Python**: `3.10` or later
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/proishan18/TerraPredict-AI.git
cd TerraPredict-AI
git checkout feat/e2e-integration
```

### 2. Set Up & Run the Python ML Engine
```bash
cd ml
python3 -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
PYTHONPATH=src uvicorn api:app --app-dir src --port 8001 --reload
```
*ML Service will run on `http://127.0.0.1:8001`.*

### 3. Set Up & Run the Express Gateway
In a new terminal:
```bash
cd backend
npm install
node routing.js
```
*Express Gateway will run on `http://localhost:3001`.*

### 4. Set Up & Run the Vite Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
*Open your browser at `http://localhost:5173`.*

---

## Docker Deployment (All-in-One Container)

To run the entire application (Frontend + Express Gateway + Python ML Service) in a single production container:

```bash
# Build the multi-stage container
docker compose build

# Start services in the background
docker compose up -d
```

Visit `http://localhost:3001` in your browser.

To stop the services:
```bash
docker compose down
```

---

## Deploying on Vercel

1. **Deploy Backend**: Deploy the containerized backend + ML engine to **Railway** or **Render** using the included `Dockerfile`.
2. **Deploy Frontend on Vercel**:
   - Import the repository on [vercel.com](https://vercel.com).
   - Set Root Directory to `frontend`.
   - Update `frontend/vercel.json` with your deployed backend URL.
   - Click **Deploy**.

For detailed step-by-step instructions, see [DEPLOYMENT.md](file:///mnt/storage/Project/SPSC/TerraPredict-AI/DEPLOYMENT.md).

---

## API Reference

### `POST /api/site-telemetry`
Fetches real-time satellite telemetry from NASA POWER, computes biophysical crop matches, and generates 3-year succession plans.

#### Request Body
```json
{
  "lat": 22.2604,
  "lng": 84.8536,
  "date": "2026-11-12",
  "irrigation": "rainfed"
}
```

#### Response Structure
```json
{
  "success": true,
  "location": { "lat": 22.2604, "lng": 84.8536, "date": "2026-11-12" },
  "telemetry": {
    "temperature_c": 24.2,
    "soil_moisture_pct": 28.5,
    "precipitation_mm": 12.0,
    "frost_risk": 0.0,
    "heat_stress_days": 0
  },
  "crops": [
    {
      "code": "spring_barley",
      "name": "Spring Barley",
      "scientific_name": "Hordeum vulgare",
      "match_score": 86,
      "growth_days": 180,
      "water_need_mm": 500,
      "image_url": "https://upload.wikimedia.org/wikipedia/commons/..."
    }
  ],
  "strategies": {
    "soil_builder": { "name": "Soil-Regenerative Plan", "sequence": [...] },
    "water_saver": { "name": "Water-Resilient Plan", "sequence": [...] },
    "cash_crop": { "name": "Baseline Commercial Plan", "sequence": [...] }
  }
}
```

---

## Data Sources & Scientific Acknowledgments

- **NASA Earth Science Division**:
  - [NASA POWER API](https://power.larc.nasa.gov/) (Prediction Of Worldwide Energy Resources) for daily surface solar radiation, root-zone soil wetness, temperature, and precipitation.
  - [NASA GIBS](https://earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs) (Global Imagery Browse Services) for full-resolution satellite imagery layers (SMAP, MODIS, GPM, Landsat, GRACE Tellus, SRTM).
- **Food and Agriculture Organization (FAO)**:
  - [FAO EcoCrop Database](https://ecocrop.fao.org/) for biophysical parameters of 2,071 agricultural species.
- **Wikimedia Commons**:
  - Educational, openly licensed botanical photography queried via authenticated Latin binomials.

---

## License

This project is licensed under the [MIT License](LICENSE).
