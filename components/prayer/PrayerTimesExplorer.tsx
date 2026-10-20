"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  MapPin,
  Navigation,
  Printer,
  RotateCcw,
  Search,
  Settings2,
  SlidersHorizontal,
} from "lucide-react";
import { DEFAULT_USER_LOCATION, EGYPT_GOVERNORATES } from "@/data/egypt-governorates";
import {
  calculateDailyPrayerSchedule,
  calculateMonthlyPrayerSchedules,
  calculateRangePrayerSchedules,
  CALCULATION_METHODS_META,
  DEFAULT_CALCULATION_SETTINGS,
  formatPrayerTime12Ar,
  MADHAB_OPTIONS_META,
  PRAYER_NAMES_AR,
} from "@/lib/prayer-times";
import { requestBrowserLocation } from "@/lib/location";
import {
  getSavedLocation,
  getSavedPrayerSettings,
  saveLocation,
  savePrayerSettings,
  STORAGE_CHANGE_EVENT,
} from "@/lib/storage/local-storage";
import {
  formatCountdown,
  getLocalDateKey,
  normalizeArabicText,
  toArabicDigits,
  cn,
} from "@/lib/utils";
import {
  CalculationMethodId,
  MadhabId,
  PrayerCalculationSettings,
  PrayerId,
  UserLocation,
} from "@/types";

