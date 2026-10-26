"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Calculator,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Copy,
  Flame,
  Heart,
  Layers,
  MapPin,
  Moon,
  Share2,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
} from "lucide-react";
import {
  DEFAULT_USER_LOCATION,
  EGYPT_GOVERNORATES,
  getGovernorateById,
} from "@/data/egypt-governorates";
import { QURAN_JUZ_META } from "@/lib/quran/juz";
import {
  generateRamadanImsakiyah,
  getTodayFastingStatus,
  RAMADAN_DAILY_DEEDS_META,
  RAMADAN_ESSENTIAL_DUAS,
  RAMADAN_THIRTY_DAILY_DUAS,
} from "@/lib/ramadan";
import {
  getSavedLocation,
  getSavedPrayerSettings,
  saveLocation,
  STORAGE_CHANGE_EVENT,
} from "@/lib/storage/local-storage";
import { cn, formatCountdown, toArabicDigits } from "@/lib/utils";
import { PrayerCalculationSettings, UserLocation } from "@/types";

const RAMADAN_STORAGE_KEY = "noor_ramadan_progress_v1";

interface RamadanProgressState {
  khatmahGoal: 1 | 2 | 3;
  completedJuzDays: number[]; // 1..30
  dailyDeedsByDay: Record<string, string[]>; // day "1".."30" -> deed ids
}

const DEFAULT_RAMADAN_PROGRESS: RamadanProgressState = {
  khatmahGoal: 1,
  completedJuzDays: [],
  dailyDeedsByDay: {},
};

