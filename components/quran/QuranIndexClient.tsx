"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Bookmark,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Flame,
  Layers,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { QURAN_JUZ_META } from "@/lib/quran/juz";
import {
  DEFAULT_DAILY_WIRD,
  getDailyWird,
  getLastReadPosition,
  getQuranBookmarks,
  saveDailyWird,
  STORAGE_CHANGE_EVENT,
  toggleQuranBookmark,
} from "@/lib/storage/local-storage";
import { logSpiritualActivity } from "@/lib/storage/indexed-db";
import { getLocalDateKey, normalizeArabicText, toArabicDigits, cn } from "@/lib/utils";
import {
  DailyWirdSettings,
  LastReadPosition,
  QuranBookmark,
  QuranSearchResult,
  SurahMeta,
  WirdUnit,
} from "@/types";

const UNIT_LABELS: Record<WirdUnit, string> = {
  pages: "صفحة",
  ayahs: "آية",
  juz: "جزء",
};

export function QuranIndexClient({ surahs }: { surahs: SurahMeta[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [juzSearchQuery, setJuzSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "meccan" | "medinan">("all");
  const [activeTab, setActiveTab] = useState<"surahs" | "juz" | "bookmarks" | "wird">(
    "surahs"
  );

  // Verse search results from API
  const [ayahResults, setAyahResults] = useState<QuranSearchResult[]>([]);
  const [searchingAyahs, setSearchingAyahs] = useState(false);

  // User state
  const [lastRead, setLastRead] = useState<LastReadPosition | null>(null);
  const [bookmarks, setBookmarks] = useState<QuranBookmark[]>([]);
  const [wird, setWird] = useState<DailyWirdSettings>(DEFAULT_DAILY_WIRD);

  useEffect(() => {
    setLastRead(getLastReadPosition());
    setBookmarks(getQuranBookmarks());
    setWird(getDailyWird());

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "juz" || window.location.hash === "#quran-juz") {
        setActiveTab("juz");
      } else if (tab === "wird" || window.location.hash === "#wird-settings") {
        setActiveTab("wird");
      } else if (tab === "bookmarks") {
        setActiveTab("bookmarks");
      }
    }

    const sync = () => {
      setLastRead(getLastReadPosition());
      setBookmarks(getQuranBookmarks());
      setWird(getDailyWird());
    };
    window.addEventListener(STORAGE_CHANGE_EVENT, sync);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, sync);
  }, []);

  const filteredJuzs = useMemo(() => {
    const q = normalizeArabicText(juzSearchQuery);
    if (!q) return QURAN_JUZ_META;
    return QURAN_JUZ_META.filter(
      (j) =>
        String(j.id) === juzSearchQuery.trim() ||
        normalizeArabicText(j.nameAr).includes(q) ||
        normalizeArabicText(j.titleAr).includes(q) ||
        normalizeArabicText(j.startSurahName).includes(q) ||
        normalizeArabicText(j.endSurahName).includes(q)
    );
  }, [juzSearchQuery]);

  // Filter Surahs
  const filteredSurahs = useMemo(() => {
    const q = normalizeArabicText(searchQuery);
    return surahs.filter((s) => {
      if (filterType !== "all" && s.type !== filterType) return false;
      if (!q) return true;
      return (
        normalizeArabicText(s.name).includes(q) ||
        normalizeArabicText(`سورة ${s.name}`).includes(q) ||
        s.transliteration.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(s.id) === searchQuery.trim()
      );
    });
  }, [surahs, searchQuery, filterType]);

  // Debounced full-text Ayah search when query >= 2 chars
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setAyahResults([]);
      setSearchingAyahs(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearchingAyahs(true);
      try {
        const res = await fetch(
          `/api/quran/search?q=${encodeURIComponent(trimmed)}&limit=30`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          setAyahResults(data.results || []);
        }
      } catch {
        // ignore abort
      } finally {
        setSearchingAyahs(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const todayKey = getLocalDateKey();
  const dailyPercent = Math.min(
    100,
    Math.round((wird.currentProgressToday / Math.max(1, wird.dailyTarget)) * 100)
  );

  // Compute last 7 days total for weekly target progress
  const weeklyCompletedAmount = useMemo(() => {
    let sum = 0;
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const k = getLocalDateKey(d);
      if (k === todayKey) {
        sum += wird.currentProgressToday;
      } else if (wird.history?.[k]) {
        sum += wird.history[k].completedAmount;
      }
    }
    return sum;
  }, [wird, todayKey]);

  const weeklyPercent = Math.min(
    100,
    Math.round((weeklyCompletedAmount / Math.max(1, wird.weeklyTarget)) * 100)
  );

  const handleUpdateWird = async (partial: Partial<DailyWirdSettings>) => {
    const next: DailyWirdSettings = {
      ...wird,
      ...partial,
      lastUpdatedDate: todayKey,
    };

    const completed = next.currentProgressToday >= next.dailyTarget;
    next.completedDates = completed
      ? Array.from(new Set([...next.completedDates, todayKey]))
      : next.completedDates.filter((d) => d !== todayKey);

    next.history = {
      ...next.history,
      [todayKey]: {
        target: next.dailyTarget,
        unit: next.unit,
        completedAmount: next.currentProgressToday,
        completed,
      },
    };

    saveDailyWird(next);
    setWird(next);

    if (completed && wird.currentProgressToday < wird.dailyTarget) {
      await logSpiritualActivity({
        dateKey: todayKey,
        type: "quran-wird",
        titleAr: "إتمام ورد القرآن اليومي",
        detailsAr: `تم إنجاز ${next.dailyTarget} ${UNIT_LABELS[next.unit]}`,
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Banner with Last Read & Daily Wird Summary */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-bl from-primary via-emerald-900 to-emerald-950 p-4 text-primary-foreground shadow-soft sm:p-6 md:p-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/15 px-3.5 py-1 text-xs font-bold text-gold">
              <BookOpen className="h-3.5 w-3.5" />
              <span>المصحف الشريف بالرسم العثماني (١١٤ سورة • ٦٢٣٦ آية)</span>
            </div>
            <h1 className="mt-3 text-2xl font-extrabold text-white sm:text-4xl">
              القرآن الكريم وورد القراءة اليومي
            </h1>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-emerald-100/90 sm:text-sm">
              تصفح سور القرآن الكريم كاملة مع التشكيل وعلامات الوقف، واستمع لتلاوات كبار قراء مصر والعالم الإسلامي، وتابع وردك اليومي والأسبوعي.
            </p>

            {/* Last Read Quick Resume */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href={
                  lastRead
                    ? `/quran/${lastRead.surahId}#ayah-${lastRead.ayahNumber}`
                    : "/quran/1"
                }
                className="inline-flex items-center gap-2 rounded-2xl bg-gold px-5 py-2.5 text-sm font-extrabold text-emerald-950 shadow-gold transition hover:bg-gold/90"
              >
                <BookOpen className="h-4 w-4" />
                <span>
                  {lastRead
                    ? `متابعة القراءة: سورة ${lastRead.surahName} (آية ${toArabicDigits(
                        lastRead.ayahNumber
                      )})`
                    : "ابدأ القراءة من سورة الفاتحة"}
                </span>
                <ChevronLeft className="h-4 w-4" />
              </Link>

              <button
                type="button"
                onClick={() => setActiveTab("juz")}
                className="inline-flex items-center gap-2 rounded-2xl border border-gold/40 bg-gold/15 px-4 py-2.5 text-xs font-bold text-gold transition hover:bg-gold hover:text-emerald-950 sm:text-sm"
              >
                <Layers className="h-4 w-4" />
                <span>أجزاء القرآن (٣٠ جزءًا للقراءة)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("wird")}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20 sm:text-sm"
              >
                <Sparkles className="h-4 w-4 text-gold" />
                <span>إدارة الورد اليومي ({toArabicDigits(dailyPercent)}٪)</span>
              </button>
            </div>
          </div>

          {/* Mini Wird Progress Box */}
          <div className="rounded-2xl border border-white/15 bg-black/25 p-5 backdrop-blur-md lg:col-span-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gold">تقدم ورد القرآن اليومي</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-white">
                <Flame className="h-3.5 w-3.5 text-gold" />
                <span>{toArabicDigits(wird.completedDates.length)} يوم مكتمل</span>
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div className="text-2xl font-extrabold text-white">
                {toArabicDigits(wird.currentProgressToday)} / {toArabicDigits(wird.dailyTarget)}{" "}
                <span className="text-sm font-normal text-emerald-200">
                  {UNIT_LABELS[wird.unit]}
                </span>
              </div>
              <span className="text-sm font-bold text-gold">
                {toArabicDigits(dailyPercent)}٪
              </span>
            </div>

            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-l from-gold to-emerald-300 transition-all duration-500"
                style={{ width: `${dailyPercent}%` }}
              />
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleUpdateWird({
                    currentProgressToday: wird.currentProgressToday + 1,
                  })
                }
                className="inline-flex items-center gap-1 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/25"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+١ {UNIT_LABELS[wird.unit]}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleUpdateWird({
                    currentProgressToday: wird.dailyTarget,
                  })
                }
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-100 ring-1 ring-emerald-400/40 hover:bg-emerald-500/40"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-gold" />
                <span>تسجيل ورد اليوم مكتملًا</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs: Surahs | 30 Juzs | Bookmarks | Daily Wird Manager */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="أقسام القرآن الكريم"
          className="grid w-full grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-sm sm:inline-flex sm:w-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "surahs"}
            onClick={() => setActiveTab("surahs")}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-bold transition sm:gap-2 sm:px-4 sm:text-sm",
              activeTab === "surahs"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="sm:hidden">السور ({toArabicDigits(114)})</span>
            <span className="hidden sm:inline">
              فهرس السور ({toArabicDigits(114)})
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "juz"}
            onClick={() => setActiveTab("juz")}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-bold transition sm:gap-2 sm:px-4 sm:text-sm",
              activeTab === "juz"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="sm:hidden">الأجزاء ({toArabicDigits(30)})</span>
            <span className="hidden sm:inline">
              أجزاء القرآن ({toArabicDigits(30)} جزءًا — للقراءة فقط)
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "bookmarks"}
            onClick={() => setActiveTab("bookmarks")}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-bold transition sm:gap-2 sm:px-4 sm:text-sm",
              activeTab === "bookmarks"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Bookmark className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="sm:hidden">
              المرجعية ({toArabicDigits(bookmarks.length)})
            </span>
            <span className="hidden sm:inline">
              العلامات المرجعية ({toArabicDigits(bookmarks.length)})
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "wird"}
            onClick={() => setActiveTab("wird")}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-bold transition sm:gap-2 sm:px-4 sm:text-sm",
              activeTab === "wird"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="sm:hidden">الورد اليومي</span>
            <span className="hidden sm:inline">نظام الورد اليومي والسجل</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Surahs Index & Full-Text Ayah Search */}
      {activeTab === "surahs" && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:p-5">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم السورة، رقمها، أو بكلمة/آية في القرآن الكريم كاملًا (مثال: الكرسي، الصبر، جنات)..."
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-4 pr-10 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:items-center">
              {(
                [
                  { id: "all", label: "كل السور (١١٤)" },
                  { id: "meccan", label: "مكية" },
                  { id: "medinan", label: "مدنية" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilterType(t.id)}
                  className={cn(
                    "whitespace-nowrap rounded-xl px-2.5 py-2 text-center text-xs font-bold transition sm:px-3.5",
                    filterType === t.id
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Verse Search Results (if query >= 2 chars) */}
          {searchQuery.trim().length >= 2 && (
            <div className="rounded-3xl border border-gold/30 bg-card p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-foreground">
                  نتائج البحث في آيات القرآن الكريم عن: «{searchQuery}»
                </h2>
                {searchingAyahs ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>جارٍ البحث...</span>
                  </span>
                ) : (
                  <span className="text-xs font-bold text-primary">
                    {toArabicDigits(ayahResults.length)} آية مطابقة
                  </span>
                )}
              </div>

              {ayahResults.length > 0 ? (
                <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pl-1">
                  {ayahResults.map((res) => (
                    <Link
                      key={`${res.surahId}-${res.ayahNumber}`}
                      href={`/quran/${res.surahId}#ayah-${res.ayahNumber}`}
                      className="block rounded-2xl border border-border/80 bg-background/70 p-4 transition hover:border-primary/50 hover:bg-muted/40"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-primary">
                        <span>
                          سورة {res.surahName} • الآية {toArabicDigits(res.ayahNumber)}
                        </span>
                        <span>فتح الآية في السورة ←</span>
                      </div>
                      <p className="quran-verse-text mt-2 text-lg text-foreground">
                        ﴿{res.text}﴾
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                !searchingAyahs && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    لا توجد آيات مطابقة لهذا النص، أو جرب البحث بكلمة أخرى دون همزات.
                  </p>
                )
              )}
            </div>
          )}

          {/* 114 Surahs Grid */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSurahs.map((surah) => {
              const isLastRead = lastRead?.surahId === surah.id;
              return (
                <Link
                  key={surah.id}
                  href={`/quran/${surah.id}`}
                  className={cn(
                    "group flex items-center justify-between rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md",
                    isLastRead
                      ? "border-gold bg-gold-muted/30 shadow-sm"
                      : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 font-bold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      {toArabicDigits(surah.id)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-quran text-xl font-bold text-foreground group-hover:text-primary">
                          سورة {surah.name}
                        </h3>
                        {isLastRead && (
                          <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-emerald-950">
                            آخر قراءة
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {surah.typeAr} • {toArabicDigits(surah.totalVerses)} آية • الجزء{" "}
                        {toArabicDigits(surah.juzStart)}
                      </p>
                    </div>
                  </div>

                  <div className="text-left text-xs text-muted-foreground">
                    <div>ص {toArabicDigits(surah.pageStart)}</div>
                    <div className="mt-0.5 text-[11px] font-medium text-primary">
                      قراءة ←
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Dedicated 30 Juz Reading Section inside Quran Page */}
          <section
            id="quran-juz"
            aria-label="أجزاء القرآن الكريم الثلاثون للقراءة فقط"
            className="scroll-mt-24 space-y-5 rounded-3xl border border-gold/35 bg-card p-4 shadow-soft sm:p-6 md:p-8"
          >
            <div className="flex flex-col justify-between gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-extrabold text-gold">
                  <Layers className="h-3.5 w-3.5" />
                  <span>٣٠ جزءًا كاملًا • وضع القراءة الخالصة فقط</span>
                </div>
                <h2 className="mt-2 text-xl font-extrabold text-foreground sm:text-2xl">
                  أجزاء القرآن الكريم (٣٠ جزءًا — للقراءة فقط)
                </h2>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  اختر أي جزء من الأجزاء الثلاثين لقراءته كاملًا بالرسم العثماني دون مشغلات صوتية
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("juz")}
                className="inline-flex items-center justify-center gap-1.5 self-start rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 sm:self-center"
              >
                <BookOpen className="h-4 w-4" />
                <span>فتح فهرس الأجزاء المفصل</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {QURAN_JUZ_META.map((juz) => (
                <Link
                  key={juz.id}
                  href={`/quran/juz/${juz.id}`}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/70 p-3.5 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card hover:shadow-md sm:p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gold/15 font-extrabold text-gold transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      {toArabicDigits(juz.id)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate font-serif text-base font-bold text-foreground group-hover:text-primary sm:text-lg">
                          {juz.nameAr}
                        </h3>
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          قراءة فقط
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs font-semibold text-gold">
                        «{juz.titleAr}»
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        من {juz.startSurahName} ({toArabicDigits(juz.startAyah)}) إلى{" "}
                        {juz.endSurahName} ({toArabicDigits(juz.endAyah)})
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-left text-xs text-muted-foreground">
                    <div>
                      ص {toArabicDigits(juz.pageStart)}–{toArabicDigits(juz.pageEnd)}
                    </div>
                    <div className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-bold text-primary">
                      <span>قراءة</span>
                      <ChevronLeft className="h-3 w-3" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: 30 Juzs Pure Reading Index */}
      {activeTab === "juz" && (
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 rounded-3xl border border-gold/35 bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:p-6">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-extrabold text-gold">
                <BookOpen className="h-3.5 w-3.5" />
                <span>مصحف القراءة الخالصة • ٣٠ جزءًا</span>
              </div>
              <h2 className="mt-2 text-xl font-extrabold text-foreground sm:text-2xl">
                فهرس أجزاء القرآن الكريم (٣٠ جزءًا — للقراءة فقط)
              </h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                جميع أجزاء المصحف الشريف الثلاثين مرتبة ومقسمة بدقة للقراءة المباشرة بالرسم العثماني
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={juzSearchQuery}
                onChange={(e) => setJuzSearchQuery(e.target.value)}
                placeholder="ابحث برقم الجزء أو اسمه أو السورة..."
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-4 pr-10 text-xs font-semibold text-foreground focus:border-primary focus:outline-none sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredJuzs.map((juz) => (
              <Link
                key={juz.id}
                href={`/quran/juz/${juz.id}`}
                className="group flex flex-col justify-between rounded-3xl border border-border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md sm:p-5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-base font-extrabold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        {toArabicDigits(juz.id)}
                      </div>
                      <div>
                        <h3 className="font-serif text-lg font-extrabold text-foreground group-hover:text-primary sm:text-xl">
                          {juz.nameAr}
                        </h3>
                        <p className="text-xs font-bold text-gold">
                          مطلع الجزء: «{juz.titleAr}»
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-[10px] font-extrabold text-gold">
                      للقراءة فقط
                    </span>
                  </div>

                  <div className="mt-4 rounded-2xl border border-border/70 bg-background/60 p-3 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>البداية:</span>
                      <strong className="text-foreground">
                        سورة {juz.startSurahName} — آية {toArabicDigits(juz.startAyah)}
                      </strong>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between border-t border-border/50 pt-1.5 text-muted-foreground">
                      <span>النهاية:</span>
                      <strong className="text-foreground">
                        سورة {juz.endSurahName} — آية {toArabicDigits(juz.endAyah)}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                  <span className="font-semibold text-muted-foreground">
                    الصفحات: {toArabicDigits(juz.pageStart)} إلى{" "}
                    {toArabicDigits(juz.pageEnd)}
                  </span>
                  <span className="inline-flex items-center gap-1 font-extrabold text-primary">
                    <span>قراءة الجزء كاملًا</span>
                    <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Bookmarks */}
      {activeTab === "bookmarks" && (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-xl font-extrabold text-foreground">
            العلامات المرجعية المحفوظة ({toArabicDigits(bookmarks.length)})
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            الآيات التي قمت بحفظها للعودة إليها وتدبرها في أي وقت
          </p>

          {bookmarks.length === 0 ? (
            <div className="my-12 text-center">
              <Bookmark className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 font-bold text-foreground">
                لا توجد علامات مرجعية محفوظة بعد
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                أثناء قراءة أي سورة، اضغط على أيقونة العلامة المرجعية بجانب الآية لحفظها هنا.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-background/60 p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary">
                      <span>
                        سورة {bm.surahName} • الآية {toArabicDigits(bm.ayahNumber)}
                      </span>
                    </div>
                    <p className="quran-verse-text mt-2 text-lg text-foreground">
                      ﴿{bm.ayahSnippet}﴾
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Link
                      href={`/quran/${bm.surahId}#ayah-${bm.ayahNumber}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground"
                    >
                      <span>الانتقال للآية</span>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        const res = toggleQuranBookmark({
                          surahId: bm.surahId,
                          surahName: bm.surahName,
                          ayahNumber: bm.ayahNumber,
                          ayahSnippet: bm.ayahSnippet,
                        });
                        setBookmarks(res.bookmarks);
                      }}
                      aria-label="حذف العلامة المرجعية"
                      className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Daily Wird System & History */}
      {activeTab === "wird" && (
        <section
          id="wird-settings"
          className="grid grid-cols-1 gap-6 lg:grid-cols-12"
        >
          {/* Settings & Controls */}
          <div className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-soft lg:col-span-7">
            <div>
              <h2 className="text-xl font-extrabold text-foreground">
                إعدادات ورد القرآن اليومي والأسبوعي
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                حدد هدفك اليومي بالآيات أو الصفحات أو الأجزاء، وسجّل إنجازك يومًا بيوم
              </p>
            </div>

            {/* Unit Selector */}
            <div>
              <label className="mb-2 block text-xs font-bold text-foreground">
                وحدة قياس الورد اليومي
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(
                  [
                    { id: "pages", label: "صفحات يوميًا", defaultTarget: 4 },
                    { id: "ayahs", label: "آيات يوميًا", defaultTarget: 20 },
                    { id: "juz", label: "أجزاء يوميًا", defaultTarget: 1 },
                  ] as const
                ).map((u) => {
                  const active = wird.unit === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() =>
                        handleUpdateWird({
                          unit: u.id,
                          dailyTarget: u.defaultTarget,
                          weeklyTarget: u.defaultTarget * 7,
                        })
                      }
                      className={cn(
                        "rounded-2xl border p-3 text-center text-xs font-bold transition",
                        active
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-background text-foreground hover:bg-muted"
                      )}
                    >
                      {u.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Daily & Weekly Target Inputs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="daily-target-input"
                  className="mb-1.5 block text-xs font-bold text-foreground"
                >
                  الهدف اليومي ({UNIT_LABELS[wird.unit]})
                </label>
                <input
                  id="daily-target-input"
                  type="number"
                  min={1}
                  max={604}
                  value={wird.dailyTarget}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value || "1", 10));
                    handleUpdateWird({
                      dailyTarget: val,
                      weeklyTarget: val * 7,
                    });
                  }}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground"
                />
              </div>

              <div>
                <label
                  htmlFor="weekly-target-input"
                  className="mb-1.5 block text-xs font-bold text-foreground"
                >
                  الهدف الأسبوعي ({UNIT_LABELS[wird.unit]})
                </label>
                <input
                  id="weekly-target-input"
                  type="number"
                  min={1}
                  max={604}
                  value={wird.weeklyTarget}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value || "1", 10));
                    handleUpdateWird({ weeklyTarget: val });
                  }}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground"
                />
              </div>
            </div>

            {/* Optional Wird Reminder Time */}
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    تذكير اختياري بموعد قراءة الورد اليومي
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={wird.reminderEnabled}
                  onChange={(e) =>
                    handleUpdateWird({ reminderEnabled: e.target.checked })
                  }
                  className="h-4 w-4 accent-primary"
                />
              </div>

              {wird.reminderEnabled && (
                <div className="mt-3 flex items-center gap-3">
                  <label htmlFor="wird-reminder-time" className="text-xs text-muted-foreground">
                    وقت التذكير المفضل:
                  </label>
                  <input
                    id="wird-reminder-time"
                    type="time"
                    value={wird.reminderTime}
                    onChange={(e) =>
                      handleUpdateWird({ reminderTime: e.target.value })
                    }
                    className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Weekly Indicator & History Log */}
          <div className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-soft lg:col-span-5">
            <h3 className="text-lg font-extrabold text-foreground">
              مؤشر الإنجاز الأسبوعي وسجل الورد
            </h3>

            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>إنجاز آخر ٧ أيام</span>
                <span className="text-primary">
                  {toArabicDigits(weeklyCompletedAmount)} من{" "}
                  {toArabicDigits(wird.weeklyTarget)} {UNIT_LABELS[wird.unit]} (
                  {toArabicDigits(weeklyPercent)}٪)
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${weeklyPercent}%` }}
                />
              </div>
            </div>

            <div>
              <h4 className="mb-2.5 text-xs font-bold text-muted-foreground">
                سجل الإنجاز اليومي (آخر ٧ أيام)
              </h4>
              <div className="space-y-2">
                {Array.from({ length: 7 }).map((_, idx) => {
                  const d = new Date();
                  d.setDate(d.getDate() - idx);
                  const k = getLocalDateKey(d);
                  const entry =
                    k === todayKey
                      ? {
                          completedAmount: wird.currentProgressToday,
                          target: wird.dailyTarget,
                          completed: wird.currentProgressToday >= wird.dailyTarget,
                        }
                      : wird.history?.[k] || {
                          completedAmount: 0,
                          target: wird.dailyTarget,
                          completed: false,
                        };

                  return (
                    <div
                      key={k}
                      className="flex items-center justify-between rounded-xl border border-border/70 bg-background/50 px-3.5 py-2.5 text-xs"
                    >
                      <span className="font-semibold text-foreground">
                        {idx === 0 ? "اليوم" : idx === 1 ? "أمس" : k}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {toArabicDigits(entry.completedAmount)} /{" "}
                          {toArabicDigits(entry.target)} {UNIT_LABELS[wird.unit]}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold",
                            entry.completed
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {entry.completed ? "مكتمل" : "قيد الإنجاز"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
