import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { enrichCropsWithImages, resolveCropImage } from "./imageResolver.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const ML_URL = process.env.ML_URL || "http://localhost:8001/predict";
const NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point";
const POWER_PARAMS = [
  "PRECTOTCORR",
  "GWETROOT",
  "T2M",
  "T2M_MAX",
  "T2M_MIN",
  "RH2M",
  "TS",
];
const WINDOW_DAYS = 60;
const MISSING_VALUE = -999; // NASA POWER's marker for missing data
const NASA_TIMEOUT_MS = 15000;
const ML_TIMEOUT_MS = 30000;

app.use(express.json());

// Enable CORS for local Vite development
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Serves the built frontend in production. In dev, Vite serves it instead.
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// DATE HELPERS
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Satellite data lags about 3 days, so the latest valid date is today minus 3.
function maxAllowedDate() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 3);
  return d.toISOString().slice(0, 10);
}

// NASA POWER uses YYYYMMDD keys. The frontend uses YYYY-MM-DD.
const toPowerDate = (iso) => iso.replaceAll("-", "");
const fromPowerDate = (key) =>
  `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`;

// VALIDATION
function validateInput({ lat, lng, date }) {
  const errors = [];
  if (
    typeof lat !== "number" ||
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90
  ) {
    errors.push("lat must be a number between -90 and 90");
  }
  if (
    typeof lng !== "number" ||
    !Number.isFinite(lng) ||
    lng < -180 ||
    lng > 180
  ) {
    errors.push("lng must be a number between -180 and 180");
  }
  if (typeof date !== "string" || !ISO_DATE.test(date)) {
    errors.push("date must be in YYYY-MM-DD format");
  } else if (date < "2001-01-01") {
    errors.push("date must be on or after 2001-01-01 (NASA POWER coverage)");
  } else if (date > maxAllowedDate()) {
    errors.push(
      `date must be on or before ${maxAllowedDate()} (satellite data lag)`,
    );
  }
  return errors;
}

// NASA POWER API
async function fetchPowerData(lat, lng, startIso, endIso) {
  const params = new URLSearchParams({
    parameters: POWER_PARAMS.join(","),
    community: "AG",
    longitude: String(lng),
    latitude: String(lat),
    start: toPowerDate(startIso),
    end: toPowerDate(endIso),
    format: "JSON",
  });

  const response = await fetch(`${NASA_POWER_URL}?${params}`, {
    signal: AbortSignal.timeout(NASA_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`NASA POWER HTTP ${response.status}`);

  const json = await response.json();
  return json.properties.parameter;
}

// Turns POWER's keyed-by-date objects into aligned daily arrays.
function buildDaily(parameter) {
  const keys = Object.keys(parameter.T2M).sort();
  const series = (name) =>
    keys.map((k) => {
      const v = parameter[name]?.[k];
      return v === undefined || v === MISSING_VALUE ? null : v;
    });

  return {
    dates: keys.map(fromPowerDate),
    precipitation: series("PRECTOTCORR"),
    soil_moisture: series("GWETROOT"),
    temp_avg: series("T2M"),
    temp_max: series("T2M_MAX"),
    temp_min: series("T2M_MIN"),
    humidity: series("RH2M"),
    surface_temp: series("TS"),
  };
}

// Most recent non-null value in an array.
function lastValid(arr) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== null) return arr[i];
  }
  return null;
}