const GREGORIAN_MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export function PrayerTimesExplorer() {
  const [mounted, setMounted] = useState(false);
  const [location, setLocation] = useState<UserLocation>(DEFAULT_USER_LOCATION);
  const [settings, setSettings] = useState<PrayerCalculationSettings>(DEFAULT_CALCULATION_SETTINGS);
  const [now, setNow] = useState<Date>(() => new Date());

  // View mode: day | week | month
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  // Governorate & City search
  const [govSearch, setGovSearch] = useState("");
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setLocation(getSavedLocation());
    setSettings(getSavedPrayerSettings());

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const v = params.get("view");
      if (v === "month" || v === "week" || v === "day") {
        setViewMode(v);
      }
    }

    const sync = () => {
      setLocation(getSavedLocation());
      setSettings(getSavedPrayerSettings());
    };
    window.addEventListener(STORAGE_CHANGE_EVENT, sync);

    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.removeEventListener(STORAGE_CHANGE_EVENT, sync);
      clearInterval(timer);
    };
  }, []);

  const currentGovernorate = useMemo(() => {
    return (
      EGYPT_GOVERNORATES.find((g) => g.id === location.governorateId) ||
      EGYPT_GOVERNORATES[0]
    );
  }, [location.governorateId]);

  const filteredGovernorates = useMemo(() => {
    const q = normalizeArabicText(govSearch);
    if (!q) return EGYPT_GOVERNORATES;
    return EGYPT_GOVERNORATES.filter(
      (g) =>
        normalizeArabicText(g.nameAr).includes(q) ||
        g.cities.some((c) => normalizeArabicText(c.nameAr).includes(q))
    );
  }, [govSearch]);

  const todaySchedule = useMemo(
    () =>
      calculateDailyPrayerSchedule(
        location.latitude,
        location.longitude,
        now,
        settings,
        now
      ),
    [location.latitude, location.longitude, now, settings]
  );

  const weeklySchedules = useMemo(
    () =>
      calculateRangePrayerSchedules(
        location.latitude,
        location.longitude,
        now,
        7,
        settings
      ),
    [location.latitude, location.longitude, now, settings]
  );

  const monthlySchedules = useMemo(
    () =>
      calculateMonthlyPrayerSchedules(
        location.latitude,
        location.longitude,
        selectedYear,
        selectedMonth,
        settings
      ),
    [location.latitude, location.longitude, selectedYear, selectedMonth, settings]
  );

  const countdown = formatCountdown(todaySchedule.nextPrayer.remainingSeconds);
  const todayKey = getLocalDateKey(now);

  const handleSelectGovernorate = (govId: string) => {
    const gov = EGYPT_GOVERNORATES.find((g) => g.id === govId);
    if (!gov) return;
    const city = gov.cities[0];
    const newLoc: UserLocation = {
      governorateId: gov.id,
      cityId: city.id,
      governorateNameAr: gov.nameAr,
      cityNameAr: city.nameAr,
      latitude: city.latitude,
      longitude: city.longitude,
      isCustomGps: false,
    };
    saveLocation(newLoc);
    setLocation(newLoc);
  };

  const handleSelectCity = (cityId: string) => {
    const city = currentGovernorate.cities.find((c) => c.id === cityId);
    if (!city) return;
    const newLoc: UserLocation = {
      governorateId: currentGovernorate.id,
      cityId: city.id,
      governorateNameAr: currentGovernorate.nameAr,
      cityNameAr: city.nameAr,
      latitude: city.latitude,
      longitude: city.longitude,
      isCustomGps: false,
    };
    saveLocation(newLoc);
    setLocation(newLoc);
  };

  const handleGpsDetect = async () => {
    setGpsLoading(true);
    setGpsError(null);
    const res = await requestBrowserLocation();
    setGpsLoading(false);
    if (res.success && res.location) {
      saveLocation(res.location);
      setLocation(res.location);
    } else {
      setGpsError(res.errorAr || "تعذر تحديد الموقع الجغرافي.");
    }
  };

  const updateCalculationSettings = (partial: Partial<PrayerCalculationSettings>) => {
    const next: PrayerCalculationSettings = {
      ...settings,
      ...partial,
      adjustments: {
        ...settings.adjustments,
        ...(partial.adjustments || {}),
      },
    };
    savePrayerSettings(next);
    setSettings(next);
  };

  const handleMonthChange = (delta: number) => {
    const nextDate = new Date(selectedYear, selectedMonth + delta, 1);
    setSelectedYear(nextDate.getFullYear());
    setSelectedMonth(nextDate.getMonth());
  };

  return (
    <div className="space-y-8">
      {/* Page Title & Quick Controls */}
      <div className="rounded-3xl border border-border bg-card p-4 shadow-soft sm:p-6 md:p-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary">
              <Clock className="h-3.5 w-3.5" />
              <span>مواقيت الصلاة في جميع محافظات مصر الـ ٢٧</span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold text-foreground sm:text-3xl">
              مواقيت الصلاة في محافظة {location.governorateNameAr} — {location.cityNameAr}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {mounted ? todaySchedule.hijriFormatted : ""} •{" "}
              {mounted ? todaySchedule.gregorianFormatted : ""} • الإحداثيات:{" "}
              <span dir="ltr">
                {location.latitude.toFixed(4)}° N, {location.longitude.toFixed(4)}° E
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleGpsDetect}
              disabled={gpsLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60 sm:text-sm"
            >
              <Navigation className="h-4 w-4" />
              <span>{gpsLoading ? "جارٍ التحديد..." : "تحديد موقعي الحالي"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSettingsPanel((prev) => !prev)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition sm:text-sm",
                showSettingsPanel
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground hover:border-primary/40"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>إعدادات طريقة الحساب والفروق</span>
            </button>
          </div>
        </div>

        {gpsError && (
          <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300">
            {gpsError}
          </div>
        )}

        {/* Governorate & City Selector Bar */}
        <div className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-border/80 bg-muted/30 p-4 lg:grid-cols-12">
          {/* Quick Search */}
          <div className="lg:col-span-4">
            <label
              htmlFor="gov-quick-search"
              className="mb-1.5 block text-xs font-bold text-foreground"
            >
              بحث سريع في المحافظات والمدن
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="gov-quick-search"
                type="text"
                value={govSearch}
                onChange={(e) => setGovSearch(e.target.value)}
                placeholder="ابحث: القاهرة، دمياط، المنصورة، أسوان..."
                className="w-full rounded-xl border border-border bg-card py-2 pl-3 pr-9 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Governorate Select */}
          <div className="lg:col-span-4">
            <label
              htmlFor="gov-select"
              className="mb-1.5 block text-xs font-bold text-foreground"
            >
              المحافظة ({filteredGovernorates.length} من ٢٧ محافظة)
            </label>
            <select
              id="gov-select"
              value={currentGovernorate.id}
              onChange={(e) => handleSelectGovernorate(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground focus:border-primary focus:outline-none"
            >
              {filteredGovernorates.map((gov) => (
                <option key={gov.id} value={gov.id}>
                  محافظة {gov.nameAr} ({gov.region})
                </option>
              ))}
            </select>
          </div>

          {/* City / Markaz Select */}
          <div className="lg:col-span-4">
            <label
              htmlFor="city-select"
              className="mb-1.5 block text-xs font-bold text-foreground"
            >
              المدينة أو المركز داخل {currentGovernorate.nameAr}
            </label>
            <select
              id="city-select"
              value={location.cityId}
              onChange={(e) => handleSelectCity(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground focus:border-primary focus:outline-none"
            >
              {currentGovernorate.cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.nameAr} ({city.latitude.toFixed(2)}°N, {city.longitude.toFixed(2)}°E)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* All 27 Governorates Quick Pills */}
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold text-muted-foreground">
            اختر المحافظة مباشرة:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filteredGovernorates.map((gov) => {
              const active = gov.id === currentGovernorate.id;
              return (
                <button
                  key={gov.id}
                  type="button"
                  onClick={() => handleSelectGovernorate(gov.id)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {gov.nameAr}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Collapsible Calculation Method, Madhab & Manual Offsets Panel */}
      {showSettingsPanel && (
        <section
          aria-label="إعدادات حساب مواقيت الصلاة"
          className="rounded-3xl border border-primary/30 bg-card p-6 shadow-soft"
        >
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">
                إعدادات طريقة الحساب والمذهب والفروق الزمنية اليدوية
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                savePrayerSettings(DEFAULT_CALCULATION_SETTINGS);
                setSettings(DEFAULT_CALCULATION_SETTINGS);
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>استعادة الإعداد المصري الافتراضي</span>
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Calculation Method */}
            <div>
              <label
                htmlFor="calc-method-select"
                className="mb-2 block text-sm font-bold text-foreground"
              >
                ١. هيئة وطريقة الحساب الفلكي
              </label>
              <select
                id="calc-method-select"
                value={settings.method}
                onChange={(e) =>
                  updateCalculationSettings({
                    method: e.target.value as CalculationMethodId,
                  })
                }
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-semibold text-foreground"
              >
                {CALCULATION_METHODS_META.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nameAr} (الفجر: {m.fajrAngle}° | العشاء: {m.ishaAngle})
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {
                  CALCULATION_METHODS_META.find((m) => m.id === settings.method)
                    ?.descriptionAr
                }
              </p>
            </div>

            {/* Asr Madhab */}
            <div>
              <label className="mb-2 block text-sm font-bold text-foreground">
                ٢. المذهب الفقهي لحساب وقت صلاة العصر
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {MADHAB_OPTIONS_META.map((m) => {
                  const active = settings.madhab === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => updateCalculationSettings({ madhab: m.id as MadhabId })}
                      className={cn(
                        "rounded-xl border p-3 text-right transition-all",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground hover:bg-muted"
                      )}
                    >
                      <div className="text-xs font-bold">{m.nameAr}</div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {m.descriptionAr}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Manual Minute Offsets */}
          <div className="mt-6 border-t border-border pt-5">
            <h3 className="text-sm font-bold text-foreground">
              ٣. فروق زمنية يدوية بالدقائق (تقديم أو تأخير احتياطي لكل صلاة)
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              أضف أو أنقص دقائق (-٣٠ إلى +٣٠ دقيقة) لمطابقة تقويم المسجد المحلي عند الحاجة:
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {(["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as PrayerId[]).map(
                (pId) => (
                  <div
                    key={pId}
                    className="rounded-2xl border border-border bg-background p-3 text-center"
                  >
                    <label
                      htmlFor={`offset-${pId}`}
                      className="block text-xs font-bold text-foreground"
                    >
                      {PRAYER_NAMES_AR[pId]}
                    </label>
                    <div className="mt-2 flex items-center justify-center gap-1.5">
                      <input
                        id={`offset-${pId}`}
                        type="number"
                        min={-30}
                        max={30}
                        value={settings.adjustments[pId]}
                        onChange={(e) =>
                          updateCalculationSettings({
                            adjustments: {
                              ...settings.adjustments,
                              [pId]: Math.max(
                                -30,
                                Math.min(30, parseInt(e.target.value || "0", 10))
                              ),
                            },
                          })
                        }
                        className="w-16 rounded-lg border border-border bg-card px-2 py-1 text-center text-sm font-bold text-foreground"
                      />
                      <span className="text-xs text-muted-foreground">دقيقة</span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </section>
      )}

      {/* View Switcher Tabs: Day | Week | Month */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <div
          role="tablist"
          aria-label="طريقة عرض مواقيت الصلاة"
          className="grid w-full grid-cols-3 gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-sm sm:inline-flex sm:w-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "day"}
            onClick={() => setViewMode("day")}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2 py-2 text-xs font-bold transition-all sm:gap-2 sm:px-4 sm:text-sm",
              viewMode === "day"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="sm:hidden">اليوم</span>
            <span className="hidden sm:inline">مواقيت اليوم</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "week"}
            onClick={() => setViewMode("week")}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2 py-2 text-xs font-bold transition-all sm:gap-2 sm:px-4 sm:text-sm",
              viewMode === "week"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarRange className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="sm:hidden">الأسبوع</span>
            <span className="hidden sm:inline">مواقيت الأسبوع (٧ أيام)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "month"}
            onClick={() => setViewMode("month")}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2 py-2 text-xs font-bold transition-all sm:gap-2 sm:px-4 sm:text-sm",
              viewMode === "month"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="sm:hidden">الشهر</span>
            <span className="hidden sm:inline">جدول الشهر كاملًا</span>
          </button>
        </div>

        {viewMode === "month" && (
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleMonthChange(-1)}
                aria-label="الشهر السابق"
                className="rounded-xl border border-border bg-card p-2 text-foreground hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="min-w-[125px] text-center text-xs font-bold text-foreground sm:min-w-[140px] sm:text-sm">
                {GREGORIAN_MONTHS_AR[selectedMonth]} {toArabicDigits(selectedYear)} م
              </span>
              <button
                type="button"
                onClick={() => handleMonthChange(1)}
                aria-label="الشهر التالي"
                className="rounded-xl border border-border bg-card p-2 text-foreground hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => typeof window !== "undefined" && window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground hover:bg-muted"
            >
              <Printer className="h-4 w-4 text-primary" />
              <span>طباعة</span>
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: Daily View */}
      {viewMode === "day" && (
        <div className="space-y-6">
          {/* Next Prayer Summary Banner */}
          <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-primary/25 bg-primary/5 p-6 sm:flex-row">
            <div>
              <span className="text-xs font-bold text-primary">
                الصلاة القادمة في {location.cityNameAr}
              </span>
              <h2 className="mt-1 text-2xl font-extrabold text-foreground">
                صلاة {todaySchedule.nextPrayer.nameAr} —{" "}
                {mounted ? formatPrayerTime12Ar(todaySchedule.nextPrayer.time) : "--:--"}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                منتصف الليل: {mounted ? formatPrayerTime12Ar(todaySchedule.middleOfTheNight) : "--:--"} • الثلث الأخير من الليل:{" "}
                {mounted ? formatPrayerTime12Ar(todaySchedule.lastThirdOfTheNight) : "--:--"}
              </p>
            </div>
            <div className="rounded-2xl border border-gold/40 bg-card px-5 py-3 text-center shadow-sm">
              <span className="text-xs text-muted-foreground">الوقت المتبقي</span>
              <div className="mt-1 font-mono text-2xl font-extrabold text-primary" dir="ltr">
                {mounted ? countdown.formatted : "00:00:00"}
              </div>
            </div>
          </div>

          {/* 6 Detailed Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {todaySchedule.entries.map((entry) => {
              const isNext = entry.status === "next";
              return (
                <div
                  key={entry.id}
                  className={cn(
                    "flex items-center justify-between rounded-3xl border p-5 transition-all",
                    isNext
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : !entry.isObligatory
                      ? "border-gold/30 bg-gold-muted/40 text-foreground"
                      : "border-border bg-card text-foreground shadow-soft"
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-extrabold">{entry.nameAr}</h3>
                      {isNext && (
                        <span className="rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-bold text-emerald-950">
                          الصلاة القادمة
                        </span>
                      )}
                      {!entry.isObligatory && (
                        <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-[11px] font-bold text-gold">
                          شروق الشمس
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        isNext ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}
                    >
                      {entry.isObligatory ? "صلاة مفروضة" : "ينتهي به وقت صلاة الفجر"}
                    </p>
                  </div>

                  <div className="text-left">
                    <div className="text-2xl font-extrabold">
                      {mounted ? entry.formattedTime12 : "--:--"}
                    </div>
                    <div
                      className={cn(
                        "text-xs",
                        isNext ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}
                      dir="ltr"
                    >
                      {mounted ? entry.formattedTime24 : "--:--"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2 & 3: Weekly / Monthly Timetable — Mobile App Cards (No Horizontal Scroll) + Desktop Table */}
      {(viewMode === "week" || viewMode === "month") && (
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
          <div className="border-b border-border bg-muted/40 px-4 py-3.5 sm:px-6 sm:py-4">
            <h2 className="text-sm font-bold text-foreground sm:text-lg">
              {viewMode === "week"
                ? `مواقيت الصلاة لمدة ٧ أيام في ${location.cityNameAr} (${location.governorateNameAr})`
                : `إمساكية وجدول مواقيت الصلاة لشهر ${GREGORIAN_MONTHS_AR[selectedMonth]} ${toArabicDigits(selectedYear)} م — ${location.cityNameAr}`}
            </h2>
          </div>

          {/* Mobile App Day-by-Day Cards (Zero Horizontal Scroll) */}
          <div className="divide-y divide-border/70 md:hidden">
            {(viewMode === "week" ? weeklySchedules : monthlySchedules).map(
              (daySched) => {
                const isToday = daySched.dateKey === todayKey;
                return (
                  <div
                    key={daySched.dateKey}
                    className={cn(
                      "p-3.5 transition-colors",
                      isToday ? "bg-primary/10" : "bg-card"
                    )}
                  >
                    <div className="mb-2.5 flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-foreground">
                          {daySched.gregorianFormatted}
                        </span>
                        {isToday && (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                            اليوم
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-primary">
                        {daySched.hijriFormatted}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {daySched.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className={cn(
                            "flex flex-col items-center justify-center rounded-xl border px-2 py-1.5 text-center",
                            !entry.isObligatory
                              ? "border-gold/30 bg-gold-muted/30"
                              : isToday
                              ? "border-primary/25 bg-card"
                              : "border-border/70 bg-background/70"
                          )}
                        >
                          <span
                            className={cn(
                              "text-[10px] font-bold",
                              !entry.isObligatory ? "text-gold" : "text-muted-foreground"
                            )}
                          >
                            {entry.nameAr}
                          </span>
                          <span
                            className={cn(
                              "mt-0.5 text-xs font-extrabold",
                              !entry.isObligatory ? "text-gold" : "text-foreground"
                            )}
                          >
                            {entry.formattedTime12}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
            )}
          </div>

          {/* Desktop & Tablet Full Table */}
          <div className="hidden md:block">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-xs font-bold text-muted-foreground">
                  <th className="px-4 py-3.5">التاريخ الميلادي</th>
                  <th className="px-4 py-3.5">التاريخ الهجري</th>
                  <th className="px-4 py-3.5 text-primary">الفجر</th>
                  <th className="px-4 py-3.5 text-gold">الشروق</th>
                  <th className="px-4 py-3.5 text-primary">الظهر</th>
                  <th className="px-4 py-3.5 text-primary">العصر</th>
                  <th className="px-4 py-3.5 text-primary">المغرب</th>
                  <th className="px-4 py-3.5 text-primary">العشاء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {(viewMode === "week" ? weeklySchedules : monthlySchedules).map(
                  (daySched) => {
                    const isToday = daySched.dateKey === todayKey;
                    return (
                      <tr
                        key={daySched.dateKey}
                        className={cn(
                          "transition-colors hover:bg-muted/40",
                          isToday && "bg-primary/10 font-bold"
                        )}
                      >
                        <td className="px-4 py-3 text-foreground">
                          <div className="flex items-center gap-2">
                            <span>{daySched.gregorianFormatted}</span>
                            {isToday && (
                              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                                اليوم
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {daySched.hijriFormatted}
                        </td>
                        {daySched.entries.map((entry) => (
                          <td
                            key={entry.id}
                            className={cn(
                              "px-4 py-3 font-semibold",
                              !entry.isObligatory ? "text-gold" : "text-foreground"
                            )}
                          >
                            {entry.formattedTime12}
                          </td>
                        ))}
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Documentation of Calculation Source */}
      <div className="flex items-start gap-3 rounded-3xl border border-border bg-muted/30 p-5 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <strong className="text-foreground">توثيق طريقة الحساب ومصدر البيانات: </strong>
          تُحسب مواقيت الصلاة فلكيًا بصورة لحظية بناءً على خط العرض وخط الطول الدقيق للمدينة أو المركز المختار داخل المحافظة، وفق معايير{" "}
          <strong>الهيئة المصرية العامة للمساحة</strong> (زاوية الفجر 19.5° تحت الأفق الشرقي، وزاوية العشاء 17.5° تحت الأفق الغربي، ومذهب الجمهور الشافعي والمالكي والحنبلي للعصر)، مع الضبط التلقائي للمنطقة الزمنية لجمهورية مصر العربية (<code>Africa/Cairo</code>) شاملة التوقيت الصيفي والشتوي.
        </div>
      </div>
    </div>
  );
}
