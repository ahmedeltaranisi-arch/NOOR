"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Columns,
  Copy,
  Filter,
  Library,
  Loader2,
  Mic,
  Pause,
  Play,
  ScrollText,
  Search,
  Share2,
  Sparkles,
  Volume2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { QURAN_RECITERS } from "@/data/daily-content";
import { getAyahAudioUrl, getSurahFallbackAudioUrl } from "@/lib/quran/audio";
import { SURAHS_META } from "@/lib/quran/metadata";
import { getQuranPrefs, saveQuranPrefs } from "@/lib/storage/local-storage";
import {
  TAFSIR_BOOKS_META,
  TOTAL_QURAN_SURAHS_COUNT,
  TOTAL_QURAN_VERSES_COUNT,
  TOTAL_TAFSIR_BOOKS_COUNT,
} from "@/lib/tafsir/meta";
import { cn, toArabicDigits } from "@/lib/utils";
import {
  AyahCompareTafsirResult,
  AyahTafsirEntry,
  SurahTafsirResult,
  TafsirBookSlug,
} from "@/types";

const AYAH_FONT_CLASSES: Record<1 | 2 | 3 | 4, string> = {
  1: "text-xl leading-[2.2]",
  2: "text-2xl leading-[2.3] sm:text-3xl sm:leading-[2.35]",
  3: "text-3xl leading-[2.4] sm:text-4xl sm:leading-[2.45]",
  4: "text-4xl leading-[2.5] sm:text-5xl sm:leading-[2.55]",
};

const TAFSIR_FONT_CLASSES: Record<1 | 2 | 3 | 4, string> = {
  1: "text-sm leading-[2.0] sm:text-base sm:leading-[2.05]",
  2: "text-base leading-[2.1] sm:text-lg sm:leading-[2.15]",
  3: "text-lg leading-[2.15] sm:text-xl sm:leading-[2.2]",
  4: "text-xl leading-[2.2] sm:text-2xl sm:leading-[2.3]",
};

