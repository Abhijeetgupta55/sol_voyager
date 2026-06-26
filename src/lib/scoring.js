/**
 * Pure scoring and classification functions for SAR backscatter anomaly detection.
 * Isolated from Next.js API plumbing so they can be unit-tested independently.
 *
 * IMPORTANT: All thresholds are heuristic and uncalibrated against a ground-truth
 * sinkhole/subsidence dataset. Outputs are screening candidates, not validated risk calls.
 */

/**
 * Classify anomaly risk from a heuristic confidence score (0–100).
 * Thresholds chosen to spread the distribution; not calibrated to real-world events.
 *
 * @param {number} confidence - Weighted confidence score 0–100
 * @returns {"very_high"|"moderate"|"low"}
 */
export function classifyRisk(confidence) {
  if (confidence > 65) return "very_high";
  if (confidence > 35) return "moderate";
  return "low";
}

/**
 * Extract a scalar property from a GEE reduced feature, preferring the `_mean`
 * suffix that reduceToVectors produces, falling back to the bare key, then 0.
 *
 * @param {Object} props
 * @param {string} key  - Base key name (e.g. "bci")
 * @returns {number}
 */
export function extractProp(props, key) {
  const v = props[`${key}_mean`] ?? props[key];
  return v != null ? Number(v) : 0;
}

/**
 * Convert raw GEE anomaly feature array into a display-ready GeoJSON FeatureCollection.
 *
 * @param {Array|null} anomalies - Array of GEE Feature objects
 * @returns {GeoJSON.FeatureCollection}
 */
export function buildGeoJSON(anomalies) {
  if (!anomalies?.length) return { type: "FeatureCollection", features: [] };

  return {
    type: "FeatureCollection",
    features: anomalies.map((f) => {
      const props = f.properties || {};
      const bci = extractProp(props, "bci");
      const isi = extractProp(props, "isi");
      const persistence = extractProp(props, "persistence");
      const confidence = extractProp(props, "confidence");

      return {
        type: "Feature",
        properties: {
          risk: classifyRisk(confidence),
          bci: Number(bci).toFixed(3),
          isi: Number(isi).toFixed(3),
          persistence: Math.round(persistence),
          confidence: Math.round(confidence),
        },
        geometry: f.geometry,
      };
    }),
  };
}

/**
 * Count GeoJSON features by risk level.
 *
 * @param {GeoJSON.Feature[]} features
 * @returns {Record<string, number>}
 */
export function countByRisk(features) {
  return features.reduce((acc, f) => {
    const r = f.properties?.risk ?? "low";
    acc[r] = (acc[r] ?? 0) + 1;
    return acc;
  }, {});
}
