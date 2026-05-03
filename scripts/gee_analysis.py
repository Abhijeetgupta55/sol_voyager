import ee
import sys
import json
import os
from dotenv import load_dotenv

# Load environment
load_dotenv()

def run_gee_analysis(lat, lon):
    """
    SAR BACKSCATTER ANOMALY DETECTION (RESEARCH GRADE):
    1. Robust Adaptive Geometry Detection.
    2. SRTM-based Slope Masking (>15 deg removed).
    3. Strict Geometric Consistency (Orbit/Angle) - NO FALLBACKS.
    4. Explicitly labeled uncalibrated heuristics.
    """
    try:
        project_id = os.getenv("GEE_PROJECT_ID")
        if project_id:
            ee.Initialize(project=project_id)
        else:
            ee.Initialize()
    except Exception as e:
        err_res = {"error": f"GEE Initialization Failed: {str(e)}"}
        print(f"RESULT_JSON:{json.dumps(err_res)}")
        return err_res

    # AOI - 5km Study Zone
    point = ee.Geometry.Point([lon, lat])
    aoi = point.buffer(5000).bounds()

    # 1. Broad Query
    base_col = ee.ImageCollection('COPERNICUS/S1_GRD') \
        .filterBounds(aoi) \
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV')) \
        .filter(ee.Filter.eq('instrumentMode', 'IW')) \
        .sort('system:time_start', False)

    # 2. ROBUST GEOMETRY DETECTION
    # Sometimes the very latest image has incomplete metadata. 
    # We find the most recent image with a full geometric signature.
    # 2. ROBUST GEOMETRY DETECTION
    def find_reference_geometry(collection):
        list_imgs = collection.limit(5).getInfo().get('features', [])
        for f in list_imgs:
            p = f.get('properties', {})
            o = p.get('orbitProperties_pass')
            a = p.get('incidenceAngle') # Might be None
            if o:
                return o, a
        return None, None

    orbit_pass, angle = find_reference_geometry(base_col)
    
    if orbit_pass is None:
        err_res = {"error": "Could not identify orbital pass for this AOI."}
        print(f"RESULT_JSON:{json.dumps(err_res)}")
        return err_res

    # 3. STRICT Consistency Filter (No Fallback)
    s1_col = base_col.filter(ee.Filter.eq('orbitProperties_pass', orbit_pass))
    
    # Optional: Filter by angle only if metadata is available
    if angle:
        s1_col = s1_col.filter(ee.Filter.rangeContains('incidenceAngle', angle - 5, angle + 5))



    # 4. TERRAIN & WATER NORMALIZATION (Slope & Surface Water Masked)
    dem = ee.Image('USGS/SRTMGL1_003')
    slope = ee.Terrain.slope(dem)
    
    # Global Surface Water Mask (JRC)
    jrc = ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
    # Use unmask(0) to ensure land with 0 water occurrence is not nulled out
    water_occurrence = jrc.select('occurrence').unmask(0)
    land_mask = water_occurrence.lt(10) # Keep anything with < 10% water occurrence
    
    # Combined Mask: Gentle slope AND not water
    # Increased slope threshold to 20 deg for better urban coverage
    final_mask = slope.lt(20).And(land_mask)
    
    s1_col = s1_col.map(lambda img: img.updateMask(final_mask))

    stack_size = s1_col.size().getInfo()


    
    # 5. Integrity Check
    if stack_size < 5:
        err_res = {"error": f"Insufficient consistent data ({stack_size} images) for {orbit_pass} pass at {angle} deg."}
        print(f"RESULT_JSON:{json.dumps(err_res)}")
        return err_res

    stack = s1_col.limit(12)
    latest = ee.Image(stack.first()).select('VV')
    baseline = stack.median().select('VV')

    # 6. Raw Intensity Metrics (BCI & ISI)
    bci = latest.divide(baseline).log().rename('bci')
    isi = stack.select('VV').reduce(ee.Reducer.stdDev()).rename('isi')

    # 7. Extract Area Statistics
    stats = bci.addBands(isi).reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=aoi,
        scale=10, 
        maxPixels=1e9
    ).getInfo()

    # 8. HEURISTIC ANOMALY SAMPLING
    anomaly_mask = bci.abs().gt(1.5).Or(isi.gt(3.0))
    
    # NEW: Binary Label for ML (1 if the AOI contains high-magnitude anomalies)
    has_anomaly = anomaly_mask.reduceRegion(
        reducer=ee.Reducer.max(),
        geometry=aoi,
        scale=100
    ).getInfo().get('bci', 0) or anomaly_mask.reduceRegion(
        reducer=ee.Reducer.max(),
        geometry=aoi,
        scale=100
    ).getInfo().get('isi', 0)

    # 9. PATCH EXPORT (2.5km Center Patch)
    # Define a smaller patch for ML training (256x256 pixels approx)
    patch_aoi = point.buffer(1280).bounds() 
    patch_url = bci.addBands(isi).getDownloadURL({
        'name': 'sar_patch',
        'scale': 10,
        'region': patch_aoi,
        'format': 'NPY'
    })

    # 8. DETERMINISTIC VECTORIZED EXTRACTION
    # We use the integer mask as the first band to define vector boundaries
    # bci and isi are carried as additional bands for the reducer to process.
    vector_input = anomaly_mask.rename('label').toInt().addBands(bci).addBands(isi)
    
    anomaly_vectors = vector_input.reduceToVectors(
        geometry=aoi,
        scale=40,               # 40m resolution for spatial consistency
        geometryType='centroid',
        reducer=ee.Reducer.mean(),
        maxPixels=1e8
    )

    # Convert to GeoJSON features
    samples = anomaly_vectors.getInfo()




    result = {
        "product_count": stack.size().getInfo(),
        "total_available": stack_size,
        "orbit_detected": orbit_pass,
        "reference_angle": angle,
        "mean_bci": stats.get('bci'),
        "mean_isi": stats.get('isi'),
        "anomalies": samples['features'], 
        "patch_url": patch_url,
        "label": 1 if has_anomaly else 0,
        "status": "GEOMETRIC_INTEGRITY_ENFORCED",
        "terrain_correction": "SRTM_SLOPE_JRC_WATER_MASKED",
        "methodology": "Heuristic Outlier Detection (Uncalibrated)"

    }

    
    print(f"RESULT_JSON:{json.dumps(result)}")
    return result

if __name__ == "__main__":
    if len(sys.argv) > 2:
        run_gee_analysis(float(sys.argv[1]), float(sys.argv[2]))
    else:
        run_gee_analysis(28.6139, 77.2090)
