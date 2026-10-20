import { Coordinates, Qibla } from "adhan";
import { QiblaInfo } from "@/types";

export const KAABA_COORDINATES = {
  latitude: 21.422487,
  longitude: 39.826206,
};

/**
 * Calculates Qibla bearing in degrees from True North (0° - 360°)
 * and Great-Circle distance to the Holy Kaaba in kilometers.
 */
export function calculateQiblaInfo(latitude: number, longitude: number): QiblaInfo {
  const coords = new Coordinates(latitude, longitude);
  const rawBearing = Qibla(coords);
  const bearingDegrees = Number(((rawBearing + 360) % 360).toFixed(1));
  const distanceKm = Math.round(calculateDistanceKm(latitude, longitude, KAABA_COORDINATES.latitude, KAABA_COORDINATES.longitude));
  const cardinalDirectionAr = getCardinalDirectionAr(bearingDegrees);

  return {
    bearingDegrees,
    distanceKm,
    cardinalDirectionAr,
    kaabaCoordinates: KAABA_COORDINATES,
  };
}

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371.0088; // Mean Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getCardinalDirectionAr(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return "الشمال (N)";
  if (normalized >= 22.5 && normalized < 67.5) return "الشمال الشرقي (NE)";
  if (normalized >= 67.5 && normalized < 112.5) return "الشرق (E)";
  if (normalized >= 112.5 && normalized < 157.5) return "الجنوب الشرقي (SE)";
  if (normalized >= 157.5 && normalized < 202.5) return "الجنوب (S)";
  if (normalized >= 202.5 && normalized < 247.5) return "الجنوب الغربي (SW)";
  if (normalized >= 247.5 && normalized < 292.5) return "الغرب (W)";
  return "الشمال الغربي (NW)";
}

/**
 * Computes shortest angular difference (-180° to +180°) between current device heading and Qibla bearing.
 */
export function getShortestAngleDifference(currentHeading: number, targetBearing: number): number {
  const diff = ((targetBearing - currentHeading + 540) % 360) - 180;
  return Number(diff.toFixed(1));
}
