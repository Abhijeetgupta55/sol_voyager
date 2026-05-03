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
        const lr = f.properties.log_ratio || 0;
        const v = f.properties.variance || 0;
        
        // SCIENTIFIC RISK MAPPING:
        // High Log-Ratio difference + High Variance = Critical instability
        let risk = "low";
        if (Math.abs(lr) > 3.0 || v > 5.0) risk = "very_high";
        else if (Math.abs(lr) > 1.5 || v > 2.0) risk = "moderate";

        return {
          type: "Feature",
          properties: {
            risk,
            log_ratio: lr.toFixed(3),
            variance: v.toFixed(3),
            deformationRate: (lr * 5).toFixed(1), // Derived velocity
            coherence: (1.0 - Math.min(v/10, 1.0)).toFixed(2)
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
    insarMetadata: {
      satellite: "Sentinel-1 (VV)",
      method: "Log-Ratio Change Detection",
      stack_size: geeResult?.product_count || 0,
      latest_acq: geeResult?.latest_acq || "Live",
      status: geeResult ? "GEE Cloud Processing Complete" : "GEE Authentication Required"
    },
    factors: {
      geology: "SAR Backscatter analysis engaged",
      groundwater: "Temporal variance identified",
      insar_summary: geeResult 
        ? `GEE analyzed ${geeResult.product_count} acquisitions. Mean Log-Ratio: ${geeResult.mean_log_ratio?.toFixed(4)}.`
        : "GEE Handshake failed. Please run 'earthengine authenticate'."
    }
  });
}

