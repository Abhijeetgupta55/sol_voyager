import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import util from "util";
import fs from "fs";

const execPromise = util.promisify(exec);

/**
 * Automate Dataset Collection for ML Training
 */
async function harvestPatch(patchUrl, label, cityName) {
  if (!patchUrl) return;
  try {
    const timestamp = Date.now();
    const fileName = `${cityName.replace(/\s+/g, '_')}_${timestamp}.npy`;
    const imagePath = path.join(process.cwd(), "dataset", "images", fileName);
    const csvPath = path.join(process.cwd(), "dataset", "labels", "labels.csv");

    // Fetch NPY from GEE
    const response = await fetch(patchUrl);
    if (!response.ok) throw new Error("GEE Patch Download Failed");
    
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(imagePath, buffer);

    // Append to CSV
    const csvLine = `${fileName},${label}\n`;
    if (!fs.existsSync(csvPath)) {
      fs.writeFileSync(csvPath, "filename,label\n");
    }
    fs.appendFileSync(csvPath, csvLine);
    
    console.log(`[DATASET] Harvested patch: ${fileName} (Label: ${label})`);
  } catch (err) {
    console.error("[DATASET ERROR]", err);
  }
}

/**
 * Fetch real coordinates from Nominatim API
 */
async function getCoordinates(city) {

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`,
      {
        headers: { "User-Agent": "SolVoyager/1.0" },
      }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }
  return null;
}

/**
 * Executes the GEE Research Engine (Log-Ratio & Temporal Variance)
 */
async function runGEEAnalysis(lat, lon) {
  const scriptPath = path.join(process.cwd(), "scripts", "gee_analysis.py");
  try {
    const { stdout, stderr } = await execPromise(`python "${scriptPath}" ${lat} ${lon}`);
    if (stderr) console.error("GEE Stderr:", stderr);
    
    const jsonMatch = stdout.match(/RESULT_JSON:({.*})/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]);
  } catch (error) {
    console.error("GEE Pipeline Error:", error);
  }
  return null;
}

function generateSusceptibilityGeoJSON(center, geeResult) {
  if (geeResult && geeResult.anomalies) {
    return {
      type: "FeatureCollection",
      features: geeResult.anomalies.map(f => {
        const props = f.properties || {};
        
        // Find bci and isi by checking for common GEE reduction patterns
        const lr = props.bci || props.bci_mean || props.mean || 0;
        const si = props.isi || props.isi_mean || props.mean_1 || 0;
        
        let risk = "low";
        if (Math.abs(lr) > 2.0 || si > 4.0) risk = "very_high";
        else if (Math.abs(lr) > 1.2 || si > 1.5) risk = "moderate";

        return {
          type: "Feature",
          properties: {
            risk,
            bci_db: Number(lr).toFixed(3),
            isi_std: Number(si).toFixed(3),
            label: "Spatially Fixed Anomaly"
          },
          geometry: f.geometry
        };
      })
    };
  }
  return { type: "FeatureCollection", features: [] };
}


export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const city = (searchParams.get("city") || "").toLowerCase().trim();

  if (!city) return NextResponse.json({ error: "Query required" }, { status: 400 });

  const center = await getCoordinates(city);
  if (!center) return NextResponse.json({ error: "Region not found" }, { status: 404 });

  // RUN REAL GEE SAR ANALYSIS
  const geeResult = await runGEEAnalysis(center[0], center[1]);
  
  // TRIGGER ML HARVESTER (Async)
  if (geeResult && !geeResult.error) {
    harvestPatch(geeResult.patch_url, geeResult.label, city);
  }

  const geojson = generateSusceptibilityGeoJSON(center, geeResult);

  
  return NextResponse.json({ 
    geojson, 
    center, 
    geeResult,
    sarMetadata: {
      satellite: "Sentinel-1 (GRD VV)",
      method: "Heuristic Outlier Detection",
      orbit: geeResult?.orbit_detected || "Detected",
      ref_angle: geeResult?.reference_angle?.toFixed(1) + "°",
      stack_integrity: `${geeResult?.product_count}/${geeResult?.total_available} consistent`,
      status: geeResult ? "Geometric Integrity Enforced" : "GEE Handshake Required"
    },
    factors: {
      geology: "Backscatter intensity distribution (Heuristic)",
      groundwater: "Intensity stability index (Uncalibrated)",
      sar_summary: geeResult 
        ? `Statistical analysis of ${geeResult.product_count} geometrically consistent acquisitions. No phase deformation measured.`
        : "GEE Handshake failed."
    }
  });
}
