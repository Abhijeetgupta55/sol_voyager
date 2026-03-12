from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

CITY_COORDS = {
    "karapinar": [37.675, 33.554],
    "konya": [37.874, 32.493],
    "ankara": [39.933, 32.859],
    "istanbul": [41.008, 28.978],
}

@app.route("/api/susceptibility")
def susceptibility():
    city = request.args.get("city", "").lower()
    center = CITY_COORDS.get(city, [37.675, 33.554])

    geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"risk": "very_high"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [center[1]-0.032, center[0]-0.032],
                        [center[1]+0.034, center[0]-0.034],
                        [center[1]+0.034, center[0]+0.034],
                        [center[1]-0.032, center[0]+0.032],
                        [center[1]-0.039, center[0]-0.039]
                    ]]
                }
            },
            {
                "type": "Feature",
                "properties": {"risk": "moderate"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [center[1]-0.065, center[0]-0.065],
                        [center[1]-0.035, center[0]-0.075],
                        [center[1]-0.035, center[0]-0.035],
                        [center[1]-0.075, center[0]-0.035],
                        [center[1]-0.075, center[0]-0.075]
                    ]]
                }
            }
        ]
    }

    factors = {
        "geology": "Karstic Limestone - Susceptible" if city == "karapinar" else "Mixed Sedimentary",
        "deformation": "25 mm/year Subsidence - HIGH RISK" if city == "karapinar" else "5 mm/year - MODERATE",
        "groundwater": "Rapid Decline - HIGH RISK" if city == "karapinar" else "Stable - LOW RISK",
    }

    return jsonify({
        "geojson": geojson,
        "center": center,
        "factors": factors
    })

if __name__ == "__main__":
    app.run(debug=True)

import requests
import pandas as pd
import matplotlib.pyplot as plt
import json

API_KEY = "DEMO_KEY"

def fetch_apod():
    url = f"https://api.nasa.gov/planetary/apod?api_key={API_KEY}"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        print("Error fetching APOD data")
        return None

def process_data(data):
    if data is None:
        return None
    df = pd.DataFrame([data])
    return df

def visualize_apod(df):
    if df is not None:
        print(df[['date', 'title', 'url']])

def main():
    data = fetch_apod()
    df = process_data(data)
    visualize_apod(df)

if __name__ == "__main__":
    main()