export function RamadanHubClient({
  initialTab = "imsakiyah",
}: {
  initialTab?: "imsakiyah" | "khatmah" | "duas" | "tracker";
}) {
  const [activeTab, setActiveTab] = useState<
    "imsakiyah" | "khatmah" | "duas" | "tracker"
  >(initialTab);

  const [location, setLocation] = useState<UserLocation>(DEFAULT_USER_LOCATION);
  const [calcSettings, setCalcSettings] = useState<PrayerCalculationSettings>(
    getSavedPrayerSettings()
  );
  const [now, setNow] = useState<Date>(() => new Date());

  // Imsakiyah Filter
  const [ashraFilter, setAshraFilter] = useState<
    "all" | "first" | "second" | "last" | "odd"
  >("all");

  // Progress State (Khatmah + 30-day Deeds)
  const [progress, setProgress] = useState<RamadanProgressState>(
    DEFAULT_RAMADAN_PROGRESS
  );
  const [selectedTrackerDay, setSelectedTrackerDay] = useState<number>(1);

  // Zakat Al-Fitr & Fidyah Calculator State
  const [familyCount, setFamilyCount] = useState<number>(4);
  const [zakatPerPersonEgp, setZakatPerPersonEgp] = useState<number>(35);
  const [fidyahDaysCount, setFidyahDaysCount] = useState<number>(0);
  const [fidyahPerDayEgp, setFidyahPerDayEgp] = useState<number>(30);

  // Copy & Toast State
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    setLocation(getSavedLocation());
    setCalcSettings(getSavedPrayerSettings());

    try {
      const raw = localStorage.getItem(RAMADAN_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<RamadanProgressState>;
        setProgress({
          khatmahGoal: parsed.khatmahGoal || 1,
          completedJuzDays: Array.isArray(parsed.completedJuzDays)
            ? parsed.completedJuzDays
            : [],
          dailyDeedsByDay: parsed.dailyDeedsByDay || {},
        });
      }
    } catch {
      // ignore
    }

    const handleStorage = () => {
      setLocation(getSavedLocation());
      setCalcSettings(getSavedPrayerSettings());
    };
    window.addEventListener(STORAGE_CHANGE_EVENT, handleStorage);
    return () =>
      window.removeEventListener(STORAGE_CHANGE_EVENT, handleStorage);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const updateProgress = (next: RamadanProgressState) => {
    setProgress(next);
    try {
      localStorage.setItem(RAMADAN_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2800);
  };

  const { status: ramadanStatus, days: imsakiyahDays } = useMemo(
    () =>
      generateRamadanImsakiyah(
        location.latitude,
        location.longitude,
        calcSettings,
        now
      ),
    [location.latitude, location.longitude, calcSettings, now]
  );

  const todayFasting = useMemo(
    () =>
      getTodayFastingStatus(
        location.latitude,
        location.longitude,
        calcSettings,
        now
      ),
    [location.latitude, location.longitude, calcSettings, now]
  );

  const countdownParts = formatCountdown(todayFasting.remainingSeconds);

  const filteredImsakiyahDays = useMemo(() => {
    if (ashraFilter === "all") return imsakiyahDays;
    if (ashraFilter === "odd") {
      return imsakiyahDays.filter((d) => d.isOddLastTen);
    }
    return imsakiyahDays.filter((d) => d.ashraType === ashraFilter);
  }, [imsakiyahDays, ashraFilter]);

  const handleGovernorateChange = (govId: string) => {
    const gov = getGovernorateById(govId);
    if (!gov || gov.cities.length === 0) return;
    const city = gov.cities[0];
    const nextLoc: UserLocation = {
      governorateId: gov.id,
      governorateNameAr: gov.nameAr,
      cityId: city.id,
      cityNameAr: city.nameAr,
      latitude: city.latitude,
      longitude: city.longitude,
      isCustomGps: false,
    };
    setLocation(nextLoc);
    saveLocation(nextLoc);
  };

  const handleCityChange = (cityId: string) => {
    const gov = getGovernorateById(location.governorateId);
    if (!gov) return;
    const city = gov.cities.find((c) => c.id === cityId);
    if (!city) return;
    const nextLoc: UserLocation = {
      governorateId: gov.id,
      governorateNameAr: gov.nameAr,
      cityId: city.id,
      villageId: undefined,
      cityNameAr: city.nameAr,
      villageNameAr: undefined,
      latitude: city.latitude,
      longitude: city.longitude,
      isCustomGps: false,
    };
    setLocation(nextLoc);
    saveLocation(nextLoc);
  };

  const handleVillageChange = (villageId: string) => {
    const gov = getGovernorateById(location.governorateId);
    if (!gov) return;
    const city = gov.cities.find((c) => c.id === location.cityId) || gov.cities[0];
    if (!city) return;
    if (!villageId || villageId === "all") {
      handleCityChange(city.id);
      return;
    }
    const village = city.villages?.find((v) => v.id === villageId);
    if (!village) return;
    const nextLoc: UserLocation = {
      governorateId: gov.id,
      governorateNameAr: gov.nameAr,
      cityId: city.id,
      villageId: village.id,
      cityNameAr:
        village.nameAr === city.nameAr
          ? city.nameAr
          : `${city.nameAr} — ${village.nameAr}`,
      villageNameAr: village.nameAr,
      latitude: village.latitude,
      longitude: village.longitude,
      isCustomGps: false,
    };
    setLocation(nextLoc);
    saveLocation(nextLoc);
  };

  const toggleKhatmahDay = (dayNum: number) => {
    const exists = progress.completedJuzDays.includes(dayNum);
    const nextDays = exists
      ? progress.completedJuzDays.filter((d) => d !== dayNum)
      : [...progress.completedJuzDays, dayNum].sort((a, b) => a - b);
    updateProgress({
      ...progress,
      completedJuzDays: nextDays,
    });
    showToast(
      exists
        ? `تم إلغاء تحديد ورد اليوم ${toArabicDigits(dayNum)}`
        : `تقبل الله! تم إتمام ورد اليوم ${toArabicDigits(dayNum)} من ختمة رمضان`
    );
  };

  const toggleDailyDeed = (dayNum: number, deedId: string) => {
    const key = String(dayNum);
    const currentList = progress.dailyDeedsByDay[key] || [];
    const exists = currentList.includes(deedId);
    const nextList = exists
      ? currentList.filter((id) => id !== deedId)
      : [...currentList, deedId];
    updateProgress({
      ...progress,
      dailyDeedsByDay: {
        ...progress.dailyDeedsByDay,
        [key]: nextList,
      },
    });
  };

  const handleCopyText = async (id: string, title: string, text: string) => {
    try {
      await navigator.clipboard.writeText(`${title}\n${text}`);
      setCopiedId(id);
      showToast("تم نسخ الدعاء بنجاح");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleShareText = async (id: string, title: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: `${title}\n\n${text}` });
        return;
      } catch {
        // fallback to copy
      }
    }
    await handleCopyText(id, title, text);
  };

  const currentGov =
    getGovernorateById(location.governorateId) || EGYPT_GOVERNORATES[0];
  const currentCity =
    currentGov.cities.find((c) => c.id === location.cityId) ||
    currentGov.cities[0];

  const khatmahPercent = Math.round(
    (progress.completedJuzDays.length / 30) * 100
  );

  const selectedDayDeeds =
    progress.dailyDeedsByDay[String(selectedTrackerDay)] || [];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          role="status"
          className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-gold/40 bg-emerald-950 px-4 py-3 text-center text-xs font-bold text-white shadow-gold md:bottom-8"
        >
          {toastMsg}
        </div>
      )}

      {/* Hero Ramadan Banner + Live Fasting/Iftar Timer */}
      <div className="relative overflow-hidden rounded-3xl border border-gold/35 bg-gradient-to-l from-emerald-950 via-emerald-900 to-emerald-950 p-5 text-white shadow-soft sm:p-8">
        <div className="relative z-10 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
          {/* Right Column: Ramadan Identity & Countdown */}
          <div className="space-y-3 lg:col-span-7">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-gold/30 bg-white/10 px-3.5 py-1 text-xs font-extrabold text-gold">
              <Moon className="h-3.5 w-3.5" />
              <span>
                واحة شهر رمضان المبارك {toArabicDigits(ramadanStatus.targetHijriYear)}{" "}
                هـ
              </span>
              <span>•</span>
              <span>
                {location.governorateNameAr} — {location.cityNameAr}
              </span>
            </div>

            <h1 className="font-sans text-2xl font-extrabold leading-relaxed text-white sm:text-4xl">
              شهر رمضان المبارك — الإمساكية والختمة والأدعية
            </h1>

            <p className="max-w-2xl text-xs leading-relaxed text-emerald-100/90 sm:text-sm">
              ﴿شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ هُدًى لِّلنَّاسِ وَبَيِّنَاتٍ
              مِّنَ الْهُدَىٰ وَالْفُرْقَانِ﴾ — إمساكية شهر رمضان الكاملة لجميع محافظات مصر
              الـ ٢٧ وفق الهيئة المصرية العامة للمساحة، مع جدول ختمة القرآن الكريم (٣٠
              جزءًا)، وأدعية الإفطار والسحور وليلة القدر، وجدول الطاعات اليومي.
            </p>

            {/* Countdown to Ramadan OR Active Ramadan Day Badge */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {ramadanStatus.isRamadanNow ? (
                <div className="inline-flex items-center gap-2 rounded-2xl border border-gold/40 bg-gold/20 px-4 py-2.5 text-sm font-extrabold text-gold">
                  <Sparkles className="h-4 w-4" />
                  <span>
                    اليوم {toArabicDigits(ramadanStatus.currentRamadanDay || 1)} من شهر
                    رمضان المبارك {toArabicDigits(ramadanStatus.targetHijriYear)} هـ
                  </span>
                </div>
              ) : (
                <div className="inline-flex flex-wrap items-center gap-2.5 rounded-2xl border border-gold/40 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
                  <span className="text-xs font-bold text-emerald-100">
                    المتبقي على غرة شهر رمضان{" "}
                    {toArabicDigits(ramadanStatus.targetHijriYear)} هـ فلكيًا:
                  </span>
                  <span className="rounded-xl bg-gold px-3 py-1 text-sm font-extrabold text-emerald-950">
                    {toArabicDigits(ramadanStatus.daysUntilRamadan)} يومًا
                  </span>
                  <span className="text-[11px] font-medium text-emerald-200">
                    (الموافق فلكيًا: {ramadanStatus.ramadanStartGregorianAr})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Left Column: Today's Live Suhoor / Imsak / Fajr / Maghrib (Iftar) Card */}
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md sm:p-5 lg:col-span-5">
            <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-3">
              <span className="text-xs font-extrabold text-gold">
                مواقيت الصيام والإفطار اليوم في {location.cityNameAr}
              </span>
              <span className="rounded-lg bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-100">
                مدة الصيام: {todayFasting.fastingDurationAr}
              </span>
            </div>

            <div className="mt-3 text-center">
              <p className="text-xs font-bold text-emerald-100">
                {todayFasting.targetEventLabelAr}
              </p>
              <div
                className="mt-1.5 font-mono text-2xl font-extrabold tracking-wider text-white sm:text-3xl"
                dir="ltr"
              >
                {toArabicDigits(countdownParts.hours)}:
                {toArabicDigits(countdownParts.minutes)}:
                {toArabicDigits(countdownParts.seconds)}
              </div>

              {todayFasting.phase === "fasting_day" && (
                <div className="mt-2.5">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-gold transition-all duration-500"
                      style={{ width: `${todayFasting.progressPercent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-emerald-100">
                    مضى {toArabicDigits(todayFasting.progressPercent)}٪ من نهار الصيام
                  </p>
                </div>
              )}
            </div>

            <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-2 text-center">
                <p className="text-[10px] text-emerald-200">السحور</p>
                <p className="mt-0.5 text-xs font-extrabold text-white">
                  {todayFasting.suhoorFormatted12}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-2 text-center">
                <p className="text-[10px] text-emerald-200">الإمساك</p>
                <p className="mt-0.5 text-xs font-extrabold text-gold">
                  {todayFasting.imsakFormatted12}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-2 text-center">
                <p className="text-[10px] text-emerald-200">أذان الفجر</p>
                <p className="mt-0.5 text-xs font-extrabold text-white">
                  {todayFasting.fajrFormatted12}
                </p>
              </div>
              <div className="rounded-xl border border-gold/40 bg-gold/20 p-2 text-center">
                <p className="text-[10px] font-bold text-gold">أذان المغرب</p>
                <p className="mt-0.5 text-xs font-extrabold text-white">
                  {todayFasting.maghribFormatted12}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main 4 Navigation Tabs */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-soft sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setActiveTab("imsakiyah")}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-extrabold transition sm:text-sm",
            activeTab === "imsakiyah"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <Calendar className="h-4 w-4 shrink-0" />
          <span>إمساكية رمضان (٣٠ يومًا)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("khatmah")}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-extrabold transition sm:text-sm",
            activeTab === "khatmah"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          <span>ختمة رمضان (٣٠ جزءًا)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("duas")}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-extrabold transition sm:text-sm",
            activeTab === "duas"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <Heart className="h-4 w-4 shrink-0" />
          <span>أدعية رمضان وليلة القدر</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tracker")}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-extrabold transition sm:text-sm",
            activeTab === "tracker"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>جدول الطاعات وزكاة الفطر</span>
        </button>
      </div>

      {/* TAB 1: RAMADAN 30-DAY IMSAKIYAH FOR ALL 27 EGYPTIAN GOVERNORATES */}
      {activeTab === "imsakiyah" && (
        <div className="space-y-5">
          {/* Governorate/City Selector + Ashra Filters */}
          <div className="rounded-3xl border border-border bg-card p-4 shadow-soft sm:p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <h2 className="text-base font-extrabold text-foreground sm:text-xl">
                  إمساكية شهر رمضان المبارك{" "}
                  {toArabicDigits(ramadanStatus.targetHijriYear)} هـ — محافظة{" "}
                  {location.governorateNameAr} ({location.cityNameAr})
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  مواقيت السحور والإمساك والفجر والمغرب والعشاء والتراويح محسوبة فلكيًا
                  وفق الهيئة المصرية العامة للمساحة.
                </p>
              </div>

              {/* Governorate, Markaz & Village Dropdowns */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                    المحافظة (٢٧ محافظة):
                  </label>
                  <select
                    aria-label="اختيار المحافظة لإمساكية رمضان"
                    value={location.governorateId}
                    onChange={(e) => handleGovernorateChange(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-extrabold text-foreground focus:border-primary focus:outline-none"
                  >
                    {EGYPT_GOVERNORATES.map((gov) => (
                      <option key={gov.id} value={gov.id}>
                        {gov.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                    المركز / المدينة ({toArabicDigits(currentGov.cities.length)}):
                  </label>
                  <select
                    aria-label="اختيار المدينة لإمساكية رمضان"
                    value={location.cityId}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-extrabold text-foreground focus:border-primary focus:outline-none"
                  >
                    {currentGov.cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                    القرية / المنطقة ({toArabicDigits(currentCity?.villages?.length || 0)}):
                  </label>
                  <select
                    aria-label="اختيار القرية لإمساكية رمضان"
                    value={location.villageId || "all"}
                    onChange={(e) => handleVillageChange(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-extrabold text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="all">
                      المركز الرئيسي ({currentCity?.nameAr})
                    </option>
                    {(currentCity?.villages || []).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Ashra Filter Pills */}
            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-4">
              {[
                { id: "all" as const, label: "جميع أيام الشهر (٣٠ يومًا)" },
                { id: "first" as const, label: "العشر الأوائل (الرحمة ١-١٠)" },
                { id: "second" as const, label: "العشر الأوسط (المغفرة ١١-٢٠)" },
                {
                  id: "last" as const,
                  label: "العشر الأواخر (العتق من النار ٢١-٣٠)",
                },
                {
                  id: "odd" as const,
                  label: "ليالي الوتر في العشر الأواخر (تحري ليلة القدر)",
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAshraFilter(tab.id)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-extrabold transition",
                    ashraFilter === tab.id
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-muted/30 text-foreground hover:border-primary/40"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Responsive Imsakiyah Cards / Table */}
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
            {/* Desktop Table View */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-right text-xs">
                <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-3.5 py-3.5 font-extrabold">اليوم في رمضان</th>
                    <th className="px-3 py-3.5 font-extrabold">التاريخ الميلادي</th>
                    <th className="px-3 py-3.5 font-extrabold">السحور</th>
                    <th className="px-3 py-3.5 font-extrabold text-amber-700 dark:text-gold">
                      الإمساك
                    </th>
                    <th className="px-3 py-3.5 font-extrabold text-primary">
                      أذان الفجر
                    </th>
                    <th className="px-3 py-3.5 font-extrabold">الشروق</th>
                    <th className="px-3 py-3.5 font-extrabold">الظهر</th>
                    <th className="px-3 py-3.5 font-extrabold">العصر</th>
                    <th className="px-3 py-3.5 font-extrabold text-emerald-700 dark:text-emerald-400">
                      أذان المغرب (الإفطار)
                    </th>
                    <th className="px-3 py-3.5 font-extrabold">العشاء والتراويح</th>
                    <th className="px-3 py-3.5 font-extrabold">ساعات الصيام</th>
                    <th className="px-3.5 py-3.5 font-extrabold">الورد القرآني</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredImsakiyahDays.map((day) => {
                    const isCurrentDay =
                      ramadanStatus.isRamadanNow &&
                      ramadanStatus.currentRamadanDay === day.ramadanDay;

                    return (
                      <tr
                        key={day.ramadanDay}
                        className={cn(
                          "transition hover:bg-muted/30",
                          isCurrentDay && "bg-primary/10 font-bold",
                          day.isOddLastTen &&
                            !isCurrentDay &&
                            "bg-gold/5 dark:bg-gold/10"
                        )}
                      >
                        <td className="px-3.5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-extrabold text-primary">
                              {toArabicDigits(day.ramadanDay)}
                            </span>
                            <div>
                              <p className="font-extrabold text-foreground">
                                {toArabicDigits(day.ramadanDay)} رمضان
                              </p>
                              {day.isOddLastTen && (
                                <span className="inline-block rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 dark:text-gold">
                                  {day.isLaylatulQadr27
                                    ? "ليلة ٢٧ رمضان (وتر)"
                                    : "ليلة وتر"}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          <span className="font-bold text-foreground">
                            {day.weekdayAr}
                          </span>{" "}
                          • {day.gregorianShortAr}
                        </td>
                        <td className="px-3 py-3 font-semibold">
                          {day.suhoorTime12Ar}
                        </td>
                        <td className="px-3 py-3 font-bold text-amber-700 dark:text-gold">
                          {day.imsakTime12Ar}
                        </td>
                        <td className="px-3 py-3 font-extrabold text-primary">
                          {day.fajrTime12Ar}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {day.sunriseTime12Ar}
                        </td>
                        <td className="px-3 py-3">{day.dhuhrTime12Ar}</td>
                        <td className="px-3 py-3">{day.asrTime12Ar}</td>
                        <td className="px-3 py-3">
                          <span className="rounded-lg bg-emerald-600/15 px-2.5 py-1 font-extrabold text-emerald-800 dark:text-emerald-300">
                            {day.maghribTime12Ar}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-semibold">
                          {day.ishaTime12Ar}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {day.fastingDurationAr}
                        </td>
                        <td className="px-3.5 py-3">
                          <Link
                            href={`/quran/juz/${day.juzNumber}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-bold text-primary hover:border-primary"
                          >
                            <span>الجزء {toArabicDigits(day.juzNumber)}</span>
                            <ChevronLeft className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (Zero Horizontal Scroll!) */}
            <div className="divide-y divide-border lg:hidden">
              {filteredImsakiyahDays.map((day) => (
                <div
                  key={day.ramadanDay}
                  className={cn(
                    "space-y-2.5 p-4",
                    day.isOddLastTen && "bg-gold/5 dark:bg-gold/10"
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-extrabold text-primary-foreground">
                        {toArabicDigits(day.ramadanDay)}
                      </span>
                      <div>
                        <p className="text-xs font-extrabold text-foreground">
                          {toArabicDigits(day.ramadanDay)} رمضان • {day.weekdayAr} (
                          {day.gregorianShortAr})
                        </p>
                      </div>
                    </div>

                    {day.isOddLastTen && (
                      <span className="rounded-lg bg-gold/20 px-2 py-0.5 text-[10px] font-extrabold text-amber-900 dark:text-gold">
                        {day.isLaylatulQadr27 ? "ليلة ٢٧ رمضان" : "ليلة وتر"}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl border border-border bg-background p-2">
                      <p className="text-[10px] text-muted-foreground">الإمساك</p>
                      <p className="mt-0.5 font-extrabold text-amber-700 dark:text-gold">
                        {day.imsakTime12Ar}
                      </p>
                    </div>
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-2">
                      <p className="text-[10px] text-primary">أذان الفجر</p>
                      <p className="mt-0.5 font-extrabold text-primary">
                        {day.fajrTime12Ar}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-600/30 bg-emerald-600/10 p-2">
                      <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        أذان المغرب
                      </p>
                      <p className="mt-0.5 font-extrabold text-emerald-800 dark:text-emerald-200">
                        {day.maghribTime12Ar}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
                    <span>
                      السحور: {day.suhoorTime12Ar} • التراويح: {day.ishaTime12Ar} •
                      الصيام: {day.fastingDurationAr}
                    </span>
                    <Link
                      href={`/quran/juz/${day.juzNumber}`}
                      className="font-bold text-primary"
                    >
                      قراءة الجزء {toArabicDigits(day.juzNumber)} ←
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 30-DAY RAMADAN QURAN KHATMAH PLANNER */}
      {activeTab === "khatmah" && (
        <div className="space-y-5">
          {/* Khatmah Goal & Progress Header */}
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div className="space-y-1">
                <h2 className="text-lg font-extrabold text-foreground sm:text-xl">
                  جدول ختمة القرآن الكريم في شهر رمضان (٣٠ يومًا • ٣٠ جزءًا)
                </h2>
                <p className="text-xs text-muted-foreground">
                  حدّد هدفك في ختم القرآن الكريم خلال الشهر الفضيل، واقرأ أو استمع لكل جزء
                  مباشرة بأصوات ١١ شيخًا، وعلّم على الأجزاء المكتملة لحفظ تقدمك.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {([1, 2, 3] as const).map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() =>
                      updateProgress({ ...progress, khatmahGoal: goal })
                    }
                    className={cn(
                      "rounded-xl border px-3.5 py-2 text-xs font-extrabold transition",
                      progress.khatmahGoal === goal
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/40"
                    )}
                  >
                    {goal === 1
                      ? "ختمة واحدة (جزء يوميًا)"
                      : goal === 2
                      ? "ختمتان (جزآن يوميًا)"
                      : "٣ ختمات (٣ أجزاء يوميًا)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-5 rounded-2xl border border-border bg-muted/30 p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-extrabold">
                <span className="text-foreground">
                  نسبة إنجاز الختمة الرمضانية:{" "}
                  {toArabicDigits(progress.completedJuzDays.length)} من ٣٠ يومًا
                </span>
                <span className="text-primary">
                  {toArabicDigits(khatmahPercent)}٪
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-primary to-gold transition-all duration-500"
                  style={{ width: `${khatmahPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* 30 Days Juz Cards */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {QURAN_JUZ_META.map((juz) => {
              const isDone = progress.completedJuzDays.includes(juz.id);

              return (
                <article
                  key={juz.id}
                  className={cn(
                    "flex flex-col justify-between rounded-2xl border p-4 shadow-soft transition",
                    isDone
                      ? "border-emerald-600/50 bg-emerald-600/5"
                      : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-lg bg-gold/20 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-900 dark:text-gold">
                        اليوم {toArabicDigits(juz.id)} من رمضان
                      </span>
                      <span className="text-[11px] font-bold text-muted-foreground">
                        ص {toArabicDigits(juz.pageStart)}-{toArabicDigits(juz.pageEnd)}
                      </span>
                    </div>

                    <h3 className="mt-2.5 font-sans text-base font-extrabold text-foreground">
                      {juz.nameAr}
                    </h3>
                    <p className="text-xs font-bold text-primary">
                      «{juz.titleAr}»
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      من سورة {juz.startSurahName} ({toArabicDigits(juz.startAyah)}) إلى{" "}
                      {juz.endSurahName} ({toArabicDigits(juz.endAyah)})
                    </p>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-3">
                    <Link
                      href={`/quran/juz/${juz.id}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>قراءة واستماع الجزء</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => toggleKhatmahDay(juz.id)}
                      className={cn(
                        "inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold transition",
                        isDone
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-border bg-background text-foreground hover:border-primary"
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>{isDone ? "مكتمل بحمد الله" : "تعليم كمكتمل"}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: AUTHENTIC RAMADAN DUAS, SUNNAHS & 30 DAILY DUAS */}
      {activeTab === "duas" && (
        <div className="space-y-8">
          {/* Section A: Essential Prophetic Duas for Ramadan */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div>
                <h2 className="text-lg font-extrabold text-foreground sm:text-xl">
                  الأدعية والأذكار النبوية الثابتة في شهر رمضان وليلة القدر
                </h2>
                <p className="text-xs text-muted-foreground">
                  أدعية صحيحة موثقة بالمصدر من سنة النبي ﷺ عند الإفطار وفي القيام
                  وليلة القدر
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {RAMADAN_ESSENTIAL_DUAS.map((dua) => (
                <article
                  key={dua.id}
                  className="flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-soft"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-xl bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground">
                        {dua.titleAr}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(
                              dua.id,
                              dua.titleAr,
                              `${dua.arabicText}\n(${dua.sourceAr})`
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-2.5 py-1 text-xs font-bold text-muted-foreground hover:text-foreground"
                        >
                          {copiedId === dua.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          <span>نسخ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleShareText(
                              dua.id,
                              dua.titleAr,
                              `${dua.arabicText}\n(${dua.sourceAr})`
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-2.5 py-1 text-xs font-bold text-muted-foreground hover:text-foreground"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          <span>مشاركة</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs font-bold text-primary">
                      {dua.occasionAr}
                    </p>

                    <div className="rounded-2xl border border-gold/30 bg-muted/30 p-4">
                      <p className="font-serif text-xl leading-[2.1] text-foreground sm:text-2xl">
                        {dua.arabicText}
                      </p>
                    </div>

                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {dua.benefitAr}
                    </p>
                  </div>

                  <div className="mt-4 border-t border-border/60 pt-2.5 text-[11px] font-bold text-amber-800 dark:text-gold">
                    المصدر: {dua.sourceAr}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Section B: 30 Daily Selected Quranic & Prophetic Duas */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div>
                <h2 className="text-lg font-extrabold text-foreground sm:text-xl">
                  أدعية أيام شهر رمضان المبارك (٣٠ دعاءً جامعًا من القرآن والسنة)
                </h2>
                <p className="text-xs text-muted-foreground">
                  دعاء مختار من جوامع الدعاء القرآني والنبوي الصحيح لكل يوم من أيام
                  رمضان الثلاثين
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
              {RAMADAN_THIRTY_DAILY_DUAS.map((item) => {
                const cId = `daily-dua-${item.day}`;
                return (
                  <article
                    key={item.day}
                    className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-soft"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-lg bg-gold/20 px-2.5 py-0.5 text-xs font-extrabold text-amber-900 dark:text-gold">
                          اليوم {toArabicDigits(item.day)} من رمضان
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(
                              cId,
                              item.titleAr,
                              `${item.arabicText}\n(${item.sourceAr})`
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground"
                        >
                          {copiedId === cId ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          <span>نسخ</span>
                        </button>
                      </div>

                      <h3 className="text-sm font-extrabold text-foreground">
                        {item.titleAr}
                      </h3>

                      <p className="rounded-xl bg-muted/40 p-3 font-serif text-lg leading-[2.0] text-foreground">
                        {item.arabicText}
                      </p>
                    </div>

                    <p className="mt-3 border-t border-border/50 pt-2 text-[11px] font-semibold text-primary">
                      {item.sourceAr}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: DAILY WORSHIP TRACKER & ZAKAT AL-FITR CALCULATOR */}
      {activeTab === "tracker" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Right Column: 30-Day Daily Deeds Tracker */}
          <div className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6 lg:col-span-7">
            <div>
              <h2 className="text-lg font-extrabold text-foreground sm:text-xl">
                جدول الطاعات اليومي في رمضان (٣٠ يومًا)
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                اختر اليوم من أيام رمضان الثلاثين وتابع أعمالك اليومية المباركة
                (تُحفظ تلقائيًا على جهازك).
              </p>
            </div>

            {/* 30 Days Selector Grid */}
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
              {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => {
                const count = (progress.dailyDeedsByDay[String(d)] || []).length;
                const isSelected = selectedTrackerDay === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedTrackerDay(d)}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl border py-2 text-xs font-extrabold transition",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : count >= 5
                        ? "border-emerald-600/50 bg-emerald-600/15 text-emerald-800 dark:text-emerald-300"
                        : count > 0
                        ? "border-gold/40 bg-gold/15 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    <span>{toArabicDigits(d)}</span>
                    <span className="text-[9px] opacity-80">
                      {toArabicDigits(count)}/٧
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Deeds Checklist for Selected Day */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-primary">
                  أعمال اليوم {toArabicDigits(selectedTrackerDay)} من شهر رمضان:
                </h3>
                <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
                  أنجزت {toArabicDigits(selectedDayDeeds.length)} من ٧ طاعات
                </span>
              </div>

              {RAMADAN_DAILY_DEEDS_META.map((deed) => {
                const checked = selectedDayDeeds.includes(deed.id);
                return (
                  <button
                    key={deed.id}
                    type="button"
                    onClick={() =>
                      toggleDailyDeed(selectedTrackerDay, deed.id)
                    }
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-2xl border p-3.5 text-right transition",
                      checked
                        ? "border-emerald-600/50 bg-emerald-600/10"
                        : "border-border bg-background hover:border-primary/40"
                    )}
                  >
                    <div>
                      <p className="text-xs font-extrabold text-foreground sm:text-sm">
                        {deed.labelAr}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {deed.subtitleAr}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition",
                        checked
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-border bg-card"
                      )}
                    >
                      {checked && <Check className="h-4 w-4" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Left Column: Zakat Al-Fitr & Fidyah Calculator */}
          <div className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6 lg:col-span-5">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-foreground sm:text-lg">
                  حاسبة زكاة الفطر وفدية الصيام
                </h2>
                <p className="text-xs text-muted-foreground">
                  حساب الصاع النبوي بالحجم أو القيمة النقدية بالجنيه المصري
                </p>
              </div>
            </div>

            <div className="space-y-3.5 rounded-2xl border border-border bg-muted/20 p-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-foreground">
                  عدد أفراد الأسرة الذين تخرج عنهم زكاة الفطر:
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={familyCount}
                  onChange={(e) =>
                    setFamilyCount(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-extrabold text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-foreground">
                  قيمة زكاة الفطر للفرد الواحد (بالجنيه المصري):
                </label>
                <input
                  type="number"
                  min={10}
                  max={5000}
                  value={zakatPerPersonEgp}
                  onChange={(e) =>
                    setZakatPerPersonEgp(
                      Math.max(1, parseInt(e.target.value, 10) || 35)
                    )
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-extrabold text-foreground focus:border-primary focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  تحدد دار الإفتاء المصرية الحد الأدنى سنويًا، ويُستحب الزيادة لمن
                  وسّع الله عليه.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-center">
                  <p className="text-[11px] font-bold text-primary">
                    إجمالي زكاة الفطر نقدًا
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-foreground">
                    {toArabicDigits(familyCount * zakatPerPersonEgp)} ج.م
                  </p>
                </div>
                <div className="rounded-xl border border-gold/40 bg-gold/15 p-3 text-center">
                  <p className="text-[11px] font-bold text-amber-900 dark:text-gold">
                    المقدار بالكيلوجرام (صاع = ٢.٥ كجم)
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-foreground">
                    {toArabicDigits(familyCount * 2.5)} كجم قوتًا
                  </p>
                </div>
              </div>
            </div>

            {/* Fidyah Calculator */}
            <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
              <h3 className="text-xs font-extrabold text-foreground sm:text-sm">
                حاسبة فدية الصيام (للعاجز عن الصيام عجزًا دائمًا):
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                    عدد أيام الفدية:
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={fidyahDaysCount}
                    onChange={(e) =>
                      setFidyahDaysCount(
                        Math.min(
                          30,
                          Math.max(0, parseInt(e.target.value, 10) || 0)
                        )
                      )
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-extrabold text-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                    قيمة إطعام مسكين لليوم (ج.م):
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={2000}
                    value={fidyahPerDayEgp}
                    onChange={(e) =>
                      setFidyahPerDayEgp(
                        Math.max(1, parseInt(e.target.value, 10) || 30)
                      )
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-extrabold text-foreground"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-extrabold">
                <span>إجمالي فدية الصيام:</span>
                <span className="text-primary">
                  {toArabicDigits(fidyahDaysCount * fidyahPerDayEgp)} جنيه مصري
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
