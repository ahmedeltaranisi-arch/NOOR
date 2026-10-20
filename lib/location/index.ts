import { findNearestEgyptianCity } from "@/data/egypt-governorates";
import { UserLocation } from "@/types";

export interface GeolocationResult {
  success: boolean;
  location?: UserLocation;
  errorAr?: string;
}

export function requestBrowserLocation(timeoutMs = 10000): Promise<GeolocationResult> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      resolve({
        success: false,
        errorAr: "المتصفح الحالي لا يدعم خاصية تحديد الموقع الجغرافي. يمكنك اختيار محافظتك ومدينتك يدويًا.",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const resolvedLocation = findNearestEgyptianCity(latitude, longitude);
        resolve({
          success: true,
          location: resolvedLocation,
        });
      },
      (error) => {
        let errorAr =
          "تعذر تحديد موقعك الحالي تلقائيًا. يمكنك اختيار المحافظة والمدينة يدويًا بكل سهولة.";
        if (error.code === error.PERMISSION_DENIED) {
          errorAr =
            "تم رفض إذن الوصول إلى الموقع الجغرافي. يمكنك تفعيل الإذن من إعدادات المتصفح أو اختيار المحافظة والمدينة يدويًا.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorAr =
            "بيانات الموقع الجغرافي غير متاحة حاليًا على جهازك. يرجى اختيار المحافظة والمدينة يدويًا.";
        } else if (error.code === error.TIMEOUT) {
          errorAr =
            "انتهت مهلة انتظار تحديد الموقع الجغرافي. يرجى المحاولة مرة أخرى أو اختيار المحافظة يدويًا.";
        }
        resolve({
          success: false,
          errorAr,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 60000,
      }
    );
  });
}