export function TafsirExplorerClient({
  initialSurahTafsir,
  initialCompareData,
  initialTab = "reader",
}: {
  initialSurahTafsir: SurahTafsirResult;
  initialCompareData?: AyahCompareTafsirResult;
  initialTab?: "reader" | "compare" | "books";
}) {
  const [activeTab, setActiveTab] = useState<"reader" | "compare" | "books">(
    initialTab
  );

  // Reader State
  const [selectedBook, setSelectedBook] = useState<TafsirBookSlug>(
    initialSurahTafsir.tafsirMeta.slug
  );
  const [selectedSurahId, setSelectedSurahId] = useState<number>(
    initialSurahTafsir.surahId
  );
  const [selectedAyahFilter, setSelectedAyahFilter] = useState<number | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [surahTafsir, setSurahTafsir] =
    useState<SurahTafsirResult>(initialSurahTafsir);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<1 | 2 | 3 | 4>(2);

  // Compare All 7 Tafsirs State
  const [compareSurahId, setCompareSurahId] = useState<number>(
    initialCompareData?.surahId || initialSurahTafsir.surahId
  );
  const [compareAyahNum, setCompareAyahNum] = useState<number>(
    initialCompareData?.ayahNumber || 1
  );
  const [compareData, setCompareData] =
    useState<AyahCompareTafsirResult | null>(initialCompareData || null);
  const [isCompareLoading, setIsCompareLoading] = useState<boolean>(false);

  // Audio Recitation State (11 Sheikhs)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [reciterId, setReciterId] = useState<string>("husary");
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  // Copy & Toast State
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const prefs = getQuranPrefs();
    if (prefs.reciterId) {
      setReciterId(prefs.reciterId);
    }
    if (prefs.fontSizeLevel) {
      setFontSizeLevel(prefs.fontSizeLevel);
    }
  }, []);

  useEffect(() => {
    setSelectedBook(initialSurahTafsir.tafsirMeta.slug);
    setSelectedSurahId(initialSurahTafsir.surahId);
    setSurahTafsir(initialSurahTafsir);
  }, [initialSurahTafsir]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const currentReciter =
    QURAN_RECITERS.find((r) => r.id === reciterId) || QURAN_RECITERS[0];

  const fetchSurahTafsir = useCallback(
    async (params: {
      book: TafsirBookSlug;
      surah: number;
      ayah?: number | null;
      q?: string;
    }) => {
      setIsLoading(true);
      try {
        const sp = new URLSearchParams();
        sp.set("book", params.book);
        sp.set("surah", String(params.surah));
        if (params.ayah) {
          sp.set("ayah", String(params.ayah));
        }
        if (params.q && params.q.trim()) {
          sp.set("q", params.q.trim());
        }
        const res = await fetch(`/api/tafsir?${sp.toString()}`);
        if (res.ok) {
          const data = (await res.json()) as SurahTafsirResult;
          setSurahTafsir(data);
        }
      } catch {
        // preserve current state on error
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const fetchCompareAyah = useCallback(async (surah: number, ayah: number) => {
    setIsCompareLoading(true);
    try {
      const res = await fetch(
        `/api/tafsir?mode=compare&surah=${surah}&ayah=${ayah}`
      );
      if (res.ok) {
        const data = (await res.json()) as AyahCompareTafsirResult;
        setCompareData(data);
      }
    } catch {
      // ignore
    } finally {
      setIsCompareLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "compare" && !compareData) {
      fetchCompareAyah(compareSurahId, compareAyahNum);
    }
  }, [activeTab, compareData, compareSurahId, compareAyahNum, fetchCompareAyah]);

  const handleSelectTafsirBook = (slug: TafsirBookSlug) => {
    setSelectedBook(slug);
    setActiveTab("reader");
    fetchSurahTafsir({
      book: slug,
      surah: selectedSurahId,
      ayah: selectedAyahFilter,
      q: searchQuery,
    });
  };

  const handleSelectSurah = (newSurahId: number) => {
    setSelectedSurahId(newSurahId);
    setSelectedAyahFilter(null);
    setActiveTab("reader");
    fetchSurahTafsir({
      book: selectedBook,
      surah: newSurahId,
      ayah: null,
      q: searchQuery,
    });
    if (typeof window !== "undefined") {
      const el = document.getElementById("tafsir-reader-top");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const handleSelectAyahFilter = (ayahNum: number | null) => {
    setSelectedAyahFilter(ayahNum);
    fetchSurahTafsir({
      book: selectedBook,
      surah: selectedSurahId,
      ayah: ayahNum,
      q: searchQuery,
    });
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchSurahTafsir({
      book: selectedBook,
      surah: selectedSurahId,
      ayah: selectedAyahFilter,
      q: searchQuery,
    });
  };

  const handleOpenCompareForAyah = (surahId: number, ayahNum: number) => {
    setCompareSurahId(surahId);
    setCompareAyahNum(ayahNum);
    setActiveTab("compare");
    fetchCompareAyah(surahId, ayahNum);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePlayAyahAudio = async (surahId: number, ayahNum: number) => {
    const key = `${surahId}:${ayahNum}`;
    if (!audioRef.current) return;

    if (playingKey === key) {
      audioRef.current.pause();
      setPlayingKey(null);
      return;
    }

    const url = getAyahAudioUrl(
      surahId,
      ayahNum,
      currentReciter.everyAyahFolder
    );
    audioRef.current.src = url;
    try {
      await audioRef.current.play();
      setPlayingKey(key);
    } catch {
      const fallback = getSurahFallbackAudioUrl(
        surahId,
        currentReciter.surahAudioServerUrl
      );
      if (fallback && audioRef.current) {
        try {
          audioRef.current.src = fallback;
          await audioRef.current.play();
          setPlayingKey(key);
        } catch {
          setPlayingKey(null);
        }
      }
    }
  };

  const handleCopyAyahTafsir = async (
    entry: AyahTafsirEntry,
    bookTitle: string,
    surahName: string
  ) => {
    const formatted = `﴿${entry.ayahText}﴾ [سورة ${surahName}: ${toArabicDigits(
      entry.ayahNumber
    )}]\n\n📖 ${bookTitle}:\n${entry.tafsirText}`;
    const key = `${selectedBook}:${selectedSurahId}:${entry.ayahNumber}`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedKey(key);
      showToast(`تم نسخ الآية الكريمة مع تفسيرها (${bookTitle})`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleShareAyahTafsir = async (
    entry: AyahTafsirEntry,
    bookTitle: string,
    surahName: string
  ) => {
    const formatted = `﴿${entry.ayahText}﴾ [سورة ${surahName}: ${toArabicDigits(
      entry.ayahNumber
    )}]\n\n📖 ${bookTitle}:\n${entry.tafsirText}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `تفسير سورة ${surahName} الآية ${toArabicDigits(
            entry.ayahNumber
          )} — ${bookTitle}`,
          text: formatted,
        });
        return;
      } catch {
        // fallback to copy
      }
    }
    await handleCopyAyahTafsir(entry, bookTitle, surahName);
  };

  const compareSurahMeta =
    SURAHS_META.find((s) => s.id === compareSurahId) || SURAHS_META[0];

  return (
    <div className="space-y-6">
      {/* Hidden Audio Element for Ayah Recitation */}
      <audio
        ref={audioRef}
        onEnded={() => setPlayingKey(null)}
        onError={() => setPlayingKey(null)}
        preload="none"
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-gold/40 bg-emerald-950 px-4 py-3 text-center text-xs font-bold text-white shadow-gold md:bottom-8"
        >
          {toastMessage}
        </div>
      )}

      {/* Encyclopedia Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-l from-emerald-950 via-emerald-900 to-emerald-950 p-5 text-white shadow-soft sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="space-y-2.5">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-gold/30 bg-white/10 px-3.5 py-1 text-xs font-bold text-gold">
              <BookOpen className="h-3.5 w-3.5" />
              <span>موسوعة تفسير القرآن الكريم وعلومه</span>
              <span>•</span>
              <span>{toArabicDigits(TOTAL_TAFSIR_BOOKS_COUNT)} تفاسير معتمدة</span>
            </div>

            <h1 className="font-sans text-2xl font-extrabold leading-relaxed text-white sm:text-4xl">
              تفسير القرآن الكريم كاملًا (١١٤ سورة • ٦,٢٣٦ آية)
            </h1>

            <p className="max-w-3xl text-xs leading-relaxed text-emerald-100/90 sm:text-sm">
              اقرأ وتدبّر آيات كتاب الله عز وجل من خلال ٧ من أمهات كتب التفسير المعتمدة:
              التفسير الميسر، تفسير السعدي، تفسير ابن كثير، تفسير القرطبي، تفسير البغوي،
              معاني كلمات القرآن، وإعراب القرآن الكريم، مع إمكانية مقارنة جميع التفاسير
              لأي آية والاستماع لتلاوتها بأصوات ١١ شيخًا.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 lg:shrink-0">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-center backdrop-blur-sm sm:px-4">
              <p className="text-lg font-extrabold text-gold sm:text-2xl">
                {toArabicDigits(TOTAL_TAFSIR_BOOKS_COUNT)}
              </p>
              <p className="text-[11px] font-medium text-emerald-100">كتب تفسير</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-center backdrop-blur-sm sm:px-4">
              <p className="text-lg font-extrabold text-gold sm:text-2xl">
                {toArabicDigits(TOTAL_QURAN_SURAHS_COUNT)}
              </p>
              <p className="text-[11px] font-medium text-emerald-100">سورة كاملة</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-center backdrop-blur-sm sm:px-4">
              <p className="text-lg font-extrabold text-gold sm:text-2xl">
                {toArabicDigits(TOTAL_QURAN_VERSES_COUNT)}
              </p>
              <p className="text-[11px] font-medium text-emerald-100">آية مفسرة</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="grid grid-cols-1 gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-soft sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setActiveTab("reader")}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-extrabold transition sm:text-sm",
            activeTab === "reader"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          <span>قارئ التفسير آية بآية</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("compare");
            if (!compareData) {
              fetchCompareAyah(selectedSurahId, selectedAyahFilter || 1);
            }
          }}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-extrabold transition sm:text-sm",
            activeTab === "compare"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <Columns className="h-4 w-4 shrink-0" />
          <span>مقارنة التفاسير الـ ٧ لآية</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("books")}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-extrabold transition sm:text-sm",
            activeTab === "books"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <Library className="h-4 w-4 shrink-0" />
          <span>كتب التفسير الـ ٧ وفهرس السور</span>
        </button>
      </div>

      {/* TAB 1: VERSE-BY-VERSE TAFSIR READER */}
      {activeTab === "reader" && (
        <div id="tafsir-reader-top" className="space-y-5">
          {/* 7 Tafsir Books Quick Selector + Surah/Ayah/Search Controls */}
          <div className="rounded-3xl border border-border bg-card p-4 shadow-soft sm:p-6">
            {/* 7 Tafsir Books Pills */}
            <div className="mb-4">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-foreground sm:text-sm">
                  <ScrollText className="h-4 w-4 text-primary" />
                  <span>اختر كتاب التفسير (٧ تفاسير معتمدة):</span>
                </div>
                <span className="rounded-full bg-gold/20 px-3 py-0.5 text-[11px] font-bold text-amber-900 dark:text-gold">
                  {surahTafsir.tafsirMeta.badgeAr}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {TAFSIR_BOOKS_META.map((book) => {
                  const active = selectedBook === book.slug;
                  return (
                    <button
                      key={book.slug}
                      type="button"
                      onClick={() => handleSelectTafsirBook(book.slug)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-extrabold transition active:scale-95",
                        active
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-muted/30 text-foreground hover:border-primary/40 hover:text-primary"
                      )}
                    >
                      <BookOpen
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          active ? "text-gold" : "text-primary"
                        )}
                      />
                      <span>{book.shortTitleAr}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Surah, Ayah, Reciter, and Search Filter Bar */}
            <form
              onSubmit={handleSearchSubmit}
              className="grid grid-cols-1 gap-2.5 border-t border-border pt-4 md:grid-cols-12"
            >
              {/* Surah Selector (1..114) */}
              <div className="md:col-span-3">
                <label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                  السورة الكريمة (١١٤ سورة):
                </label>
                <select
                  aria-label="اختيار السورة لتفسيرها"
                  value={selectedSurahId}
                  onChange={(e) => handleSelectSurah(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-extrabold text-foreground focus:border-primary focus:outline-none"
                >
                  {SURAHS_META.map((s) => (
                    <option key={s.id} value={s.id}>
                      {toArabicDigits(s.id)}. سورة {s.name} ({toArabicDigits(s.totalVerses)}{" "}
                      آية)
                    </option>
                  ))}
                </select>
              </div>

              {/* Ayah Selector (All or 1..N) */}
              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                  تحديد الآية:
                </label>
                <select
                  aria-label="اختيار رقم الآية"
                  value={
                    selectedAyahFilter === null
                      ? "all"
                      : String(selectedAyahFilter)
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    handleSelectAyahFilter(
                      val === "all" ? null : parseInt(val, 10)
                    );
                  }}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-extrabold text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="all">
                    جميع الآيات ({toArabicDigits(surahTafsir.totalVerses)})
                  </option>
                  {Array.from(
                    { length: surahTafsir.totalVerses },
                    (_, i) => i + 1
                  ).map((aNum) => (
                    <option key={aNum} value={aNum}>
                      الآية رقم {toArabicDigits(aNum)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search in Surah Verses or Tafsir */}
              <div className="md:col-span-4">
                <label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                  بحث في آيات وتفسير السورة:
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بكلمة في الآية أو في شرح التفسير..."
                    className="w-full rounded-xl border border-border bg-background py-2 pl-8 pr-9 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        fetchSurahTafsir({
                          book: selectedBook,
                          surah: selectedSurahId,
                          ayah: selectedAyahFilter,
                          q: "",
                        });
                      }}
                      aria-label="مسح البحث"
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Reciter Selector + Font Size */}
              <div className="flex items-end gap-2 md:col-span-3">
                <div className="flex-1">
                  <label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                    القارئ عند الاستماع:
                  </label>
                  <select
                    aria-label="اختيار القارئ للاستماع للآية"
                    value={reciterId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setReciterId(nextId);
                      const prefs = getQuranPrefs();
                      saveQuranPrefs({ ...prefs, reciterId: nextId });
                    }}
                    className="w-full rounded-xl border border-border bg-background px-2.5 py-2 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                  >
                    {QURAN_RECITERS.map((rec) => (
                      <option key={rec.id} value={rec.id}>
                        {rec.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Font Size Controls */}
                <div className="inline-flex items-center gap-0.5 rounded-xl border border-border bg-background px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setFontSizeLevel(
                        Math.max(1, fontSizeLevel - 1) as 1 | 2 | 3 | 4
                      )
                    }
                    disabled={fontSizeLevel <= 1}
                    aria-label="تصغير الخط"
                    className="rounded-lg p-1 text-foreground hover:bg-muted disabled:opacity-40"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-[16px] text-center text-xs font-bold text-primary">
                    {toArabicDigits(fontSizeLevel)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setFontSizeLevel(
                        Math.min(4, fontSizeLevel + 1) as 1 | 2 | 3 | 4
                      )
                    }
                    disabled={fontSizeLevel >= 4}
                    aria-label="تكبير الخط"
                    className="rounded-lg p-1 text-foreground hover:bg-muted disabled:opacity-40"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </form>

            {/* Active Tafsir Book & Surah Info Banner */}
            <div className="mt-4 flex flex-col justify-between gap-3 rounded-2xl border border-gold/30 bg-gradient-to-l from-primary/10 via-gold/10 to-primary/10 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-primary px-2.5 py-0.5 text-xs font-extrabold text-primary-foreground">
                    سورة {surahTafsir.surahName}
                  </span>
                  <h2 className="font-sans text-base font-extrabold text-foreground sm:text-lg">
                    {surahTafsir.tafsirMeta.titleAr}
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  {surahTafsir.tafsirMeta.authorAr} • {surahTafsir.surahTypeAr} • عدد
                  آيات السورة: {toArabicDigits(surahTafsir.totalVerses)} آية • الجزء{" "}
                  {toArabicDigits(surahTafsir.juzStart)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedSurahId > 1 && (
                  <button
                    type="button"
                    onClick={() => handleSelectSurah(selectedSurahId - 1)}
                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:border-primary hover:text-primary"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span>السورة السابقة</span>
                  </button>
                )}

                <Link
                  href={`/quran/${surahTafsir.surahId}`}
                  className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-primary hover:border-primary"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>قراءة السورة بالمصحف</span>
                </Link>

                {selectedSurahId < 114 && (
                  <button
                    type="button"
                    onClick={() => handleSelectSurah(selectedSurahId + 1)}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                  >
                    <span>السورة التالية</span>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Ayah + Tafsir Cards */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-card py-16 text-center shadow-soft">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-bold text-muted-foreground">
                جاري تحميل تفسير سورة {surahTafsir.surahName}...
              </p>
            </div>
          ) : surahTafsir.entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-card py-14 text-center shadow-soft">
              <ScrollText className="h-10 w-10 text-muted-foreground" />
              <p className="text-base font-bold text-foreground">
                لم يتم العثور على آيات أو تفسير يطابق عبارة البحث في هذه السورة
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedAyahFilter(null);
                  fetchSurahTafsir({
                    book: selectedBook,
                    surah: selectedSurahId,
                    ayah: null,
                    q: "",
                  });
                }}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
              >
                عرض كامل تفسير السورة
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {surahTafsir.entries.map((entry) => {
                const audioKey = `${surahTafsir.surahId}:${entry.ayahNumber}`;
                const isAyahPlaying = playingKey === audioKey;
                const copyKey = `${selectedBook}:${surahTafsir.surahId}:${entry.ayahNumber}`;

                return (
                  <article
                    key={copyKey}
                    id={`tafsir-ayah-${entry.ayahNumber}`}
                    className="rounded-3xl border border-border bg-card p-5 shadow-soft transition hover:border-primary/40 sm:p-6"
                  >
                    {/* Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-xs font-extrabold text-primary-foreground">
                          {toArabicDigits(entry.ayahNumber)}
                        </span>
                        <span className="text-xs font-extrabold text-foreground sm:text-sm">
                          سورة {surahTafsir.surahName} • الآية{" "}
                          {toArabicDigits(entry.ayahNumber)}
                        </span>
                        <span className="rounded-xl bg-gold/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 dark:text-gold">
                          {surahTafsir.tafsirMeta.shortTitleAr}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handlePlayAyahAudio(
                              surahTafsir.surahId,
                              entry.ayahNumber
                            )
                          }
                          className={cn(
                            "inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition",
                            isAyahPlaying
                              ? "bg-red-600 text-white"
                              : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                          )}
                        >
                          {isAyahPlaying ? (
                            <>
                              <Pause className="h-3.5 w-3.5" />
                              <span>إيقاف</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5" />
                              <span>استماع للآية</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleOpenCompareForAyah(
                              surahTafsir.surahId,
                              entry.ayahNumber
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground"
                        >
                          <Columns className="h-3.5 w-3.5" />
                          <span>مقارنة التفاسير الـ ٧</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleCopyAyahTafsir(
                              entry,
                              surahTafsir.tafsirMeta.shortTitleAr,
                              surahTafsir.surahName
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          {copiedKey === copyKey ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          <span>نسخ</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleShareAyahTafsir(
                              entry,
                              surahTafsir.tafsirMeta.shortTitleAr,
                              surahTafsir.surahName
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          <span>مشاركة</span>
                        </button>
                      </div>
                    </div>

                    {/* Uthmani Quranic Verse Box */}
                    <div className="my-4 rounded-2xl border border-gold/30 bg-muted/30 p-4 sm:p-5">
                      <p
                        className={cn(
                          "quran-verse-text text-right text-foreground",
                          AYAH_FONT_CLASSES[fontSizeLevel]
                        )}
                      >
                        {entry.ayahText}{" "}
                        <span className="font-quran text-[0.75em] text-gold">
                          ﴿{toArabicDigits(entry.ayahNumber)}﴾
                        </span>
                      </p>
                    </div>

                    {/* Optional Word Meanings Box (معاني الكلمات) */}
                    {entry.wordMeaningsText && (
                      <div className="mb-3.5 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                        <p className="mb-1 text-xs font-extrabold text-primary">
                          معاني المفردات وغريب الآية:
                        </p>
                        <p className="whitespace-pre-line text-xs leading-relaxed text-foreground sm:text-sm">
                          {entry.wordMeaningsText}
                        </p>
                      </div>
                    )}

                    {/* Main Tafsir Text */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-extrabold text-primary">
                        {surahTafsir.tafsirMeta.shortTitleAr}:
                      </p>
                      <div
                        className={cn(
                          "whitespace-pre-line text-justify text-foreground/95",
                          TAFSIR_FONT_CLASSES[fontSizeLevel]
                        )}
                      >
                        {entry.tafsirText ||
                          "تفسير هذه الآية متصل بما قبلها في السياق القرآني."}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COMPARE ALL 7 TAFSIRS FOR A SINGLE AYAH */}
      {activeTab === "compare" && (
        <div className="space-y-5">
          {/* Surah & Ayah Selector for Comparison */}
          <div className="rounded-3xl border border-border bg-card p-4 shadow-soft sm:p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div className="space-y-1">
                <h2 className="text-base font-extrabold text-foreground sm:text-lg">
                  مقارنة التفاسير السبعة لآية قرآنية واحدة
                </h2>
                <p className="text-xs text-muted-foreground">
                  اختر السورة ورقم الآية لعرض ومقارنة التفسير الميسر، السعدي، ابن كثير،
                  القرطبي، البغوي، معاني الكلمات، وإعراب القرآن في شاشة واحدة.
                </p>
              </div>

              <div className="flex flex-wrap items-end gap-2.5">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                    السورة:
                  </label>
                  <select
                    aria-label="اختيار السورة للمقارنة"
                    value={compareSurahId}
                    onChange={(e) => {
                      const nextSurah = Number(e.target.value);
                      setCompareSurahId(nextSurah);
                      setCompareAyahNum(1);
                      fetchCompareAyah(nextSurah, 1);
                    }}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-extrabold text-foreground focus:border-primary focus:outline-none"
                  >
                    {SURAHS_META.map((s) => (
                      <option key={s.id} value={s.id}>
                        {toArabicDigits(s.id)}. سورة {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                    رقم الآية:
                  </label>
                  <select
                    aria-label="اختيار الآية للمقارنة"
                    value={compareAyahNum}
                    onChange={(e) => {
                      const nextAyah = Number(e.target.value);
                      setCompareAyahNum(nextAyah);
                      fetchCompareAyah(compareSurahId, nextAyah);
                    }}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-extrabold text-foreground focus:border-primary focus:outline-none"
                  >
                    {Array.from(
                      { length: compareSurahMeta.totalVerses },
                      (_, i) => i + 1
                    ).map((aNum) => (
                      <option key={aNum} value={aNum}>
                        الآية رقم {toArabicDigits(aNum)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={compareAyahNum <= 1 || isCompareLoading}
                    onClick={() => {
                      const prev = Math.max(1, compareAyahNum - 1);
                      setCompareAyahNum(prev);
                      fetchCompareAyah(compareSurahId, prev);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:border-primary disabled:opacity-40"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span>الآية السابقة</span>
                  </button>

                  <button
                    type="button"
                    disabled={
                      compareAyahNum >= compareSurahMeta.totalVerses ||
                      isCompareLoading
                    }
                    onClick={() => {
                      const next = Math.min(
                        compareSurahMeta.totalVerses,
                        compareAyahNum + 1
                      );
                      setCompareAyahNum(next);
                      fetchCompareAyah(compareSurahId, next);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                  >
                    <span>الآية التالية</span>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {isCompareLoading || !compareData ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-card py-16 text-center shadow-soft">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-bold text-muted-foreground">
                جاري جلب التفاسير السبعة للآية الكريمة...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Highlighted Ayah Banner */}
              <div className="rounded-3xl border-2 border-gold/40 bg-card p-5 shadow-soft sm:p-7">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-xl bg-primary px-3.5 py-1 text-xs font-extrabold text-primary-foreground">
                    سورة {compareData.surahName} • الآية{" "}
                    {toArabicDigits(compareData.ayahNumber)}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      handlePlayAyahAudio(
                        compareData.surahId,
                        compareData.ayahNumber
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>
                      استماع للآية بصوت {currentReciter.nameAr}
                    </span>
                  </button>
                </div>

                <p
                  className={cn(
                    "quran-verse-text text-center text-foreground",
                    AYAH_FONT_CLASSES[fontSizeLevel]
                  )}
                >
                  ﴿{compareData.ayahText}﴾{" "}
                  <span className="font-quran text-[0.75em] text-gold">
                    ﴿{toArabicDigits(compareData.ayahNumber)}﴾
                  </span>
                </p>
              </div>

              {/* All 7 Tafsir Explanations Cards */}
              <div className="grid grid-cols-1 gap-4">
                {compareData.comparisons.map(({ bookMeta, text }) => (
                  <article
                    key={bookMeta.slug}
                    className="rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-xl bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground">
                          {bookMeta.shortTitleAr}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground">
                          {bookMeta.authorAr}
                        </span>
                      </div>
                      <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 dark:text-gold">
                        {bookMeta.badgeAr}
                      </span>
                    </div>

                    <div
                      className={cn(
                        "whitespace-pre-line text-justify text-foreground/95",
                        TAFSIR_FONT_CLASSES[fontSizeLevel]
                      )}
                    >
                      {text || "لا يوجد تعليق منفصل لهذه الآية في هذا المصدر."}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ALL 7 TAFSIR BOOKS & 114 SURAHS DIRECTORY */}
      {activeTab === "books" && (
        <div className="space-y-8">
          {/* 7 Tafsir Books Cards */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h2 className="text-lg font-extrabold text-foreground sm:text-xl">
                مكتبة كتب التفسير وعلوم القرآن المعتمدة (٧ مصادر كاملة)
              </h2>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                ١١٤ سورة • ٦,٢٣٦ آية
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {TAFSIR_BOOKS_META.map((book) => (
                <article
                  key={book.slug}
                  className="flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-soft transition hover:border-primary/50"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-gold/20 px-3 py-0.5 text-[11px] font-bold text-amber-900 dark:text-gold">
                        {book.badgeAr}
                      </span>
                      <span className="text-xs font-extrabold text-primary">
                        {book.categoryAr}
                      </span>
                    </div>

                    <h3 className="font-sans text-xl font-extrabold text-foreground">
                      {book.titleAr}
                    </h3>

                    <p className="text-xs font-bold text-primary/90">
                      {book.authorAr}
                    </p>

                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {book.descriptionAr}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3.5">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      شامل لـ ١١٤ سورة
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectTafsirBook(book.slug)}
                        className="inline-flex items-center gap-1 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>قراءة التفسير</span>
                      </button>

                      <Link
                        href={`/tafsir/${book.slug}`}
                        className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:border-primary hover:text-primary"
                      >
                        <span>صفحة الكتاب</span>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* All 114 Surahs Quick Tafsir Index */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h2 className="text-lg font-extrabold text-foreground sm:text-xl">
                فهرس تفسير سور القرآن الكريم (١١٤ سورة)
              </h2>
              <span className="text-xs font-bold text-muted-foreground">
                اضغط على أي سورة لفتح تفسيرها مباشرة
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {SURAHS_META.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectSurah(s.id)}
                  className={cn(
                    "flex items-center justify-between rounded-2xl border p-3 text-right transition hover:-translate-y-0.5 hover:border-primary/50",
                    selectedSurahId === s.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground"
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold sm:text-sm">
                      {toArabicDigits(s.id)}. سورة {s.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {s.typeAr} • {toArabicDigits(s.totalVerses)} آية
                    </p>
                  </div>
                  <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-primary" />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
