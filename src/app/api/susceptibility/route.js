import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { buildGeoJSON } from "@/lib/scoring";

// ── Geocoding cache (TTL: 1 h) ──────────────────────────────────────────────
const geocodeCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

// ── Simple per-IP rate limiter (10 req / min) ────────────────────────────────
const requestLog = new Map();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 10;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = requestLog.get(ip) ?? { count: 0, windowStart: now };
  if (now - entry.windowStart > RATE_WINDOW_MS) {
    requestLog.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count++;
  requestLog.set(ip, entry);
  return true;
}

// ── Geocoding ────────────────────────────────────────────────────────────────
async function getCoordinates(city) {
  const key = city.toLowerCase();
  const hit = geocodeCache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.coords;

  const url =
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=` +
    encodeURIComponent(city);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "SolVoyager/1.0 (research-prototype)" },
    });
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      geocodeCache.set(key, { coords, ts: Date.now() });
      return coords;
    }
  } catch (err) {
    console.error("Geocoding error:", err.message);
  }
  return null;
}

// ── GEE bridge (spawn avoids shell injection; lat/lon are validated floats) ──
function runGEEAnalysis(lat, lon) {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), "scripts", "gee_analysis.py");
    let stdout = "";
    let stderr = "";

    const child = spawn("python", [scriptPath, String(lat), String(lon)], {
      timeout: 120_000,
    });

    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

    child.on("close", (code) => {
      if (stderr) console.error("GEE stderr:", stderr.slice(0, 1000));
      const m = stdout.match(/RESULT_JSON:(\{[\s\S]*\})/);
      if (m) {
        try { resolve(JSON.parse(m[1])); return; } catch (_) { /* fall through */ }
      }
      resolve({ error: code !== 0 ? "GEE process exited with error" : "No result produced" });
    });

    child.on("error", (err) => {
      resolve({ error: `Failed to start GEE process: ${err.message}` });
    });
  });
}

// ── Input validation ─────────────────────────────────────────────────────────
const CITY_RE = /^[\p{L}\p{N}\s,.\-']+$/u;

function validateCity(raw) {
  if (!raw) return "city parameter is required";
  if (raw.length > 100) return "city name too long (max 100 characters)";
  if (!CITY_RE.test(raw)) return "city name contains invalid characters";
  return null;
}

// ── Route handler ────────────────────────────────────────────────────────────
export async function GET(request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded — please wait before retrying." },
      { status: 429 }
    );
  }

  const rawCity = (new URL(request.url).searchParams.get("city") ?? "").trim();
  const validationError = validateCity(rawCity);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const center = await getCoordinates(rawCity);
  if (!center) {
    return NextResponse.json(
      { error: "Region not found. Try a different city name." },
      { status: 404 }
    );
  }
  if (!Number.isFinite(center[0]) || !Number.isFinite(center[1])) {
    return NextResponse.json(
      { error: "Geocoding returned invalid coordinates." },
      { status: 502 }
    );
  }

  const geeResult = await runGEEAnalysis(center[0], center[1]);
  const geojson = buildGeoJSON(geeResult?.anomalies ?? null);

  const stackCount = geeResult?.product_count;
  const totalAvail = geeResult?.total_available;
  const orbit = geeResult?.orbit_detected ?? "Unknown";
  const hasError = Boolean(geeResult?.error);

  return NextResponse.json({
    geojson,
    center,
    geeResult,
    sarMetadata: {
      satellite: "Sentinel-1 GRD (VV polarization, IW mode)",
      method: "Multi-temporal backscatter log-ratio anomaly detection",
      orbit,
      stack_integrity:
        stackCount != null
          ? `${stackCount} / ${totalAvail} geometrically consistent acquisitions`
          : "N/A",
      status: hasError ? `Error: ${geeResult.error}` : "Backscatter analysis complete",
    },
    factors: {
      bci_description:
        "Backscatter Change Intensity — log-ratio of latest vs. median baseline VV intensity. Heuristic; uncalibrated against deformation measurements.",
      isi_description:
        "Intensity Stability Index — temporal standard deviation across acquisition stack. High values indicate variable surface scattering.",
      sar_summary: hasError
        ? `GEE pipeline error: ${geeResult.error}`
        : `Screened ${stackCount} geometrically consistent Sentinel-1 acquisitions (${orbit} orbit). ` +
          `Detected ${geojson.features.length} candidate anomaly clusters. ` +
          `Results are heuristic backscatter outliers — not phase-deformation measurements.`,
    },
  });
}
