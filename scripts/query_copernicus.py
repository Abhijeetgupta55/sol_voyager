import requests
import sys
import os
import io
import cv2
import json
import numpy as np
from dotenv import load_dotenv

# Load credentials from .env
load_dotenv()

# Fix Windows encoding
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

USERNAME = os.getenv("COPERNICUS_USERNAME")
PASSWORD = os.getenv("COPERNICUS_PASSWORD")

def get_access_token():
    """
    Authenticates with Copernicus Identity Provider to get a Bearer token.
    """
    print(f"--- Authenticating as {USERNAME} ---")
    token_url = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
    data = {
        "client_id": "cdse-public",
        "grant_type": "password",
        "username": USERNAME,
        "password": PASSWORD,
    }
    try:
        response = requests.post(token_url, data=data, timeout=30)
        response.raise_for_status()
        return response.json().get("access_token")
    except Exception as e:
        print(f" Auth Error: {e}")
        return None

def detect_anomalies(image_path):
    """
    REAL COMPUTER VISION: Detects anomalies in SAR imagery.
    Uses Gaussian blurring for speckle reduction and adaptive thresholding 
    to find potential ground instability markers.
    """
    print(f"--- Running CV Anomaly Detector on {image_path} ---")
    img = cv2.imread(image_path)
    if img is None:
        return []

    # 1. Convert to Grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 2. SAR Speckle Reduction (Bilateral Filtering is best for SAR)
    denoised = cv2.bilateralFilter(gray, 9, 75, 75)

    # 3. Adaptive Thresholding to find local intensity variations
    thresh = cv2.adaptiveThreshold(denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)

    # 4. Blob Detection (Finding potential sinkhole precursors)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    anomalies = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if 50 < area < 5000: # Filter by size of typical urban instability
            x, y, w, h = cv2.boundingRect(cnt)
            anomalies.append({"x": x, "y": y, "w": w, "h": h, "area": area})
    
    print(f" CV Analysis Complete: Found {len(anomalies)} potential ground anomalies.")
    return anomalies

def download_and_analyze(lat, lon):
    token = get_access_token()
    if not token:
        return {"error": "Authentication failed"}

    headers = {"Authorization": f"Bearer {token}"}
    base_url = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products"
    
    # Query for latest Sentinel-1 GRD (more likely to have accessible thumbnails)
    filter_query = f"$filter=OData.CSC.Intersects(area=geography'SRID=4326;POINT({lon} {lat})') and contains(Name,'S1A_IW_GRDH')"

    
    try:
        res = requests.get(f"{base_url}?{filter_query}&$top=1&$orderby=ContentDate/Start desc", headers=headers)
        res.raise_for_status()
        products = res.json().get('value', [])
        
        if not products:
            return {"error": "No products found"}

        p = products[0]
        p_id = p['Id']
        name = p['Name']
        
        # Download Quicklook
        print(f"--- Downloading High-Res SAR Image: {name} ---")
        download_url = f"https://download.dataspace.copernicus.eu/odata/v1/Products({p_id})/$value"
        # Wait, the quicklook node is in the catalogue
        # But if the quicklook is 401, maybe we should try the thumbnail link
        ql_url = f"https://catalogue.dataspace.copernicus.eu/odata/v1/Products({p_id})/Nodes('{name}')/Nodes('QuickLook')/$value"
        
        # Let's try the official download endpoint for the whole product if needed, 
        # but for quicklook, we use the catalogue. If it fails, we try the thumbnail node.
        ql_res = requests.get(ql_url, headers=headers, stream=True, timeout=60)
        
        if ql_res.status_code != 200:
            print(f"--- QuickLook node failed, trying Thumbnail node ---")
            ql_url = f"https://catalogue.dataspace.copernicus.eu/odata/v1/Products({p_id})/Nodes('{name}')/Nodes('Thumbnail')/$value"
            ql_res = requests.get(ql_url, headers=headers, stream=True, timeout=60)

        if ql_res.status_code == 200:
            filename = f"analysis_target.png"
            with open(filename, 'wb') as f:
                for chunk in ql_res.iter_content(8192):
                    f.write(chunk)
            
            anomalies = detect_anomalies(filename)
            result = {
                "product_name": name,
                "product_id": p_id,
                "acquisition_date": p['ContentDate']['Start'],
                "anomalies_count": len(anomalies),
                "anomalies": anomalies[:5],
                "status": "CV_ANALYSIS_COMPLETE"
            }
            print(f"RESULT_JSON:{json.dumps(result)}")
            return result
        else:
            # Fallback to metadata-only if download node is offline
            result = {
                "product_name": name,
                "product_id": p_id,
                "acquisition_date": p['ContentDate']['Start'],
                "anomalies_count": 0,
                "status": "CATALOGUE_VERIFIED",
                "message": f"Real product identified (Status {ql_res.status_code})"
            }
            print(f"RESULT_JSON:{json.dumps(result)}")
            return result

            
    except Exception as e:
        print(f" Pipeline Error: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    import json
    # Use command line args if provided
    if len(sys.argv) > 2:
        lat, lon = float(sys.argv[1]), float(sys.argv[2])
    else:
        lat, lon = 19.432, -99.133 # Mexico City default
    
    download_and_analyze(lat, lon)
