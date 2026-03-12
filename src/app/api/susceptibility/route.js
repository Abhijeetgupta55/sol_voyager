import { NextResponse } from "next/server";

const CITY_COORDS = {
  karapinar: [37.675, 33.554],
  konya: [37.874, 32.493],
  ankara: [39.933, 32.859],
  istanbul: [41.008, 28.978],
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const city = (searchParams.get("city") || "").toLowerCase();
  const center = CITY_COORDS[city] || [37.675, 33.554];

  const geojson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { risk: "very_high" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [center[1] - 0.032, center[0] - 0.032],
              [center[1] + 0.034, center[0] - 0.034],
              [center[1] + 0.034, center[0] + 0.034],
              [center[1] - 0.032, center[0] + 0.032],
              [center[1] - 0.039, center[0] - 0.039],
            ],
          ],
        },
      },
      {
        type: "Feature",
        properties: { risk: "moderate" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [center[1] - 0.065, center[0] - 0.065],
              [center[1] - 0.035, center[0] - 0.075],
              [center[1] - 0.035, center[0] - 0.035],
              [center[1] - 0.075, center[0] - 0.035],
              [center[1] - 0.075, center[0] - 0.075],
            ],
          ],
        },
      },
    ],
  };

  const factors = {
    geology:
      city === "karapinar"
        ? "Karstic Limestone - Susceptible"
        : "Mixed Sedimentary",
    deformation:
      city === "karapinar"
        ? "25 mm/year Subsidence - HIGH RISK"
        : "5 mm/year - MODERATE",
    groundwater:
      city === "karapinar"
        ? "Rapid Decline - HIGH RISK"
        : "Stable - LOW RISK",
  };

  return NextResponse.json({
    geojson,
    center,
    factors,
  });
}
