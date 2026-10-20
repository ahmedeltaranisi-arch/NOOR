"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  Clock,
  MapPin,
  MoonStar,
  Navigation,
  Play,
  Settings2,
  Square,
  Sunrise,
  Sparkles,
  Volume2,
} from "lucide-react";
import { DEFAULT_USER_LOCATION } from "@/data/egypt-governorates";
import {
  calculateDailyPrayerSchedule,
  CALCULATION_METHODS_META,
  DEFAULT_CALCULATION_SETTINGS,
  formatPrayerTime12Ar,
} from "@/lib/prayer-times";
import {
  ADHAN_AUDIO_STATE_EVENT,
  getActiveAudioState,
  getSavedLocation,
  getSavedPrayerNotifications,
  getSavedPrayerSettings,
  playApproachingPrayerAlert,
  playFullAdhanAudio,
  saveLocation,
  stopFullAdhanAudio,
  STORAGE_CHANGE_EVENT,
} from "@/lib/storage/local-storage";
import { requestBrowserLocation } from "@/lib/location";
import { formatCountdown, toArabicDigits, cn } from "@/lib/utils";
import { DailyPrayerSchedule, PrayerCalculationSettings, UserLocation } from "@/types";
import { LocationSelectorModal } from "./LocationSelectorModal";

