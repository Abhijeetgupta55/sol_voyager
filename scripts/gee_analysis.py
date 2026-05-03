import ee
import sys
import json
import os
from dotenv import load_dotenv

# Load environment
load_dotenv()

def run_gee_analysis(lat, lon):
    """
    PERFORMS REAL SAR SCIENCE IN GEE:
    """
    try:
        # Load Project ID from .env or use a default if you've set it via CLI
        project_id = os.getenv("GEE_PROJECT_ID")
        if project_id:
            ee.Initialize(project=project_id)
        else:
            ee.Initialize() # Fallback to default project
    except Exception as e:
        err_res = {"error": f"GEE Initialization Failed: {str(e)}"}
        print(f"RESULT_JSON:{json.dumps(err_res)}")
        return err_res



    # Define Area of Interest (AOI) - 5km buffer
    point = ee.Geometry.Point([lon, lat])
    aoi = point.buffer(5000).bounds()

    # Load Sentinel-1 Collection
    s1_col = ee.ImageCollection('COPERNICUS/S1_GRD') \
        .filterBounds(aoi) \
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV')) \
        .filter(ee.Filter.eq('instrumentMode', 'IW')) \
        .sort('system:time_start', False)

    # 1. Temporal Stacking
    stack = s1_col.limit(10) # Last 10 acquisitions (~2-3 months)
    
    # 2. Latest Image vs Historical Baseline
    latest = ee.Image(stack.first()).select('VV')
    baseline = stack.median().select('VV')

    # 3. Log-Ratio Change Detection (Identifies surface anomalies)
    log_ratio = latest.subtract(baseline).rename('log_ratio')

    # 4. Temporal Variance (Identifies ground instability over time)
    variance = stack.select('VV').reduce(ee.Reducer.stdDev()).rename('variance')

    # 5. Extract Stats for the UI
    stats = log_ratio.addBands(variance).reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=aoi,
        scale=30,
        maxPixels=1e9
    ).getInfo()

    # 6. Generate Risk Grid Data
    # We sample a 10x10 grid to populate our GeoJSON
    samples = log_ratio.addBands(variance).sample(
        region=aoi,
        scale=500,
        numPixels=100,
        geometries=True
    ).getInfo()

    result = {
        "product_count": stack.size().getInfo(),
        "mean_log_ratio": stats.get('log_ratio'),
        "mean_variance": stats.get('variance'),
        "latest_acq": latest.get('system:index').getInfo(),
        "anomalies": samples['features'], # Real SAR feature points
        "status": "GEE_REMOTE_SENSING_VERIFIED"
    }
    
    print(f"RESULT_JSON:{json.dumps(result)}")
    return result

if __name__ == "__main__":
    if len(sys.argv) > 2:
        run_gee_analysis(float(sys.argv[1]), float(sys.argv[2]))
    else:
        # Default to Delhi for test
        run_gee_analysis(28.6139, 77.2090)
