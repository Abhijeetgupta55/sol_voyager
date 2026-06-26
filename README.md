# Sol Voyager — Multi-Temporal SAR Backscatter Anomaly Screener

A cloud-native research platform that screens for ground instability candidates
using Sentinel-1 GRD SAR backscatter analysis powered by Google Earth Engine.

> **Scope statement:** This system performs *heuristic backscatter anomaly screening*
> using SAR intensity (GRD) data. It does **not** measure phase-unwrapped deformation
> (that requires SLC InSAR, which is not implemented). Outputs are statistical outliers
> that require ground-truth validation before informing any risk decision.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Next.js 14)                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  /map page  │  │  InfoPanel   │  │  SinkholeMap      │  │
│  │  (search)   │  │  (metrics +  │  │  (Leaflet GeoJSON │  │
│  │             │  │   explain)   │  │   circle markers) │  │
│  └──────┬──────┘  └──────────────┘  └───────────────────┘  │
│         │ fetch /api/susceptibility?city=…                  │
└─────────┼───────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────┐
│  Next.js API Route  (src/app/api/susceptibility/route.js)   │
│  • Input validation  (regex + length check)                 │
│  • Rate limiting     (10 req / min per IP)                  │
│  • Geocoding cache   (Nominatim, 1 h TTL)                   │
│  • spawn("python", [scriptPath, lat, lon])  ← no shell inj. │
└─────────┬───────────────────────────────────────────────────┘
          │ stdout RESULT_JSON:{…}
┌─────────▼───────────────────────────────────────────────────┐
│  scripts/gee_analysis.py                                    │
│  • Sentinel-1 GRD VV (IW mode, same orbit + ±5° angle)     │
│  • SRTM slope mask (> 20°) + JRC water mask (occ > 10%)    │
│  • BCI = log(latest_VV / median_baseline_VV)               │
│  • ISI = stdDev(VV stack, N ≤ 12)                           │
│  • Persistence = count(|log-ratio| > 1.2 across stack)     │
│  • Detection: (|BCI|>1.0 ∧ ISI>1.0) ∨ |BCI|>1.5           │
│               ∧ persistence ≥ 1  ∧ connected_pixels > 1   │
│  • Confidence: 0.4·BCI + 0.3·ISI + 0.3·pers  (0–100)      │
│  • reduceToVectors at 40 m grid → top 300 by confidence    │
└─────────┬───────────────────────────────────────────────────┘
          │
   Google Earth Engine Cloud
   (Sentinel-1 GRD Collection, SRTM, JRC GSW)
```

---

## Methodology

### 1. Geometric Consistency

Every search enforces a single orbital pass (Ascending or Descending) and a
±5° incidence-angle window. Mixing different look angles produces geometric
artefacts that would be mistaken for real surface change.

### 2. Backscatter Change Intensity (BCI)

```
BCI = log(latest_VV / median_baseline_VV)
```

- **Units:** dimensionless log-ratio (natural log)
- **What it captures:** shifts in C-band radar reflectivity — soil moisture
  changes, surface roughness changes, construction, or genuine ground deformation
- **What it does NOT capture:** millimetric displacement (requires phase data)

### 3. Intensity Stability Index (ISI)

```
ISI = stdDev(VV₁, VV₂, …, VV₁₂)
```

High ISI indicates a surface whose radar return varies strongly across the 12
acquisitions. This can mean seasonal vegetation, construction activity, or
physical instability — it cannot be disambiguated without additional context.

### 4. Persistence Filter

Counts the number of acquisitions in which `|log-ratio| > 1.2`. Requiring ≥ 1
recurrence suppresses single-pass artefacts (atmospheric water vapour, orbit
geometry glitches).

### 5. Confidence Score (Heuristic)

```
confidence = (0.4 × clamp(|BCI|/4, 0,1)
            + 0.3 × clamp(ISI/8,  0,1)
            + 0.3 × clamp(pers/6, 0,1)) × 100