export function HeroPrayerCard() {
  const [mounted, setMounted] = useState(false);
  const [location, setLocation] = useState<UserLocation>(DEFAULT_USER_LOCATION);
  const [settings, setSettings] = useState<PrayerCalculationSettings>(DEFAULT_CALCULATION_SETTINGS);
  const [now, setNow] = useState<Date>(() => new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);
  const [isAdhanPlaying, setIsAdhanPlaying] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLocation(getSavedLocation());
    setSettings(getSavedPrayerSettings());
    setNow(new Date());

    const syncFromStorage = () => {
      setLocation(getSavedLocation());
      setSettings(getSavedPrayerSettings());
    };

    const syncAudioState = () => {
      setIsAdhanPlaying(getActiveAudioState().playing);
    };

    window.addEventListener(STORAGE_CHANGE_EVENT, syncFromStorage);
    window.addEventListener(ADHAN_AUDIO_STATE_EVENT, syncAudioState);
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.removeEventListener(STORAGE_CHANGE_EVENT, syncFromStorage);
      window.removeEventListener(ADHAN_AUDIO_STATE_EVENT, syncAudioState);
      clearInterval(interval);
    };
  }, []);

  const schedule: DailyPrayerSchedule = calculateDailyPrayerSchedule(
    location.latitude,
    location.longitude,
    now,
    settings,
    now
  );

  const countdown = formatCountdown(schedule.nextPrayer.remainingSeconds);
  const methodMeta =
    CALCULATION_METHODS_META.find((m) => m.id === settings.method) ||
    CALCULATION_METHODS_META[0];

  const handleQuickGps = async () => {
    setGpsBusy(true);
    setGpsNotice(null);
    const res = await requestBrowserLocation();
    setGpsBusy(false);

    if (res.success && res.location) {
      saveLocation(res.location);
      setLocation(res.location);
      setGpsNotice(`تم تحديث الموقع إلى: ${res.location.governorateNameAr} - ${res.location.cityNameAr}`);
      setTimeout(() => setGpsNotice(null), 5000);
    } else {
      setGpsNotice(res.errorAr || "تعذر تحديد الموقع الجغرافي تلقائيًا.");
    }
  };

  return (
    <>
      <section
        aria-label="بطاقة مواقيت الصلاة الرئيسية"
        className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-bl from-primary via-emerald-900 to-emerald-950 p-6 text-primary-foreground shadow-soft sm:p-8"
      >
        {/* Subtle Ornamental Geometric Circles */}
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-gold/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

        {/* Top Bar: Location & Dates */}
        <div className="relative z-10 flex flex-col justify-between gap-4 border-b border-white/10 pb-5 md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              <MapPin className="h-4 w-4 text-gold" />
              <span>
                محافظة {location.governorateNameAr} • {location.cityNameAr}
              </span>
              <span className="mr-1 rounded-lg bg-white/15 px-2 py-0.5 text-[11px] font-normal">
                تغيير
              </span>
            </button>

            <button
              type="button"
              onClick={handleQuickGps}
              disabled={gpsBusy}
              title="تحديد الموقع الحالي عبر GPS"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-emerald-100 transition hover:bg-white/15 disabled:opacity-50"
            >
              <Navigation className="h-3.5 w-3.5 text-gold" />
              <span>{gpsBusy ? "جارٍ التحديد..." : "موقعي الحالي"}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
            <div className="inline-flex items-center gap-2 rounded-xl bg-black/20 px-3.5 py-1.5 font-semibold text-gold">
              <Sparkles className="h-4 w-4" />
              <span>{mounted ? schedule.hijriFormatted : "التقويم الهجري"}</span>
            </div>
            <div className="text-emerald-100/90">
              {mounted ? schedule.gregorianFormatted : "التوقيت المحلي لجمهورية مصر العربية"}
            </div>
          </div>
        </div>

        {gpsNotice && (
          <div className="relative z-10 mt-3 rounded-xl border border-gold/40 bg-black/30 px-4 py-2 text-xs text-emerald-50">
            {gpsNotice}
          </div>
        )}

        {/* Middle Hero: Next Prayer & Live Countdown */}
        <div className="relative z-10 my-6 grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/15 px-3.5 py-1 text-xs font-bold text-gold">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {schedule.nextPrayer.isTomorrowFajr
                  ? "الصلاة القادمة (فجر الغد)"
                  : "الصلاة المفروضة القادمة"}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-baseline gap-4">
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                صلاة {schedule.nextPrayer.nameAr}
              </h1>
              <span className="text-lg font-semibold text-emerald-200 sm:text-2xl">
                {mounted ? formatPrayerTime12Ar(schedule.nextPrayer.time) : "--:--"}
              </span>
            </div>

            <p className="mt-2 text-xs text-emerald-100/80 sm:text-sm">
              طريقة الحساب: {methodMeta.nameAr} • مذهب العصر:{" "}
              {settings.madhab === "Hanafi" ? "الحنفي" : "الجمهور (الشافعي)"}
            </p>

            {/* Progress bar towards next prayer */}
            <div className="mt-4 max-w-md">
              <div className="mb-1.5 flex justify-between text-xs text-emerald-100/90">
                <span>الوقت المنقضي من الفترة الحالية</span>
                <span>{mounted ? `${toArabicDigits(schedule.nextPrayer.progressPercent)}٪` : "٠٪"}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-gold to-emerald-300 transition-all duration-500"
                  style={{ width: `${mounted ? schedule.nextPrayer.progressPercent : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Countdown Box */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/15 bg-black/25 p-5 backdrop-blur-md lg:col-span-5">
            <span className="text-xs font-semibold text-emerald-200">
              الوقت المتبقي على أذان {schedule.nextPrayer.nameAr}
            </span>

            <div
              className="mt-3 flex items-center gap-2 sm:gap-3"
              dir="ltr"
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="flex min-w-[68px] flex-col items-center rounded-xl bg-white/10 px-3 py-2.5">
                <span className="font-mono text-2xl font-extrabold text-white sm:text-3xl">
                  {mounted ? countdown.hours : "00"}
                </span>
                <span className="mt-0.5 text-[11px] text-emerald-200">ساعة</span>
              </div>
              <span className="text-2xl font-bold text-gold">:</span>
              <div className="flex min-w-[68px] flex-col items-center rounded-xl bg-white/10 px-3 py-2.5">
                <span className="font-mono text-2xl font-extrabold text-white sm:text-3xl">
                  {mounted ? countdown.minutes : "00"}
                </span>
                <span className="mt-0.5 text-[11px] text-emerald-200">دقيقة</span>
              </div>
              <span className="text-2xl font-bold text-gold">:</span>
              <div className="flex min-w-[68px] flex-col items-center rounded-xl bg-gold/20 px-3 py-2.5 ring-1 ring-gold/40">
                <span className="font-mono text-2xl font-extrabold text-gold sm:text-3xl">
                  {mounted ? countdown.seconds : "00"}
                </span>
                <span className="mt-0.5 text-[11px] text-gold">ثانية</span>
              </div>
            </div>

            {/* Quick Audio Controls: Adhan & Spoken Pre-Prayer Alert */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (isAdhanPlaying) {
                    stopFullAdhanAudio();
                    setIsAdhanPlaying(false);
                    return;
                  }
                  const notif = getSavedPrayerNotifications();
                  setIsAdhanPlaying(true);
                  await playFullAdhanAudio(
                    notif.selectedAdhanSound || "abdulbasit",
                    schedule.nextPrayer.nameAr,
                    () => setIsAdhanPlaying(false)
                  );
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition",
                  isAdhanPlaying
                    ? "bg-red-600 text-white shadow-sm"
                    : "border border-gold/40 bg-gold/20 text-gold hover:bg-gold hover:text-emerald-950"
                )}
              >
                {isAdhanPlaying ? (
                  <>
                    <Square className="h-3 w-3 fill-current" />
                    <span>إيقاف الأذان</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 fill-current" />
                    <span>استماع للأذان</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  playApproachingPrayerAlert(
                    schedule.nextPrayer.nameAr,
                    Math.max(
                      1,
                      Math.round(schedule.nextPrayer.remainingSeconds / 60)
                    ),
                    "approaching-voice"
                  )
                }
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-100 transition hover:bg-white/20"
              >
                <Volume2 className="h-3.5 w-3.5 text-gold" />
                <span>تنبيه: اقتربت صلاة {schedule.nextPrayer.nameAr}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Prayer Times 6-Card Grid (5 Obligatory + Distinct Sunrise) */}
        <div className="relative z-10 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {schedule.entries.map((entry) => {
            const isNext = entry.status === "next";
            const isSunrise = !entry.isObligatory;

            return (
              <div
                key={entry.id}
                className={cn(
                  "relative flex flex-col justify-between rounded-2xl border p-3.5 transition-all",
                  isNext
                    ? "border-gold bg-white text-emerald-950 shadow-gold ring-2 ring-gold/60"
                    : isSunrise
                    ? "border-amber-300/25 bg-amber-500/10 text-amber-100"
                    : entry.status === "passed"
                    ? "border-white/10 bg-white/5 text-emerald-100/75"
                    : "border-white/15 bg-white/10 text-white"
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      "text-sm font-bold",
                      isNext ? "text-emerald-950" : isSunrise ? "text-amber-200" : "text-white"
                    )}
                  >
                    {entry.nameAr}
                  </span>

                  {isNext && (
                    <span className="rounded-full bg-emerald-800 px-2 py-0.5 text-[10px] font-bold text-gold">
                      القادمة
                    </span>
                  )}
                  {isSunrise && !isNext && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                      <Sunrise className="h-3 w-3" />
                      <span>شروق</span>
                    </span>
                  )}
                  {!isNext && !isSunrise && entry.status === "passed" && (
                    <span className="text-[10px] text-emerald-200/70">مضت</span>
                  )}
                </div>

                <div className="mt-3">
                  <div
                    className={cn(
                      "text-xl font-extrabold tracking-tight sm:text-2xl",
                      isNext ? "text-primary" : "text-white"
                    )}
                  >
                    {mounted ? entry.formattedTime12 : "--:--"}
                  </div>
                  <div
                    className={cn(
                      "mt-0.5 text-[11px]",
                      isNext ? "text-emerald-800/80" : "text-emerald-100/70"
                    )}
                  >
                    {entry.isObligatory ? "صلاة مفروضة" : "وقت الشروق (غير مفروضة)"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Sunnah Times & Action Links */}
        <div className="relative z-10 mt-5 flex flex-col justify-between gap-3 border-t border-white/10 pt-4 text-xs sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-4 text-emerald-100/90">
            <span className="inline-flex items-center gap-1.5">
              <MoonStar className="h-4 w-4 text-gold" />
              <span>منتصف الليل الشرعي:</span>
              <strong className="text-white">
                {mounted ? formatPrayerTime12Ar(schedule.middleOfTheNight) : "--:--"}
              </strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-gold" />
              <span>الثلث الأخير من الليل (وقت السحر):</span>
              <strong className="text-gold">
                {mounted ? formatPrayerTime12Ar(schedule.lastThirdOfTheNight) : "--:--"}
              </strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/prayer-times?view=month"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 font-semibold text-white transition hover:bg-white/25"
            >
              <CalendarDays className="h-4 w-4 text-gold" />
              <span>جدول مواقيت الشهر كاملًا</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-transparent px-3 py-2 font-medium text-emerald-100 transition hover:bg-white/10"
            >
              <Bell className="h-3.5 w-3.5 text-gold" />
              <span>التنبيهات وطريقة الحساب</span>
              <Settings2 className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <LocationSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentLocation={location}
        onSelectLocation={(loc) => {
          saveLocation(loc);
          setLocation(loc);
        }}
      />
    </>
  );
}
