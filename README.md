# Sol Voyager: Multi-Temporal SAR Backscatter Analysis & Ground Instability Monitoring

Sol Voyager is a cloud-native research platform designed to monitor surface instability using Synthetic Aperture Radar (SAR) intensity data. Unlike traditional optical monitoring, which is limited by cloud cover and daylight, this system leverages the C-band microwave signals from the Sentinel-1 constellation to detect subtle changes in ground backscatter. The project has transitioned from a simulated dashboard into a functional analytical engine powered by Google Earth Engine (GEE), providing real-time statistical insights into surface anomalies.

### Project Architecture

The repository is organized to separate heavy geospatial computation from the frontend visualization layer.

```text
sol-voyager/
├── scripts/
│   └── gee_analysis.py       # Core SAR Physics & GEE Logic
├── src/
│   ├── app/
│   │   ├── api/              # Next.js Serverless Bridge
│   │   └── map/              # Main Monitoring Interface
│   └── components/           # Research UI Components
├── requirements.txt          # Python Dependencies
├── package.json              # Frontend Dependencies
└── README.md                 # Scientific Documentation
```

### Core Methodology and Scientific Approach

The analytical core is built on the principle of Multi-Temporal Intensity Analysis. By comparing the most recent radar acquisitions against a long-term statistical baseline, the system identifies regions where the dielectric properties or surface roughness of the ground have shifted.

1. Radiometric Terrain Correction (RTC): To prevent topography-induced false positives, the engine integrates a 30-meter SRTM Digital Elevation Model. This allows the system to mask out any region where the local slope exceeds 15 degrees, eliminating the geometric distortions typical of radar layover.

2. Backscatter Change Intensity (BCI): Using a log-ratio approach, the system identifies decibel-scale shifts in backscatter. This is more resilient to speckle noise than standard linear differencing.

3. Intensity Stability Index (ISI): We calculate the temporal standard deviation across a 12-image stack. This helps differentiate between persistent ground scatterers and random environmental noise.

### Heuristic Metric Reference

The following table outlines the statistical thresholds used to identify potential anomaly clusters in the uncalibrated engine.

| Metric | Threshold | Interpretation |
| :--- | :--- | :--- |
| BCI (dB Change) | > ±2.0 dB | Significant surface backscatter shift |
| ISI (Stability) | > 3.5 | High intensity variability / Unstable |
| BCI (dB Change) | ±1.0 to 2.0 | Moderate backscatter fluctuation |
| ISI (Stability) | 1.0 to 2.0 | Seasonally variable or semi-stable |

### Geometric Integrity and Adaptive Stacking

A major challenge in SAR research is the variation in satellite geometry. Sol Voyager addresses this through an Adaptive Geometry Engine that enforces strict data consistency. The system automatically detects the orbital pass (Ascending or Descending) and the swath-level incidence angle of the most recent image. It then filters the entire historical stack to match these exact parameters. 

> [!NOTE]
> This ensures that the radar "looks" at the ground from the same direction in every image, preventing the fake anomalies that occur when mixing different flight paths.

### Machine Learning & Dataset Harvesting

Sol Voyager includes an automated data harvester designed to generate training sets for Convolutional Neural Networks (CNNs). Every research query performed through the dashboard triggers a background export of the analyzed SAR data.

1. Patch Extraction: The system extracts a 2.5km x 2.5km spatial patch (256x256 pixels) centered on the study zone. This patch is saved in the native NPY format, preserving the raw floating-point backscatter values across multiple bands (BCI and ISI).

2. Automated Labeling: Using the terrain-corrected anomaly mask, the engine assigns a binary label (1 for detected instability, 0 for stable ground) to each patch. These mappings are stored in `dataset/labels/labels.csv`.

3. Multi-Band Data: Each exported NPY file contains the Backscatter Change Intensity (Band 1) and the Intensity Stability Index (Band 2), providing the spatial context necessary for deep learning models to learn geometric instability patterns.

### Technical Infrastructure

1. Google Earth Engine: All heavy radiometric processing is offloaded to Google’s cloud servers. The Python based analysis scripts use the Earth Engine API to perform per-pixel reductions and terrain corrections at the native 10-meter resolution of Sentinel-1.

2. Next.js API Bridge: A secure API layer manages the handshake between the frontend and the GEE Python environment, delivering GeoJSON anomaly clusters to the client.

3. Leaflet.js: The frontend renders these clusters as heuristic heat-circles. Each point is an interactive data node, allowing users to inspect the raw BCI and ISI values of a specific coordinate.

### Research Disclosure and Limitations

It is important to note that this system currently utilizes SAR Intensity (GRD) data rather than Phase (SLC) data. As such, the outputs represent backscatter anomalies and statistical instability rather than millimetric phase-unwrapped deformation (InSAR). The risk zones identified are "Heuristic Outliers" and should be interpreted as candidates for further interferometric validation.

### Implementation Guide

1. Initial Configuration: Ensure you have a Google Cloud Project with the Earth Engine API enabled. Create a .env file in the root directory containing your COPERNICUS_USERNAME, COPERNICUS_PASSWORD, and GEE_PROJECT_ID.

2. Environment Setup: Install the necessary dependencies by running `npm install` for the frontend and `pip install -r requirements.txt` for the Python analytical bridge.

3. Deployment: Launch the development server using `npm run dev`. Navigate to the map interface and search for a target region (e.g., Delhi) to trigger the cloud-native analysis pipeline.