```

Normalisation denominators (4.0, 8.0, 6.0) and weights (0.4, 0.3, 0.3) are
heuristic. They were not calibrated against a labelled ground-truth dataset.
Treat this score as a **relative ranking** within a single query, not an
absolute probability.

### Heuristic Threshold Reference

| Metric | Threshold | Role |
|--------|-----------|------|
| BCI (log-ratio) | \|BCI\| > 1.5 | Path B trigger (strong shift) |
| BCI + ISI | \|BCI\| > 1.0 AND ISI > 1.0 | Path A trigger (persistent variation) |
| Persistence | ≥ 1 recurrence | Artefact suppression |
| Confidence | > 65 → high, 35–65 → moderate, ≤ 35 → low | Display classification |

---

## Scientific Validity & Evaluation Status

### Current State

The system currently produces **heuristic statistical outliers**. The dataset
(`dataset/labels/labels.csv`) contains 23 patches, all labelled `1` (positive)
from pipeline output — there are no verified negative samples.

This means:
- Precision and recall **cannot be computed** yet.
- The confidence score **cannot be calibrated** without ground truth.
- No baseline comparison (logistic regression, random forest, simple threshold)
  exists yet.

### Evaluation Framework (ready to run once ground truth is collected)

`scripts/evaluate.py` provides:
- Dataset audit (class balance, missing files)
- `threshold_sweep()` — precision / recall / F1 at configurable thresholds
- `precision_recall_f1()` — isolated, unit-tested helper

```bash
python scripts/evaluate.py
python scripts/evaluate.py --threshold 50
```

### Path to Meaningful Metrics

1. Collect 20+ verified negative patches (stable areas, no sinkhole history).
2. Annotate confidence scores from GEE output into `labels.csv`.
3. Run `scripts/evaluate.py` to generate precision/recall table.
4. Compare against baselines: fixed-threshold BCI, ISI-only, BCI+ISI combination.
5. Report: precision @ recall = 0.8, ROC-AUC, false alarm rate, lead time.

**Recommended ground-truth sources:**
- USGS National Sinkhole Database (USA)
- Copernicus EGMS (European Ground Motion Service)
- BGS GeoSure (UK)
- Karapınar municipal surveys (Turkey)

---

## Engineering

### Tests

```bash
npm install          # installs jest
npm test             # runs tests/scoring.test.js
npm run test:coverage
```

The test suite covers all four pure functions in `src/lib/scoring.js`:
`classifyRisk`, `extractProp`, `buildGeoJSON`, `countByRisk`.

### CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on every push to `main`:

| Job | Steps |
|-----|-------|
| `js` | `npm ci` → lint → **unit tests** → build |
| `python` | `pip install flake8` → **flake8 scripts/** → `python scripts/evaluate.py` |

### Security

| Concern | Mitigation |
|---------|-----------|
| Shell injection | `spawn("python", [scriptPath, lat, lon])` — no shell, args are array |
| Input validation | City name: max 100 chars, Unicode letter/number/common-punct regex |
| Lat/lon injection | `getCoordinates()` returns `parseFloat()` values; floats passed directly |
| Rate limiting | 10 req/min per IP (in-memory, resets on process restart) |
| Geocoding cache | 1 h TTL prevents repeated Nominatim hammering |
| Credentials | Store in `.env`; `.env` must be in `.gitignore` |

---

## Setup

### Prerequisites

- Node.js ≥ 18, Python ≥ 3.9
- A Google Cloud project with the Earth Engine API enabled
- A GEE service account **or** `earthengine authenticate` run locally

### Installation

```bash
# 1. Clone and install
git clone <repo>
cd sol-voyager
npm install
pip install -r requirements.txt

# 2. Configure credentials
cp .env.example .env
# Fill in GEE_PROJECT_ID (and optionally Copernicus credentials)

# 3. Run tests
npm test

# 4. Dev server
npm run dev
# Open http://localhost:3000/map, search "Karapinar" to test
```

### Environment Variables

```
GEE_PROJECT_ID=your-gcp-project-id
COPERNICUS_USERNAME=optional
COPERNICUS_PASSWORD=optional
```

---

## Limitations & Honest Scope

| Claim | True? | Notes |
|-------|-------|-------|
| Detects phase deformation | **No** | GRD data only; no phase unwrapping |
| Outputs mm/yr displacement | **No** | BCI is a dimensionless log-ratio |
| Calibrated risk scores | **No** | Weights and thresholds are heuristic |
| Validated against ground truth | **No** | Dataset has no negatives yet |
| Real-time alerts | **No** | On-demand query only; no persistence layer |
| InSAR analysis | **No** | This is SAR intensity analysis, not InSAR |

This system is a **research prototype** that demonstrates:
- Cloud-native SAR processing via GEE
- Multi-temporal anomaly screening at scale
- Principled software architecture (tests, CI, input validation)
- Honest documentation of what was and was not implemented

It is suitable as a **candidate screening tool** that flags areas warranting
further interferometric investigation — not as a standalone risk assessment.

---

## Roadmap (next steps toward validation)

- [ ] Collect label=0 patches from verified stable regions
- [ ] Calibrate confidence thresholds against labelled set (precision/recall table)
- [ ] Add baselines: fixed-threshold BCI, logistic regression on [BCI, ISI, pers]
- [ ] Spatial cross-validation: train on held-out regions/time windows
- [ ] Replace blocking GEE call with async job queue + status endpoint
- [ ] Replace local file writes with object storage (GCS/S3)
- [ ] SLC InSAR integration (SNAP or ISCE2) for actual deformation measurement
