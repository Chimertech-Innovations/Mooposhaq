# Mooposhaq — Precision Cattle Nutrition & AI Vision (BCS, Mastitis & Disease) Feed Engine

Mooposhaq is a NASEM (2021) and ICAR (2013) compliant precision dairy cattle nutrition engine with a built-in bridge for **BCS (Body Condition Score) Vision Models**, **Mastitis Detection Models**, **Cattle Disease Detection Models**, and the **RAGUL Chatbot**.

---

## Key Capabilities

1. **NASEM 2021 / ICAR 2013 Individual & Herd Ration Solver (`backend/nutrition_engine.py`)**:
   - Solves Dry Matter Intake ($\text{DMI}$), Net Energy for Lactation/Growth/Gestation ($\text{NE}_L$ & $\text{ME}$), Crude Protein ($\text{CP}$), Factorial Absorbed Calcium & Phosphorus, and Free Water Intake ($\text{FWI}$) using SciPy HiGHS Linear Programming.
   - Enforces 8 physiological safety gates (Concentrate $\le 40\%\text{ DMI}$, Cane Molasses $\le 1.0\text{ kg/head/day}$, category-specific $\text{NDF}$ fiber limits).

2. **BCS Conditioning & Body Reserves Engine (`backend/ai_diagnostics.py`)**:
   - Compares detected BCS (`1.0–5.0` scale) against stage-optimal target BCS (`3.00` Early Lactation, `3.25` Mid Lactation / Heifer / Bull, `3.40` Late Lactation, `3.50` Dry / Close-Up).
   - Computes tissue reserve deficit/surplus ($1.0\text{ BCS} \approx 13.5\%\text{ BW}$), daily conditioning energy ($\text{Mcal NE}_L\text{/day}$, $\text{Mcal ME/day}$) and protein ($\text{g CP/day}$), safe conditioning days (`60–100 days`), and exact `kg/day` feed adjustments.

3. **Mastitis & Disease Therapeutic Feed Protocols (`backend/ai_diagnostics.py`)**:
   - Translates diagnoses into quantitative solver modifiers and actionable farm prescriptions:
     - **Mastitis**: `subclinical_mastitis`, `clinical_mastitis`
     - **Infectious / Skin Diseases**: `lumpy_skin_disease` (LSD), `fmd_recovery` (Foot & Mouth Disease), `tick_fever_recovery` (Theileriosis / Babesiosis / Anaplasmosis)
     - **Metabolic, Structural & Digestive Disorders**: `ketosis`, `rumen_acidosis` (SARA), `milk_fever` (Hypocalcemia), `lameness`, `bloat_indigestion`

---

## Project Structure

```text
Mooposhaq-main/
├── backend/
│   ├── main.py                         # FastAPI application (/api/nutrition/calculate & /api/ai/*)
│   ├── nutrition_engine.py             # NASEM 2021 & ICAR 2013 equations + SciPy HiGHS LP solver
│   ├── ai_diagnostics.py               # External BCS/Mastitis/Disease model connectors & feed protocols
│   ├── test_ai_bcs_disease_bridge.py   # Automated verification suite for BCS & disease feed bridge
│   ├── test_11_fixes_runner.py         # Verification suite for 11 precision nutrition safety gates
│   ├── test_5_priority_fixes.py        # Verification suite for 5 priority ration checks
│   └── requirements.txt                # Python dependencies
├── vite-project/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AiVisionHealthModal.jsx # AI Cow Photo -> BCS + Mastitis + Disease -> Feed UI
│   │   │   ├── CattleCycleHub.jsx      # Herd Setup with per-cow BCS & disease scan
│   │   │   └── Step10Review.jsx        # Final Ration & Health Prescription Report
│   │   ├── services/nutritionApi.js    # API client for Mooposhaq backend & external models
│   │   └── utils/bcsHealthEngine.js    # Client-side BCS & disease protocol engine
│   └── vercel.json                     # Vercel frontend deployment config
└── render.yaml                         # Render backend deployment blueprint
```

---

## Connecting to the RAGUL Chatbot & External Vision Models

### 1. Environment Variables for Your External Vision Microservices
Set these environment variables on your Mooposhaq backend (or configure them live in the UI via the **"Model API URLs"** button):

```bash
export BCS_MODEL_API_URL="http://localhost:8001/predict/bcs"
export MASTITIS_MODEL_API_URL="http://localhost:8002/predict/mastitis"
export DISEASE_MODEL_API_URL="http://localhost:8003/predict/disease"
```

