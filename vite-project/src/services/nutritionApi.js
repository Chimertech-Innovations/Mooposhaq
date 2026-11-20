const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
// Strip any trailing slash to prevent double slashes like https://domain.com//api/...
const DEFAULT_API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

let resolvedApiUrl = null;
let cachedHealthStatus = null;
let prewarmPromise = null;
let heartbeatTimer = null;

/**
 * Fast resolution of active API URL.
 * If running on localhost / 127.0.0.1, checks if local python backend is active (1s timeout).
 * If local is alive, connects to local in 2ms.
 * Otherwise uses configured DEFAULT_API_BASE_URL (e.g. Render cloud).
 */
export async function getActiveApiUrl() {
  if (resolvedApiUrl) return resolvedApiUrl;

  const isLocalHost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (isLocalHost) {
    // 1. Try Vite proxy relative endpoint (completely bypasses cross-origin CORS)
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 1200);
      const res = await fetch('/api/health', { signal: ctrl.signal });
      clearTimeout(tid);
      if (res.ok) {
        resolvedApiUrl = ''; // Relative path uses Vite's configured proxy to 127.0.0.1:8000
        cachedHealthStatus = { connected: true, timestamp: Date.now() };
        return resolvedApiUrl;
      }
    } catch {
      // Proxy not active or failed, try direct 127.0.0.1:8000
    }

    // 2. Direct local FastAPI server check
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 1200);
      const res = await fetch('http://127.0.0.1:8000/api/health', { signal: ctrl.signal });
      clearTimeout(tid);
      if (res.ok) {
        resolvedApiUrl = 'http://127.0.0.1:8000';
        cachedHealthStatus = { connected: true, timestamp: Date.now() };
        return resolvedApiUrl;
      }
    } catch {
      // Local server not running, fall back to remote
    }
  }

  resolvedApiUrl = DEFAULT_API_BASE_URL;
  return resolvedApiUrl;
}

/**
 * Pre-warm the backend immediately on app load.
 * For Render free-tier, waking from cold start takes 40-50s.
 * Starting the wake-up ping right when the app loads ensures the server is
 * fully awake and warm by the time the user reaches Step 6 (Summary & Calculation).
 */
export function prewarmBackend() {
  if (prewarmPromise) return prewarmPromise;

  prewarmPromise = (async () => {
    try {
      const url = await getActiveApiUrl();
      const ctrl = new AbortController();
      // Generous timeout for initial cold-start wake
      const tid = setTimeout(() => ctrl.abort(), 55000);
      const res = await fetch(`${url}/api/health`, { signal: ctrl.signal });
      clearTimeout(tid);
      if (res.ok) {
        const data = await res.json();
        cachedHealthStatus = { connected: true, data, timestamp: Date.now() };
        return { connected: true, data };
      }
    } catch (e) {
      // Silent in background pre-warm
    }

    // Keep-alive heartbeat: ping every 10 minutes to prevent Render from going to sleep
    if (!heartbeatTimer && typeof window !== 'undefined') {
      heartbeatTimer = setInterval(async () => {
        try {
          const url = resolvedApiUrl || DEFAULT_API_BASE_URL;
          await fetch(`${url}/api/health`);
        } catch {}
      }, 10 * 60 * 1000);
    }

    return { connected: false };
  })();

  return prewarmPromise;
}

/**
 * Health check to verify if the Python backend is reachable.
 * Uses cached result if checked within last 25 seconds for instant response.
 */
