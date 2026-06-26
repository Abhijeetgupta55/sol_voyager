"""
Sol Voyager — GEE Backscatter Anomaly Screener
===============================================
Detects statistical anomalies in Sentinel-1 GRD (Ground Range Detected) VV
backscatter over a 5 km AOI using Google Earth Engine.

WHAT THIS DOES
--------------
Multi-temporal intensity analysis: compares the most recent acquisition against
a median baseline from up to 12 geometrically consistent acquisitions, then
flags pixels whose log-ratio (BCI) or temporal variance (ISI) exceeds heuristic
thresholds.

WHAT THIS DOES NOT DO
---------------------
- Does NOT use SLC (Single-Look Complex) data.
- Does NOT compute interferometric phase.
- Does NOT measure millimetric ground deformation.
- Outputs are uncalibrated statistical outliers. They require ground-truth
  validation before being used for any risk-assessment decision.

DETECTION LOGIC (heuristic, uncalibrated)
-----------------------------------------
  Path A: |BCI| > 1.0  AND  ISI > 1.0          (persistent high variation)
  Path B: |BCI| > 1.5                           (strong single-image shift)
  Final : (Path A OR Path B) AND persistence ≥ 1 AND connected_pixels > 1

CONFIDENCE SCORE (0–100, heuristic)
-------------------------------------
  0.4 × clamp(|BCI|/4.0, 0, 1)
  + 0.3 × clamp(ISI/8.0,  0, 1)
  + 0.3 × clamp(pers/6.0, 0, 1)
  Normalisation denominators are arbitrary; treat as relative ranking only.
"""

import ee
import sys
import json
import os
from dotenv import load_dotenv

load_dotenv()


def run_gee_analysis(lat, lon):
    # ── GEE initialisation ─────────────────────────────────────────────────
    try:
        project_id = os.getenv("GEE_PROJECT_ID")
        ee.Initialize(project=project_id) if project_id else ee.Initialize()
    except Exception as e:
        _fail(f"GEE initialisation failed: {e}")
        return

    # ── AOI: 5 km buffer ───────────────────────────────────────────────────
    point = ee.Geometry.Point([lon, lat])
    aoi = point.buffer(5000).bounds()

    # ── 1. Broad Sentinel-1 GRD query (VV, IW, newest first) ──────────────
    base_col = (
        ee.ImageCollection("COPERNICUS/S1_GRD")
        .filterBounds(aoi)
        .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
        .filter(ee.Filter.eq("instrumentMode", "IW"))
        .sort("system:time_start", False)
    )

    # ── 2. Enforce geometric consistency (same orbit & ±5° incidence) ──────
    orbit_pass, angle = _detect_geometry(base_col)
    if orbit_pass is None:
        _fail("Could not identify orbital pass from first 5 images.")
        return

    s1_col = base_col.filter(ee.Filter.eq("orbitProperties_pass", orbit_pass))
    if angle is not None:
        s1_col = s1_col.filter(
            ee.Filter.rangeContains("incidenceAngle", angle - 5, angle + 5)
        )

    # ── 3. Environmental masking (slope > 20° and open water removed) ──────
    slope = ee.Terrain.slope(ee.Image("USGS/SRTMGL1_003"))
    water_occ = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("occurrence").unmask(0)
    terrain_mask = slope.lt(20).And(water_occ.lte(10))
    s1_col = s1_col.map(lambda img: img.updateMask(terrain_mask))

    # ── 4. Stack integrity check ───────────────────────────────────────────
    total_available = s1_col.size().getInfo()
    if total_available < 5:
        _fail(
            f"Only {total_available} geometrically consistent images available "
            "(minimum 5 required for stable baseline)."
        )
        return

    stack = s1_col.limit(12)   # cap at 12 for manageable computation
    latest = ee.Image(stack.first()).select("VV")
    baseline = stack.median().select("VV")   # robust to outliers

    # ── 5. Core metrics ────────────────────────────────────────────────────
    # BCI: log-ratio of latest vs. baseline (natural log, dimensionless)
    bci = latest.divide(baseline).log().rename("bci")

    # ISI: temporal standard deviation across the stack
    isi = stack.select("VV").reduce(ee.Reducer.stdDev()).rename("isi")

    # Persistence: count images where |log-ratio| exceeds 1.2
    def _count_recurrence(img):
        diff = img.select("VV").divide(baseline).log().abs()
        return diff.gt(1.2).rename("occ")

    persistence = (
        ee.ImageCollection(stack).map(_count_recurrence).sum().rename("persistence")
    )

    # ── 6. Heuristic detection logic ───────────────────────────────────────
    path_a = bci.abs().gt(1.0).And(isi.gt(1.0))   # persistent high variation
    path_b = bci.abs().gt(1.5)                     # strong single-image shift
    # Require at least 1 recurrence (persistence > 0) to suppress one-off artefacts
    flagged = path_a.Or(path_b).And(persistence.gt(0))

    # ── 7. Speckle removal (require ≥ 2 connected pixels) ─────────────────
    pixel_count = flagged.connectedPixelCount(100, False)
    anomaly_mask = flagged.And(pixel_count.gt(1))

    # ── 8. Weighted confidence score (0–100) ──────────────────────────────
    conf_bci = bci.abs().divide(4.0).clamp(0, 1)
    conf_isi = isi.divide(8.0).clamp(0, 1)
    conf_pers = persistence.divide(6.0).clamp(0, 1)
    confidence = (
        conf_bci.multiply(0.4)
        .add(conf_isi.multiply(0.3))
        .add(conf_pers.multiply(0.3))
        .multiply(100)
        .rename("confidence")
    )

    # ── 9. Vectorised extraction at 40 m grid ─────────────────────────────
    vector_input = (
        anomaly_mask.rename("label").toInt()
        .addBands(bci)
        .addBands(isi)
        .addBands(persistence)
        .addBands(confidence)
    )
    anomaly_vectors = vector_input.updateMask(anomaly_mask).reduceToVectors(
        geometry=aoi,
        scale=40,
        geometryType="centroid",
        reducer=ee.Reducer.mean(),
        maxPixels=1e8,
    )

    # Return top 300 by confidence (UI practicality limit)
    top_features = anomaly_vectors.sort("confidence", False).limit(300)
    features = top_features.getInfo()["features"]

    result = {
        "product_count": stack.size().getInfo(),
        "total_available": total_available,
        "orbit_detected": orbit_pass,
        "incidence_angle": round(angle, 1) if angle is not None else None,
        "anomaly_count": len(features),
        "anomalies": features,
        "methodology": (
            "GRD VV backscatter log-ratio anomaly detection. "
            "No phase data; no deformation measurement. "
            "Outputs require ground-truth validation."
        ),
        "status": "BACKSCATTER_ANALYSIS_COMPLETE",
    }
    print(f"RESULT_JSON:{json.dumps(result)}")
    return result


def _detect_geometry(collection):
    """Return (orbit_pass, incidence_angle) from the first available image."""
    features = collection.limit(5).getInfo().get("features", [])
    for f in features:
        props = f.get("properties", {})
        orbit = props.get("orbitProperties_pass")
        angle = props.get("incidenceAngle")
        if orbit:
            return orbit, angle
    return None, None


def _fail(message):
    print(f"RESULT_JSON:{json.dumps({'error': message})}")


if __name__ == "__main__":
    if len(sys.argv) > 2:
        run_gee_analysis(float(sys.argv[1]), float(sys.argv[2]))
    else:
        # Default: Karapınar, Turkey — active sinkhole region
        run_gee_analysis(37.675, 33.554)
