import ee
import datetime

# Initialize the Google Earth Engine API
# Note: You need to run 'earthengine authenticate' once in your environment
try:
    ee.Initialize()
    print("Google Earth Engine initialized successfully.")
except Exception as e:
    print("Error initializing Earth Engine. Have you authenticated?")
    print(e)
    exit()

def get_sentinel1_data(lat, lon, start_date, end_date):
    """
    Fetches Sentinel-1 GRD data for a specific location and date range.
    While InSAR (phase) isn't directly in GEE GRD, backscatter intensity 
    is a key precursor for research.
    """
    point = ee.Geometry.Point([lon, lat])
    
    # Filter the Sentinel-1 collection
    collection = (ee.ImageCollection('COPERNICUS/S1_GRD')
                  .filterBounds(point)
                  .filterDate(start_date, end_date)
                  # Filter for IW mode and VV/VH polarization
                  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
                  .filter(ee.Filter.eq('instrumentMode', 'IW'))
                  .sort('system:time_start'))

    count = collection.size().getInfo()
    print(f"Found {count} acquisitions for this period.")

    if count > 0:
        latest_image = collection.first()
        metadata = latest_image.getInfo()
        print(f"Latest Acquisition: {metadata['properties']['system:index']}")
        print(f"Satellite: {metadata['properties']['platform_number']}")
        print(f"Orbit Direction: {metadata['properties']['orbitProperties_pass']}")
        
        # In a real research project, you would export this image or calculate 
        # a time-series of backscatter to detect anomalies.
        return metadata
    else:
        print("No data found for the specified range.")
        return None

if __name__ == "__main__":
    # Example: Karapinar, Turkey (Sinkhole hotspot)
    target_lat = 37.675
    target_lon = 33.554
    
    start = '2024-01-01'
    end = '2024-05-01'
    
    print(f"Querying Sentinel-1 data for Lat:{target_lat}, Lon:{target_lon}...")
    get_sentinel1_data(target_lat, target_lon, start, end)