// Average of the last n valid values.
function recentMean(arr, n) {
  const vals = arr.slice(-n).filter((v) => v !== null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

// Color mapping for UI glow
const STATUS_COLORS = {
  good: "#22c55e",
  moderate: "#eab308",
  risk: "#ef4444",
  info: "#06b6d4",
};

// Metrics the frontend lists in the telemetry panel.
function buildMetrics(daily) {
  const surfaceTemp = lastValid(daily.surface_temp);
  const soilMoisture = lastValid(daily.soil_moisture);
  const rain7d = daily.precipitation.slice(-7).filter((v) => v !== null);
  const rainWeek = rain7d.length ? rain7d.reduce((a, b) => a + b, 0) : null;
  const heatDays = daily.temp_max.filter((v) => v !== null && v >= 35).length;
  const humidity = recentMean(daily.humidity, 7);

  const metrics = [];

  if (surfaceTemp !== null) {
    const status = surfaceTemp > 35 ? "risk" : surfaceTemp > 30 ? "moderate" : "good";
    metrics.push({
      label: "Surface Temp",
      source: "NASA POWER",
      value: `${surfaceTemp.toFixed(1)} °C`,
      status,
      spectralColor: STATUS_COLORS[status],
    });
  }

  if (soilMoisture !== null) {
    const status = soilMoisture < 0.2 ? "risk" : soilMoisture < 0.3 ? "moderate" : "good";
    metrics.push({
      label: "Soil Moisture",
      source: "NASA POWER",
      value: `${soilMoisture.toFixed(2)} m³/m³`,
      status,
      spectralColor: STATUS_COLORS[status],
    });
  }

  if (rainWeek !== null) {
    metrics.push({
      label: "Rainfall (7 days)",
      source: "NASA POWER",
      value: `${rainWeek.toFixed(1)} mm`,
      status: "info",
      spectralColor: STATUS_COLORS.info,
    });
  }

  const heatStatus = heatDays > 10 ? "risk" : heatDays > 3 ? "moderate" : "good";
  metrics.push({
    label: "Heat Stress Days",
    source: "NASA POWER",
    value: `${heatDays} of ${daily.dates.length} days ≥ 35 °C`,
    status: heatStatus,
    spectralColor: STATUS_COLORS[heatStatus],
  });

  if (humidity !== null) {
    metrics.push({
      label: "Humidity (7-day avg)",
      source: "NASA POWER",
      value: `${humidity.toFixed(0)} %`,
      status: "info",
      spectralColor: STATUS_COLORS.info,
    });
  }

  return metrics;
}

// ML SERVICE
function buildMlPayload(lat, lng, startIso, endIso, daily, irrigation = "limited_supplemental") {
  return {
    location: { lat, lon: lng },
    date_range: { start: startIso, end: endIso },
    daily,
    irrigation,
  };
}

async function callMl(payload) {
  const response = await fetch(ML_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(ML_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`ML service HTTP ${response.status}`);
  return response.json();
}

// Normalizes ML response into frontend schema
function normalizeMl(mlData) {
  const forecast = mlData.forecast
    ? {
        dates: mlData.forecast.dates ?? [],
        predicted: mlData.forecast.predicted ?? [],
        monthly_outlook: mlData.forecast.monthly_outlook ?? [],
      }
    : null;

  const crops = (mlData.crops ?? []).slice(0, 10).map((c) => ({
    id: c.id,
    name: c.name,
    scientificName: c.scientificName ?? "",
    family: c.family ?? "Other",
    image: c.image ?? "",
    feasibilityScore: Math.round(c.feasibilityScore ?? 0),
    confidence: c.confidence ?? null,
    metrics: {
      waterNeed: c.metrics?.waterNeed ?? "—",
      growthCycle: c.metrics?.growthCycle ?? "—",
      soilTemp: c.metrics?.soilTemp ?? "—",
    },
    expandedDetails: {
      rotationBenefit:
        c.expandedDetails?.rotationBenefit ??
        "Maintains soil biological balance and preserves ground cover.",
      nitrogenImpact: c.expandedDetails?.nitrogenImpact ?? "Neutral",
      sowingWindow: c.expandedDetails?.sowingWindow ?? "Seasonal",
    },
  }));

  return {
    forecast,
    crops,
    strategies: mlData.strategies ?? null,
    soil_terrain: mlData.soil_terrain ?? null,
    total_database_crops: mlData.total_database_crops ?? 2071,
    total_viable_crops: mlData.total_viable_crops ?? crops.length,
  };
}

app.post("/api/site-telemetry", async (req, res) => {
  const { lat, lng, date, irrigation } = req.body ?? {};

  const inputErrors = validateInput({ lat, lng, date });
  if (inputErrors.length) {
    return res.status(400).json({ success: false, errors: inputErrors });
  }

  const endIso = date;
  const startIso = addDays(date, -(WINDOW_DAYS - 1));

  // Step 1: NASA POWER satellite data
  let daily;
  try {
    const parameter = await fetchPowerData(lat, lng, startIso, endIso);
    daily = buildDaily(parameter);
  } catch (err) {
    console.error("NASA POWER error:", err);
    return res.status(502).json({
      success: false,
      errors: { nasa: "Failed to fetch NASA POWER data" },
    });
  }

  const response = {
    success: true,
    location: `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`,
    date,
    metrics: buildMetrics(daily),
    forecast: null,
    crops: [],
    strategies: null,
    soil_terrain: null,
    errors: {},
  };

  // Step 2: ML agronomic forecasting and crop rotation optimizer
  try {
    const mlData = await callMl(
      buildMlPayload(lat, lng, startIso, endIso, daily, irrigation),
    );
    const normalized = normalizeMl(mlData);
    try {
      await enrichCropsWithImages(normalized.crops);
      if (normalized.strategies) {
        for (const strat of Object.values(normalized.strategies)) {
          if (Array.isArray(strat?.schedule)) {
            await Promise.all(
              strat.schedule.map(async (item) => {
                try {
                  item.image = await resolveCropImage({
                    id: item.crop_id,
                    name: item.crop_name,
                    scientificName: item.scientific_name,
                  });
                } catch {}
              })
            );
          }
        }
      }
    } catch (imgErr) {
      console.warn("Failed to enrich crop images:", imgErr.message);
    }
    response.forecast = normalized.forecast;
    response.crops = normalized.crops;
    response.strategies = normalized.strategies;
    response.soil_terrain = normalized.soil_terrain;
    response.total_database_crops = normalized.total_database_crops;
    response.total_viable_crops = normalized.total_viable_crops;
  } catch (err) {
    console.error("ML service error:", err);
    response.errors.ml = "ML service unreachable";
  }

  return res.json(response);
});

// SPA client-side fallback: any unhandled non-API GET request returns index.html
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api/")) {
    const indexPath = path.join(__dirname, "../frontend/dist/index.html");
    return res.sendFile(indexPath, (err) => {
      if (err) next();
    });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Express Gateway running on port ${PORT}`);
});
