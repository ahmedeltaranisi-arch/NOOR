import rawGovernorates from "./egypt-governorates-full.json";
import {
  CityLocation,
  Governorate,
  UserLocation,
  VillageLocation,
} from "@/types";

export const EGYPT_GOVERNORATES: Governorate[] =
  rawGovernorates as Governorate[];

export const TOTAL_EGYPT_GOVERNORATES_COUNT = EGYPT_GOVERNORATES.length;
export const TOTAL_EGYPT_MARKAZES_COUNT = EGYPT_GOVERNORATES.reduce(
  (sum, g) => sum + g.cities.length,
  0
);
export const TOTAL_EGYPT_VILLAGES_COUNT = EGYPT_GOVERNORATES.reduce(
  (sum, g) =>
    sum +
    g.cities.reduce((cSum, c) => cSum + (c.villages?.length || 0), 0),
  0
);

export const DEFAULT_USER_LOCATION: UserLocation = {
  governorateId: "cairo",
  cityId: "cairo-center",
  governorateNameAr: "القاهرة",
  cityNameAr: "وسط البلد - القاهرة",
  latitude: 30.0444,
  longitude: 31.2357,
  isCustomGps: false,
};

export function getGovernorateById(govId: string): Governorate | undefined {
  return EGYPT_GOVERNORATES.find((g) => g.id === govId);
}

export function getCityByIds(
  govId: string,
  cityId: string
): { governorate: Governorate; city: CityLocation } | undefined {
  const governorate = getGovernorateById(govId);
  if (!governorate) return undefined;
  const city =
    governorate.cities.find((c) => c.id === cityId) || governorate.cities[0];
  return { governorate, city };
}

export function getVillageByIds(
  govId: string,
  cityId: string,
  villageId?: string
): {
  governorate: Governorate;
  city: CityLocation;
  village?: VillageLocation;
} | undefined {
  const found = getCityByIds(govId, cityId);
  if (!found) return undefined;
  const village = villageId
    ? found.city.villages?.find((v) => v.id === villageId)
    : undefined;
  return { ...found, village };
}

/**
 * Finds the closest Egyptian governorate, markaz/city, and village to arbitrary GPS coordinates
 * using Haversine distance.
 */
export function findNearestEgyptianCity(
  latitude: number,
  longitude: number
): UserLocation {
  let minDistance = Infinity;
  let nearestGov = EGYPT_GOVERNORATES[0];
  let nearestCity = nearestGov.cities[0];
  let nearestVillage: VillageLocation | undefined = undefined;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c;
  };

  for (const gov of EGYPT_GOVERNORATES) {
    for (const city of gov.cities) {
      const cityDist = haversine(latitude, longitude, city.latitude, city.longitude);
      if (cityDist < minDistance) {
        minDistance = cityDist;
        nearestGov = gov;
        nearestCity = city;
        nearestVillage = undefined;
      }

      if (city.villages && city.villages.length > 1) {
        for (const v of city.villages) {
          const vDist = haversine(latitude, longitude, v.latitude, v.longitude);
          if (vDist + 0.25 < minDistance) {
            minDistance = vDist;
            nearestGov = gov;
            nearestCity = city;
            nearestVillage = v;
          }
        }
      }
    }
  }

  const displayCityName =
    nearestVillage && nearestVillage.nameAr !== nearestCity.nameAr
      ? `${nearestCity.nameAr} — ${nearestVillage.nameAr}`
      : nearestCity.nameAr;

  return {
    governorateId: nearestGov.id,
    cityId: nearestCity.id,
    villageId: nearestVillage?.id,
    governorateNameAr: nearestGov.nameAr,
    cityNameAr: displayCityName,
    villageNameAr: nearestVillage?.nameAr,
    latitude,
    longitude,
    isCustomGps: true,
    updatedAt: new Date().toISOString(),
  };
}