Mooposhaq automatically sends uploaded cow images as `multipart/form-data` (field `file`) with automatic fallback to JSON `{"image_base64": "...", "filename": "..."}`.

**Expected JSON Responses from Your Vision Microservices:**
- **BCS Model**: `{"bcs": 2.25, "confidence": 0.94}` (also accepts `bcs_score`, `score`, `prediction`)
- **Mastitis Model**: `{"mastitis": "subclinical_mastitis", "confidence": 0.91}` (also accepts `"clinical_mastitis"`, `"healthy"`, or `{"mastitis": "positive", "severity": "subclinical"}`)
- **Disease Model**: `{"disease": "lumpy_skin_disease", "confidence": 0.95}` (also accepts `diagnosis`, `prediction`, `label`, or `{"detections": ["lsd", "ketosis"]}`)

---

### 2. How RAGUL Chatbot Calls Mooposhaq in the Background

#### Option A: RAGUL sends the cow image directly to Mooposhaq (`POST /api/ai/analyze-cow`)
Mooposhaq calls the external BCS, Mastitis, and Disease microservices and returns the complete nutritional plan:

```python
import requests

with open("cow_photo.jpg", "rb") as img:
    response = requests.post(
        "http://localhost:8000/api/ai/analyze-cow",
        files={"file": ("cow_photo.jpg", img, "image/jpeg")},
        data={
            "category": "milkingCow",
            "weight": 450,
            "milkYield": 12.0,
            "milkFat": 4.2,
            "stage": "Mid lactation",
        },
    )
result = response.json()
print("BCS Plan:", result["bcsEvaluation"]["headline"])
print("Therapeutic Ration:", result["mooposhaqRationComparison"]["therapeuticRecommendedRation"])
```

#### Option B: RAGUL already ran the Vision Models and sends JSON (`POST /api/ai/recommend-from-diagnosis`)
If RAGUL already has the BCS score and disease diagnosis from your models, it can call Mooposhaq with pure JSON:

```python
import requests

payload = {
    "bcs": 2.25,
    "mastitisStatus": "subclinical_mastitis",
    "diseases": ["lumpy_skin_disease"],
    "category": "milkingCow",
    "weight": 450.0,
    "milkYield": 12.0,
    "milkFat": 4.2,
    "stage": "Mid lactation",
    "selectedFeeds": [
        {"name": "Hybrid Napier (CO-4)", "category": "Green Fodder", "quantityKg": 25.0, "dmPct": 22.0},
        {"name": "Wheat Straw", "category": "Dry Fodder", "quantityKg": 5.0, "dmPct": 90.0},
        {"name": "Maize Grain Crushed", "category": "Concentrates", "quantityKg": 4.0, "dmPct": 89.0},
        {"name": "Groundnut Cake", "category": "Concentrates", "quantityKg": 3.0, "dmPct": 90.0},
        {"name": "Wheat Bran", "category": "Concentrates", "quantityKg": 3.0, "dmPct": 89.0},
        {"name": "Cane Molasses", "category": "Unconventional", "quantityKg": 1.0, "dmPct": 75.0}
    ]
}

res = requests.post("http://localhost:8000/api/ai/recommend-from-diagnosis", json=payload).json()
print("Headline:", res["bcsEvaluation"]["headline"])
print("Feed Adjustments:", res["mooposhaqRationComparison"]["ingredientAdjustments"])
print("Supplements:", res["therapeuticSupplements"])
```

---

## Local Development & Testing

### 1. Run Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python3 test_ai_bcs_disease_bridge.py
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Run Frontend (Vite + React)
```bash
cd vite-project
npm install
npm run dev
```

---

## Cloud Deployment (Render + Vercel)

1. **Push to GitHub**: Commit and push this repository to GitHub.
2. **Deploy Backend on Render**:
   - Connect your GitHub repo to [Render](https://render.com) (it will auto-detect `render.yaml` with `rootDir: backend`).
   - Add `BCS_MODEL_API_URL`, `MASTITIS_MODEL_API_URL`, and `DISEASE_MODEL_API_URL` in Render's Environment Variables once your vision models are hosted.
3. **Deploy Frontend on Vercel**:
   - Import the repo in [Vercel](https://vercel.com) with **Root Directory** set to `vite-project`.
   - Set `VITE_API_BASE_URL` to your Render backend URL (e.g., `https://feednutrition.onrender.com`).
4. **Point RAGUL Chatbot to Your Render Backend**:
   - Have the RAGUL Chatbot backend call `https://<your-render-backend>.onrender.com/api/ai/recommend-from-diagnosis` (or `/api/ai/analyze-cow`).
