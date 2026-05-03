import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import util from "util";

const execPromise = util.promisify(exec);

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
  // Use real GEE feature points if available
  if (geeResult && geeResult.anomalies) {
    return {
      type: "FeatureCollection",
      features: geeResult.anomalies.map(f => {
        const lr = f.properties.bci || 0; // Backscatter Change Intensity
        const si = f.properties.isi || 0; // Intensity Stability Index
        
        // HEURISTIC CLUSTERING (Uncalibrated)
        let risk = "low";
        if (Math.abs(lr) > 2.0 || si > 4.0) risk = "very_high";
        else if (Math.abs(lr) > 1.2 || si > 1.5) risk = "moderate";

        return {
          type: "Feature",
          properties: {
            risk,
            bci_db: lr.toFixed(3),
            isi_std: si.toFixed(3),
            label: "Heuristic Outlier"
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
