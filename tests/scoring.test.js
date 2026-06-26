import { classifyRisk, extractProp, buildGeoJSON, countByRisk } from "@/lib/scoring";

// ── classifyRisk ─────────────────────────────────────────────────────────────
describe("classifyRisk", () => {
  test("returns very_high for confidence > 65", () => {
    expect(classifyRisk(66)).toBe("very_high");
    expect(classifyRisk(100)).toBe("very_high");
    expect(classifyRisk(65.1)).toBe("very_high");
  });

  test("returns moderate for confidence in (35, 65]", () => {
    expect(classifyRisk(36)).toBe("moderate");
    expect(classifyRisk(65)).toBe("moderate");
    expect(classifyRisk(50)).toBe("moderate");
  });

  test("returns low for confidence <= 35", () => {
    expect(classifyRisk(0)).toBe("low");
    expect(classifyRisk(35)).toBe("low");
    expect(classifyRisk(1)).toBe("low");
  });

  test("boundary: exactly 65 is moderate not very_high", () => {
    expect(classifyRisk(65)).toBe("moderate");
  });

  test("boundary: exactly 35 is low not moderate", () => {
    expect(classifyRisk(35)).toBe("low");
  });
});

// ── extractProp ──────────────────────────────────────────────────────────────
describe("extractProp", () => {
  test("prefers _mean suffix (GEE reduceToVectors output) over bare key", () => {
    expect(extractProp({ bci_mean: 1.5, bci: 2.0 }, "bci")).toBe(1.5);
  });

  test("falls back to bare key when _mean absent", () => {
    expect(extractProp({ bci: 2.0 }, "bci")).toBe(2.0);
  });

  test("returns 0 when both keys absent", () => {
    expect(extractProp({}, "bci")).toBe(0);
    expect(extractProp({}, "isi")).toBe(0);
  });

  test("coerces string values to numbers", () => {
    expect(extractProp({ bci_mean: "1.23" }, "bci")).toBe(1.23);
  });
});

// ── buildGeoJSON ─────────────────────────────────────────────────────────────
describe("buildGeoJSON", () => {
  const mockAnomalies = [
    {
      properties: { bci_mean: 2.1, isi_mean: 4.5, persistence_mean: 3, confidence_mean: 72 },
      geometry: { type: "Point", coordinates: [77.2, 28.6] },
    },
    {
      properties: { bci: 0.8, isi: 1.2, persistence: 1, confidence: 40 },
      geometry: { type: "Point", coordinates: [77.3, 28.7] },
    },
    {
      properties: { bci: 0.1, isi: 0.5, persistence: 1, confidence: 10 },
      geometry: { type: "Point", coordinates: [77.1, 28.5] },
    },
  ];

  test("returns a GeoJSON FeatureCollection", () => {
    const result = buildGeoJSON(mockAnomalies);
    expect(result.type).toBe("FeatureCollection");
    expect(Array.isArray(result.features)).toBe(true);
  });

  test("feature count matches input", () => {
    expect(buildGeoJSON(mockAnomalies).features).toHaveLength(3);
  });

  test("classifies risk correctly for all three bands", () => {
    const features = buildGeoJSON(mockAnomalies).features;
    expect(features[0].properties.risk).toBe("very_high");   // conf 72
    expect(features[1].properties.risk).toBe("moderate");    // conf 40
    expect(features[2].properties.risk).toBe("low");         // conf 10
  });

  test("confidence is rounded to integer", () => {
    const features = buildGeoJSON(mockAnomalies).features;
    expect(features[0].properties.confidence).toBe(72);
  });

  test("bci and isi are 3-decimal strings", () => {
    const f = buildGeoJSON(mockAnomalies).features[0];
    expect(f.properties.bci).toMatch(/^\d+\.\d{3}$/);
    expect(f.properties.isi).toMatch(/^\d+\.\d{3}$/);
  });

  test("persistence is rounded to integer", () => {
    expect(buildGeoJSON(mockAnomalies).features[0].properties.persistence).toBe(3);
  });

  test("passes geometry through unchanged", () => {
    const f = buildGeoJSON(mockAnomalies).features[0];
    expect(f.geometry.coordinates).toEqual([77.2, 28.6]);
  });

  test("returns empty FeatureCollection for null input", () => {
    const result = buildGeoJSON(null);
    expect(result.type).toBe("FeatureCollection");
    expect(result.features).toHaveLength(0);
  });

  test("returns empty FeatureCollection for empty array", () => {
    expect(buildGeoJSON([]).features).toHaveLength(0);
  });
});

// ── countByRisk ──────────────────────────────────────────────────────────────
describe("countByRisk", () => {
  test("counts all three risk levels correctly", () => {
    const features = [
      { properties: { risk: "very_high" } },
      { properties: { risk: "very_high" } },
      { properties: { risk: "moderate" } },
      { properties: { risk: "low" } },
    ];
    const counts = countByRisk(features);
    expect(counts.very_high).toBe(2);
    expect(counts.moderate).toBe(1);
    expect(counts.low).toBe(1);
  });

  test("returns empty object for empty array", () => {
    expect(countByRisk([])).toEqual({});
  });

  test("defaults to low for missing risk property", () => {
    const counts = countByRisk([{ properties: {} }]);
    expect(counts.low).toBe(1);
  });

  test("handles all same risk level", () => {
    const features = Array(5).fill({ properties: { risk: "very_high" } });
    expect(countByRisk(features).very_high).toBe(5);
    expect(countByRisk(features).moderate).toBeUndefined();
  });
});
