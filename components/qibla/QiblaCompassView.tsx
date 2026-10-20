"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  ExternalLink,
  Info,
  MapPin,
  Navigation,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import { DEFAULT_USER_LOCATION } from "@/data/egypt-governorates";
import { calculateQiblaInfo, getShortestAngleDifference } from "@/lib/qibla";
import { requestBrowserLocation } from "@/lib/location";
import {
  getSavedLocation,
  saveLocation,
  STORAGE_CHANGE_EVENT,
} from "@/lib/storage/local-storage";
import { LocationSelectorModal } from "@/components/prayer/LocationSelectorModal";
import { toArabicDigits, cn } from "@/lib/utils";
import { UserLocation } from "@/types";

interface ExtendedDeviceOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}

interface DeviceOrientationConstructor {
  requestPermission?: () => Promise<"granted" | "denied">;
}

export function QiblaCompassView() {
  const [location, setLocation] = useState<UserLocation>(DEFAULT_USER_LOCATION);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [manualHeading, setManualHeading] = useState<number>(0);
  const [sensorStatus, setSensorStatus] = useState<
    "idle" | "active" | "unsupported" | "permission-denied"
  >("idle");
  const [needsCalibration, setNeedsCalibration] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    setLocation(getSavedLocation());
    const sync = () => setLocation(getSavedLocation());
    window.addEventListener(STORAGE_CHANGE_EVENT, sync);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, sync);
  }, []);

  const qibla = calculateQiblaInfo(location.latitude, location.longitude);
  const effectiveHeading = deviceHeading !== null ? deviceHeading : manualHeading;
  const angleDiff = getShortestAngleDifference(effectiveHeading, qibla.bearingDegrees);
  const isAligned = Math.abs(angleDiff) <= 6;

  useEffect(() => {
    if (sensorStatus !== "active") return;

    const handleOrientation = (event: Event) => {
      const e = event as ExtendedDeviceOrientationEvent;
      let heading: number | null = null;

      if (typeof e.webkitCompassHeading === "number") {
        heading = e.webkitCompassHeading;
        if (typeof e.webkitCompassAccuracy === "number" && e.webkitCompassAccuracy > 25) {
          setNeedsCalibration(true);
        }
      } else if (typeof e.alpha === "number") {
        heading = (360 - e.alpha) % 360;
      }

      if (heading !== null && !Number.isNaN(heading)) {
        setDeviceHeading(Math.round(heading));
      }
    };

    const handleCalibration = (e: Event) => {
      e.preventDefault();
      setNeedsCalibration(true);
    };

    window.addEventListener("deviceorientationabsolute", handleOrientation, true);
    window.addEventListener("deviceorientation", handleOrientation, true);
    window.addEventListener("compassneedscalibration", handleCalibration, true);

    return () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation, true);
      window.removeEventListener("deviceorientation", handleOrientation, true);
      window.removeEventListener("compassneedscalibration", handleCalibration, true);
    };
  }, [sensorStatus]);

  const startCompassSensor = async () => {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setSensorStatus("unsupported");
      return;
    }

    const OrientationCtor =
      window.DeviceOrientationEvent as unknown as DeviceOrientationConstructor;

    if (typeof OrientationCtor.requestPermission === "function") {
      try {
        const perm = await OrientationCtor.requestPermission();
        if (perm === "granted") {
          setSensorStatus("active");
        } else {
          setSensorStatus("permission-denied");
        }
      } catch {
        setSensorStatus("permission-denied");
      }
    } else {
      setSensorStatus("active");
    }
  };

  const handleGpsDetect = async () => {
    setGpsBusy(true);
    setGpsError(null);
    const res = await requestBrowserLocation();
    setGpsBusy(false);

    if (res.success && res.location) {
      saveLocation(res.location);
      setLocation(res.location);
    } else {
      setGpsError(res.errorAr || "تعذر تحديد الموقع الجغرافي.");
    }
  };

  // Bounding box for OpenStreetMap embed around selected city
  const bbox = `${(location.longitude - 0.025).toFixed(4)}%2C${(
    location.latitude - 0.02
  ).toFixed(4)}%2C${(location.longitude + 0.025).toFixed(4)}%2C${(
    location.latitude + 0.02
  ).toFixed(4)}`;

  const googleMapsMosquesUrl = `https://www.google.com/maps/search/${encodeURIComponent(
    `مسجد بالقرب من ${location.cityNameAr} ${location.governorateNameAr}`
  )}/@${location.latitude},${location.longitude},15z`;

  const osmDirectUrl = `https://www.openstreetmap.org/#map=15/${location.latitude}/${location.longitude}`;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-border bg-card p-6 shadow-soft md:flex-row md:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <Compass className="h-3.5 w-3.5" />
            <span>بوصلة القبلة الفلكية وأقرب المساجد</span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-foreground sm:text-3xl">
            اتجاه القبلة في {location.governorateNameAr} ({location.cityNameAr})
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            محسوب فلكيًا بالمعادلة الكروية الدقيقة نحو الكعبة المشرفة بمكة المكرمة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsLocationModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-bold text-foreground transition hover:border-primary"
          >
            <MapPin className="h-4 w-4 text-primary" />
            <span>تغيير المحافظة / المدينة</span>
          </button>
          <button
            type="button"
            onClick={handleGpsDetect}
            disabled={gpsBusy}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            <Navigation className="h-4 w-4" />
            <span>{gpsBusy ? "جارٍ التحديد..." : "تحديد موقعي (GPS)"}</span>
          </button>
        </div>
      </div>

      {gpsError && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
          {gpsError}
        </div>
      )}

      {/* Main Compass & Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Interactive Compass Dial */}
        <div className="flex flex-col items-center justify-between rounded-3xl border border-border bg-card p-4 shadow-soft sm:p-6 md:p-8 lg:col-span-7">
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold sm:px-3.5",
                isAligned
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isAligned ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>الجهاز متجه نحو القبلة بدقة</span>
                </>
              ) : (
                <>
                  <Compass className="h-4 w-4 text-primary" />
                  <span>
                    {angleDiff > 0
                      ? `أدر بمقدار ${toArabicDigits(Math.abs(angleDiff))}° لليمين`
                      : `أدر بمقدار ${toArabicDigits(Math.abs(angleDiff))}° لليسار`}
                  </span>
                </>
              )}
            </span>

            <button
              type="button"
              onClick={startCompassSensor}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground sm:px-3.5"
            >
              <Smartphone className="h-4 w-4 shrink-0" />
              <span>
                {sensorStatus === "active" && deviceHeading !== null
                  ? "مستشعر البوصلة نشط"
                  : "تفعيل مستشعر بوصلة الهاتف"}
              </span>
            </button>
          </div>

          {/* Large SVG Compass — Responsive down to 320px */}
          <div className="relative my-6 flex h-60 w-60 items-center justify-center min-[380px]:h-64 min-[380px]:w-64 sm:my-8 sm:h-80 sm:w-80">
            {/* Outer Alignment Halo */}
            <div
              className={cn(
                "absolute inset-0 rounded-full transition-all duration-500",
                isAligned
                  ? "bg-emerald-500/15 ring-4 ring-emerald-500/50"
                  : "bg-primary/5 ring-1 ring-border"
              )}
            />

            {/* Top Fixed Device Direction Indicator */}
            <div className="absolute -top-4 z-20 flex flex-col items-center">
              <div
                className={cn(
                  "h-0 w-0 border-x-8 border-b-[14px] border-x-transparent",
                  isAligned ? "border-b-emerald-600" : "border-b-gold"
                )}
              />
            </div>

            {/* Rotating Compass Plate */}
            <div
              className="relative flex h-52 w-52 items-center justify-center rounded-full border-2 border-border bg-background shadow-inner transition-transform duration-300 min-[380px]:h-56 min-[380px]:w-56 sm:h-72 sm:w-72"
              style={{ transform: `rotate(${-effectiveHeading}deg)` }}
            >
              {/* Cardinal Directions */}
              <div className="absolute top-2.5 flex flex-col items-center sm:top-3">
                <span className="text-xs font-extrabold text-primary sm:text-sm">شمال</span>
                <span className="text-[9px] font-bold text-muted-foreground sm:text-[10px]">0° N</span>
              </div>
              <div className="absolute bottom-2.5 flex flex-col items-center sm:bottom-3">
                <span className="text-[9px] font-bold text-muted-foreground sm:text-[10px]">180° S</span>
                <span className="text-[11px] font-bold text-foreground sm:text-xs">جنوب</span>
              </div>
              <div className="absolute right-2.5 flex flex-col items-center sm:right-3">
                <span className="text-[11px] font-bold text-foreground sm:text-xs">شرق</span>
                <span className="text-[9px] font-bold text-muted-foreground sm:text-[10px]">90° E</span>
              </div>
              <div className="absolute left-2.5 flex flex-col items-center sm:left-3">
                <span className="text-[11px] font-bold text-foreground sm:text-xs">غرب</span>
                <span className="text-[9px] font-bold text-muted-foreground sm:text-[10px]">270° W</span>
              </div>

              {/* Inner Degree Circle */}
              <div className="h-36 w-36 rounded-full border border-dashed border-border/80 min-[380px]:h-40 min-[380px]:w-40 sm:h-52 sm:w-52" />

              {/* Qibla Vector Arrow inside Compass Plate */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ transform: `rotate(${qibla.bearingDegrees}deg)` }}
              >
                <div className="flex h-44 flex-col items-center justify-start min-[380px]:h-48 sm:h-60">
                  <div
                    className={cn(
                      "flex h-9 w-9 -translate-y-1 items-center justify-center rounded-2xl text-sm shadow-lg ring-2 transition-all sm:h-10 sm:w-10 sm:text-base",
                      isAligned
                        ? "bg-emerald-600 text-white ring-emerald-300 scale-110"
                        : "bg-emerald-950 text-gold ring-gold"
                    )}
                    title="اتجاه الكعبة المشرفة"
                  >
                    🕋
                  </div>
                  <div className="h-16 w-1.5 rounded-full bg-gradient-to-b from-gold via-primary to-transparent sm:h-20" />
                </div>
              </div>

              {/* Center Pivot */}
              <div className="z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 border-border bg-card text-[11px] font-extrabold text-foreground shadow sm:h-12 sm:w-12 sm:text-xs">
                {toArabicDigits(Math.round(qibla.bearingDegrees))}°
              </div>
            </div>
          </div>

          {/* Manual Rotation / Fallback Control */}
          <div className="w-full rounded-2xl border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground">
                {deviceHeading !== null
                  ? `اتجاه الهاتف الحالي: ${toArabicDigits(deviceHeading)}°`
                  : `تدوير البوصلة يدويًا (الشمال عند ${toArabicDigits(manualHeading)}°)`}
              </span>
              {manualHeading !== 0 && deviceHeading === null && (
                <button
                  type="button"
                  onClick={() => setManualHeading(0)}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>إعادة للشمال (0°)</span>
                </button>
              )}
            </div>
            {deviceHeading === null && (
              <>
                <input
                  type="range"
                  min={0}
                  max={359}
                  value={manualHeading}
                  onChange={(e) => setManualHeading(Number(e.target.value))}
                  aria-label="محاكاة اتجاه البوصلة يدويًا"
                  className="mt-2.5 w-full accent-primary"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  عند عدم توفر مستشعرات البوصلة (مثل الحاسوب)، وجّه أعلى الشاشة نحو الشمال الجغرافي أو حرّك المؤشر لمحاكاة اتجاه القبلة ({toArabicDigits(qibla.bearingDegrees)}°).
                </p>
              </>
            )}
          </div>
        </div>

        {/* Details, Calibration Notice & Geographic Guide */}
        <div className="flex flex-col justify-between gap-4 lg:col-span-5">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <span className="text-xs font-semibold text-muted-foreground">
                زاوية انحراف القبلة عن الشمال الحقيقي
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-primary">
                  {toArabicDigits(qibla.bearingDegrees)}°
                </span>
                <span className="text-sm font-semibold text-gold">
                  باتجاه {qibla.cardinalDirectionAr}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                تقع الكعبة المشرفة في اتجاه الجنوب الشرقي بالنسبة لمعظم محافظات جمهورية مصر العربية.
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <span className="text-xs font-semibold text-muted-foreground">
                المسافة الجوية التقريبية إلى الكعبة المشرفة
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-foreground">
                  {toArabicDigits(qibla.distanceKm.toLocaleString("ar-EG"))}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">كيلومتر</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground" dir="ltr">
                Makkah: 21.4225° N, 39.8262° E | {location.cityNameAr}:{" "}
                {location.latitude.toFixed(3)}° N, {location.longitude.toFixed(3)}° E
              </p>
            </div>
          </div>

          {/* Calibration & Sensor Warning Box */}
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="text-xs leading-relaxed text-amber-950 dark:text-amber-200">
                <h3 className="text-sm font-bold">
                  {needsCalibration
                    ? "تنبيه: البوصلة تحتاج إلى معايرة الآن"
                    : "إرشادات دقة البوصلة ومعايرة المستشعر"}
                </h3>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>
                    لمعايرة بوصلة الهاتف: حرّك هاتفك في الهواء على شكل رقم <strong>(8)</strong> عدة مرات.
                  </li>
                  <li>
                    ضع الهاتف في وضع أفقي مستوٍ بعيدًا عن الأغطية المغناطيسية أو المعادن أو الأجهزة الكهربائية.
                  </li>
                  <li>
                    في حال عدم دعم متصفحك للمستشعرات، اعتمد على الزاوية الجغرافية المحسوبة ({toArabicDigits(qibla.bearingDegrees)}° من الشمال).
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sensor Status Feedback */}
          {sensorStatus === "unsupported" && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                جهازك أو متصفحك الحالي لا يوفر مستشعر بوصلة مغناطيسي مباشر. تم تفعيل الوضع الجغرافي المحسوب بدقة ({toArabicDigits(qibla.bearingDegrees)}°).
              </span>
            </div>
          )}

          {sensorStatus === "permission-denied" && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-800 dark:text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                تم رفض إذن الوصول إلى مستشعر الحركة والاتجاه في المتصفح. يمكنك استخدام البوصلة الجغرافية المحسوبة أعلاه.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Nearby Mosques Section */}
      <section
        id="nearby-mosques"
        className="scroll-mt-20 rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8"
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <MapPin className="h-3.5 w-3.5" />
              <span>خدمة خرائط المساجد القريبة</span>
            </div>
            <h2 className="mt-2 text-xl font-extrabold text-foreground sm:text-2xl">
              أقرب المساجد في {location.cityNameAr} ({location.governorateNameAr})
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              استعرض خريطة منطقتك أو افتح البحث المباشر عن المساجد القريبة والاتجاهات إليها
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={googleMapsMosquesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:text-sm"
            >
              <span>عرض المساجد القريبة على خرائط Google</span>
              <ExternalLink className="h-4 w-4" />
            </a>
            <a
              href={osmDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-xs font-bold text-foreground transition hover:bg-secondary/80 sm:text-sm"
            >
              <span>خريطة OpenStreetMap</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-muted/40">
          <iframe
            title={`خريطة موقع ${location.cityNameAr}`}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`}
            className="h-80 w-full border-0"
            loading="lazy"
          />
        </div>
      </section>

      <LocationSelectorModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={location}
        onSelectLocation={(loc) => {
          saveLocation(loc);
          setLocation(loc);
        }}
      />
    </div>
  );
}