export async function checkBackendStatus() {
  // If recently verified, return instantly
  if (cachedHealthStatus && (Date.now() - cachedHealthStatus.timestamp < 25000)) {
    return cachedHealthStatus;
  }

  try {
    const url = await getActiveApiUrl();
    const controller = new AbortController();
    // 50s timeout for cold start if needed
    const timeoutId = setTimeout(() => controller.abort(), 50000);
    const res = await fetch(`${url}/api/health`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      cachedHealthStatus = null;
      return { connected: false, error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    cachedHealthStatus = { connected: true, data, timestamp: Date.now() };
    return cachedHealthStatus;
  } catch (err) {
    cachedHealthStatus = null;
    const isTimeout = err.name === 'AbortError';
    return {
      connected: false,
      error: isTimeout
        ? 'Backend timed out — Render cold start can take up to 50 seconds. Please retry.'
        : (err.message || 'Connection failed')
    };
  }
}

/**
 * Sends complete farm data to Python calculation engine.
 */
export async function runNutritionCalculation(farmData) {
  const payload = {
    weather: farmData.weather ? {
      tempC: Number(farmData.weather.tempC) || 28.0,
      humidity: Number(farmData.weather.humidity) || 65.0,
      condition: farmData.weather.condition || 'Clear',
      city: farmData.weather.city || ''
    } : null,
    selectedBreed: farmData.selectedBreed ? {
      id: farmData.selectedBreed.id,
      name: farmData.selectedBreed.name,
      category: farmData.selectedBreed.category,
      subCategory: farmData.selectedBreed.subCategory,
      avgWeightHeifer: Number(farmData.selectedBreed.avgWeightHeifer) || 320,
      avgWeightCow: Number(farmData.selectedBreed.avgWeightCow) || 450
    } : null,
    heifersData: (farmData.heifersData || []).map(h => ({
      id: String(h.id || ''),
      weight: Number(h.weight) || 300,
      ageMonths: Number(h.ageMonths) || 24,
      bcs: h.bcs !== undefined && h.bcs !== '' ? Number(h.bcs) : 3.25,
      mastitisStatus: h.mastitisStatus || 'healthy',
      healthDiagnosis: h.healthDiagnosis || 'healthy',
      diseases: Array.isArray(h.diseases) ? h.diseases : (h.healthDiagnosis && h.healthDiagnosis !== 'healthy' ? [h.healthDiagnosis] : []),
      applyBcsConditioning: Boolean(h.applyBcsConditioning)
    })),
    pregnantCategory: farmData.pregnantCategory || 'both',
    firstTimeCattle: (farmData.firstTimeCattle || []).map(c => {
      const pm = Number(c.pregMonth !== undefined && c.pregMonth !== '' ? c.pregMonth : (c.gestationalMonths || 7));
      return {
        id: String(c.id || ''),
        weight: Number(c.weight) || 350,
        pregMonth: pm,
        gestationalMonths: pm,
        pregDays: Number(c.pregDays) || (pm * 30),
        bcs: c.bcs !== undefined && c.bcs !== '' ? Number(c.bcs) : 3.35,
        mastitisStatus: c.mastitisStatus || 'healthy',
        healthDiagnosis: c.healthDiagnosis || 'healthy',
        diseases: Array.isArray(c.diseases) ? c.diseases : (c.healthDiagnosis && c.healthDiagnosis !== 'healthy' ? [c.healthDiagnosis] : []),
        applyBcsConditioning: Boolean(c.applyBcsConditioning)
      };
    }),
    repeatCattle: (farmData.repeatCattle || []).map(c => {
      const pm = Number(c.pregMonth !== undefined && c.pregMonth !== '' ? c.pregMonth : (c.gestationalMonths || 7));
      return {
        id: String(c.id || ''),
        weight: Number(c.weight) || 450,
        pregMonth: pm,
        gestationalMonths: pm,
        pregDays: Number(c.pregDays) || (pm * 30),
        bcs: c.bcs !== undefined && c.bcs !== '' ? Number(c.bcs) : 3.35,
        mastitisStatus: c.mastitisStatus || 'healthy',
        healthDiagnosis: c.healthDiagnosis || 'healthy',
        diseases: Array.isArray(c.diseases) ? c.diseases : (c.healthDiagnosis && c.healthDiagnosis !== 'healthy' ? [c.healthDiagnosis] : []),
        applyBcsConditioning: Boolean(c.applyBcsConditioning)
      };
    }),
    lactatingData: (farmData.lactatingData || []).map(l => {
      const fat = Number(l.milkFat !== undefined && l.milkFat !== '' ? l.milkFat : (l.fatPct || 4.2));
      const bcsVal = Number(l.bcs !== undefined && l.bcs !== '' ? l.bcs : 3.0);
      const stageVal = l.stage || 'Mid lactation';
      const isFirst = l.lactationType === 'first_lactation' || Boolean(l.isFirstLactation);
      return {
        id: String(l.id || ''),
        weight: Number(l.weight) || 420,
        milkYield: Number(l.milkYield) || 0,
        fatPct: fat,
        milkFat: fat,
        bcs: bcsVal,
        stage: stageVal,
        lactationType: isFirst ? 'first_lactation' : 'second_plus',
        isFirstLactation: isFirst,
        parity: isFirst ? 1 : 2,
        dim: Number(l.dim) || (stageVal.includes('Early') ? 30 : stageVal.includes('Late') ? 210 : 90),
        mastitisStatus: l.mastitisStatus || 'healthy',
        healthDiagnosis: l.healthDiagnosis || 'healthy',
        diseases: Array.isArray(l.diseases) ? l.diseases : (l.healthDiagnosis && l.healthDiagnosis !== 'healthy' ? [l.healthDiagnosis] : []),
        applyBcsConditioning: Boolean(l.applyBcsConditioning)
      };
    }),
    dryCowsData: (farmData.dryCowsData || []).map(d => ({
      id: String(d.id || ''),
      weight: Number(d.weight) || 400,
      dryDays: Number(d.dryDays !== undefined && d.dryDays !== '' ? d.dryDays : 45),
      daysToCalving: Number(d.daysToCalving !== undefined && d.daysToCalving !== '' ? d.daysToCalving : 21),
      bcs: Number(d.bcs !== undefined && d.bcs !== '' ? d.bcs : 3.5),
      mastitisStatus: d.mastitisStatus || 'healthy',
      healthDiagnosis: d.healthDiagnosis || 'healthy',
      diseases: Array.isArray(d.diseases) ? d.diseases : (d.healthDiagnosis && d.healthDiagnosis !== 'healthy' ? [d.healthDiagnosis] : []),
      applyBcsConditioning: Boolean(d.applyBcsConditioning)
    })),
    bullsData: (farmData.bullsData || []).map(b => ({
      id: String(b.id || ''),
      weight: Number(b.weight) || 550,
      purpose: b.purpose || 'Breeding Bull',
      bcs: b.bcs !== undefined && b.bcs !== '' ? Number(b.bcs) : 3.25,
      mastitisStatus: 'healthy',
      healthDiagnosis: b.healthDiagnosis || 'healthy',
      diseases: Array.isArray(b.diseases) ? b.diseases : (b.healthDiagnosis && b.healthDiagnosis !== 'healthy' ? [b.healthDiagnosis] : []),
      applyBcsConditioning: Boolean(b.applyBcsConditioning)
    })),
    grazingSystem: farmData.grazingSystem || 'no_grazing',
    grazingData: farmData.grazingData || {},
    waterVolume: Number(farmData.waterVolume) || 0,
    waterSource: farmData.waterSource || 'Borewell',
    waterQuality: farmData.waterQuality || 'Good',
    selectedFeeds: (farmData.selectedFeeds || []).map(f => ({
      id: String(f.id || ''),
      name: f.name || '',
      category: f.category || 'Green Fodder',
      quantityKg: Number(f.quantityKg) || 0,
      dmPct: Number(f.dmPct) || 25
    }))
  };

  const url = await getActiveApiUrl();
  const res = await fetch(`${url}/api/nutrition/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Calculation failed (${res.status}): ${errText}`);
  }

  return await res.json();
}

/**
 * Helper to call an external microservice directly from the browser (if configured)
 * using multipart/form-data with automatic JSON base64 fallback.
 */
async function callExternalMicroserviceFromClient(endpointUrl, file) {
  if (!endpointUrl || !file) return null;
  try {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('image', file);
    const res = await fetch(endpointUrl, { method: 'POST', body: fd });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn(`Direct client call to ${endpointUrl} failed, backend will handle or fallback:`, e);
  }
  return null;
}

/**
 * Analyzes a cow photo via external BCS, Mastitis, and Disease microservices
 * and returns complete Mooposhaq feed recommendations to improve BCS and treat/support diagnoses.
 */
export async function analyzeCowImageAndRecommendFeed({
  file = null,
  category = 'milkingCow',
  weight = 450,
  milkYield = 12,
  milkFat = 4.2,
  stage = 'Mid lactation',
  isFirstLactation = false,
  pregMonth = 7,
  dryDays = 45,
  bcsModelUrl = '',
  mastitisModelUrl = '',
  diseaseModelUrl = '',
  overrideBcs = null,
  overrideMastitis = null,
  overrideDiseases = [],
  selectedFeeds = [],
  selectedBreed = null,
  weather = null
}) {
  const url = await getActiveApiUrl();

  // If external microservice URLs are localhost and user is running frontend locally,
  // try calling them from client too in case backend is remote Render cloud
  let clientBcs = overrideBcs;
  let clientMast = overrideMastitis;
  let clientDis = Array.isArray(overrideDiseases) ? [...overrideDiseases] : [];

  if (file && bcsModelUrl && clientBcs === null) {
    const bcsData = await callExternalMicroserviceFromClient(bcsModelUrl, file);
    if (bcsData) {
      const rawScore = bcsData.bcs ?? bcsData.bcs_score ?? bcsData.score ?? bcsData.prediction;
      if (rawScore !== undefined && !isNaN(parseFloat(rawScore))) {
        clientBcs = Math.round(parseFloat(rawScore) * 4) / 4;
      }
    }
  }
  if (file && mastitisModelUrl && !clientMast) {
    const mastData = await callExternalMicroserviceFromClient(mastitisModelUrl, file);
    if (mastData) {
      clientMast = mastData.mastitis ?? mastData.diagnosis ?? mastData.prediction ?? mastData.status ?? null;
    }
  }
  if (file && diseaseModelUrl && clientDis.length === 0) {
    const disData = await callExternalMicroserviceFromClient(diseaseModelUrl, file);
    if (disData) {
      const d = disData.disease ?? disData.diagnosis ?? disData.prediction ?? disData.label;
      if (d) clientDis.push(String(d));
    }
  }

  const fd = new FormData();
  if (file) fd.append('file', file);
  fd.append('category', String(category || 'milkingCow'));
  fd.append('weight', String(Number(weight) || 450));
  fd.append('milkYield', String(Number(milkYield) || 12));
  fd.append('milkFat', String(Number(milkFat) || 4.2));
  fd.append('stage', String(stage || 'Mid lactation'));
  fd.append('isFirstLactation', String(Boolean(isFirstLactation)));
  fd.append('pregMonth', String(Number(pregMonth) || 7));
  fd.append('dryDays', String(Number(dryDays) || 45));
  if (bcsModelUrl) fd.append('bcsModelUrl', bcsModelUrl);
  if (mastitisModelUrl) fd.append('mastitisModelUrl', mastitisModelUrl);
  if (diseaseModelUrl) fd.append('diseaseModelUrl', diseaseModelUrl);
  if (clientBcs !== null && clientBcs !== undefined && clientBcs !== '') {
    fd.append('overrideBcs', String(clientBcs));
  }
  if (clientMast) {
    fd.append('overrideMastitis', String(clientMast));
  }
  if (clientDis.length > 0) {
    fd.append('overrideDiseasesJson', JSON.stringify(clientDis));
  }
  if (selectedFeeds && selectedFeeds.length > 0) {
    fd.append('selectedFeedsJson', JSON.stringify(selectedFeeds));
  }
  if (selectedBreed) {
    fd.append('selectedBreedJson', JSON.stringify(selectedBreed));
  }
  if (weather) {
    fd.append('weatherJson', JSON.stringify(weather));
  }

  const res = await fetch(`${url}/api/ai/analyze-cow`, {
    method: 'POST',
    body: fd
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI Cow Analysis failed (${res.status}): ${errText}`);
  }

  return await res.json();
}

