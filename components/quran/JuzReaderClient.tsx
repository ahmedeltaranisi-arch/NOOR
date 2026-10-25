"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlignJustify,
  Bookmark,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Layers,
  LayoutList,
  Share2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  DEFAULT_QURAN_PREFS,
  getDailyWird,
  getLastReadPosition,
  getQuranBookmarks,
  getQuranPrefs,
  QuranReaderPrefs,
  saveDailyWird,
  saveLastReadPosition,
  saveQuranPrefs,
  toggleQuranBookmark,
} from "@/lib/storage/local-storage";
import { logSpiritualActivity } from "@/lib/storage/indexed-db";
import { getLocalDateKey, toArabicDigits, cn } from "@/lib/utils";
import {
  JuzDetail,
  JuzMeta,
  LastReadPosition,
  QuranBookmark,
} from "@/types";

const FONT_SIZE_CLASSES: Record<1 | 2 | 3 | 4, string> = {
  1: "text-xl leading-[2.25]",
  2: "text-2xl leading-[2.35] sm:text-3xl sm:leading-[2.4]",
  3: "text-3xl leading-[2.45] sm:text-4xl sm:leading-[2.5]",
  4: "text-4xl leading-[2.55] sm:text-5xl sm:leading-[2.6]",
};

export function JuzReaderClient({
  juz,
  allJuzs,
  prevJuz,
  nextJuz,
}: {
  juz: JuzDetail;
  allJuzs: JuzMeta[];
  prevJuz?: JuzMeta;
  nextJuz?: JuzMeta;
}) {
  const router = useRouter();
  const [prefs, setPrefs] = useState<QuranReaderPrefs>(DEFAULT_QURAN_PREFS);
  const [bookmarks, setBookmarks] = useState<QuranBookmark[]>([]);
  const [lastRead, setLastRead] = useState<LastReadPosition | null>(null);
  const [selectedRef, setSelectedRef] = useState<{
    surahId: number;
    surahName: string;
    ayahNumber: number;
    text: string;
  }>(() => {
    const firstSeg = juz.segments[0];
    const firstVerse = firstSeg?.verses[0];
    return {
      surahId: firstSeg?.surahId || 1,
      surahName: firstSeg?.surahName || "الفاتحة",
      ayahNumber: firstVerse?.id || 1,
      text: firstVerse?.text || "",
    };
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [juzCompletedToday, setJuzCompletedToday] = useState(false);

  useEffect(() => {
    setPrefs(getQuranPrefs());
    setBookmarks(getQuranBookmarks());
    setLastRead(getLastReadPosition());
  }, [juz.id]);

  const updatePrefs = (partial: Partial<QuranReaderPrefs>) => {
    const updated = { ...prefs, ...partial };
    setPrefs(updated);
    saveQuranPrefs(updated);
  };

  const showToast = (msg: string) => {
    setSavedToast(msg);
    setTimeout(() => setSavedToast(null), 3200);
  };

  const handleSaveLastRead = (
    surahId: number,
    surahName: string,
    ayahNum: number
  ) => {
    const pos: LastReadPosition = {
      surahId,
      surahName,
      ayahNumber: ayahNum,
      updatedAt: new Date().toISOString(),
    };
    saveLastReadPosition(pos);
    setLastRead(pos);
    showToast(
      `تم حفظ موضع القراءة: ${juz.nameAr} (سورة ${surahName} - الآية ${toArabicDigits(
        ayahNum
      )})`
    );
  };

  const handleToggleBookmark = (
    surahId: number,
    surahName: string,
    ayahNum: number,
    ayahText: string
  ) => {
    const res = toggleQuranBookmark({
      surahId,
      surahName,
      ayahNumber: ayahNum,
      ayahSnippet: ayahText,
    });
    setBookmarks(res.bookmarks);
    showToast(
      res.added
        ? `تمت إضافة الآية ${toArabicDigits(ayahNum)} من سورة ${surahName} إلى العلامات المرجعية`
        : `تمت إزالة الآية من العلامات المرجعية`
    );
  };

  const handleCopyAyah = async (
    surahId: number,
    surahName: string,
    ayahNum: number,
    ayahText: string
  ) => {
    const formatted = `﴿${ayahText}﴾ [سورة ${surahName}: ${ayahNum}]`;
    const key = `${surahId}:${ayahNum}`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleShareAyah = async (
    surahId: number,
    surahName: string,
    ayahNum: number,
    ayahText: string
  ) => {
    const formatted = `﴿${ayahText}﴾ [سورة ${surahName}: ${ayahNum}]`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${juz.nameAr} — سورة ${surahName} (${ayahNum})`,
          text: formatted,
        });
        return;
      } catch {
        // fallback to copy
      }
    }
    await handleCopyAyah(surahId, surahName, ayahNum, ayahText);
  };

  const handleCompleteJuzReading = async () => {
    const lastSeg = juz.segments[juz.segments.length - 1];
    if (lastSeg) {
      handleSaveLastRead(lastSeg.surahId, lastSeg.surahName, lastSeg.endAyah);
    }

    const wird = getDailyWird();
    const todayKey = getLocalDateKey();
    const addAmount =
      wird.unit === "juz" ? 1 : wird.unit === "pages" ? 20 : juz.totalVersesInJuz;
    const nextProgress = wird.currentProgressToday + addAmount;
    const completed = nextProgress >= wird.dailyTarget;

    saveDailyWird({
      ...wird,
      currentProgressToday: nextProgress,
      lastUpdatedDate: todayKey,
      completedDates: completed
        ? Array.from(new Set([...wird.completedDates, todayKey]))
        : wird.completedDates,
      history: {
        ...wird.history,
        [todayKey]: {
          target: wird.dailyTarget,
          unit: wird.unit,
          completedAmount: nextProgress,
          completed,
        },
      },
    });

    setJuzCompletedToday(true);
    await logSpiritualActivity({
      dateKey: todayKey,
      type: "quran-wird",
      titleAr: `إتمام قراءة ${juz.nameAr}`,
      detailsAr: `تمت قراءة ${juz.nameAr} (${juz.titleAr}) كاملًا بحمد الله`,
    });
    showToast(`تقبل الله منك! تم تسجيل قراءة ${juz.nameAr} في وردك اليومي.`);
  };

  const isBookmarked = (surahId: number, ayahNum: number) =>
    bookmarks.some((b) => b.id === `${surahId}:${ayahNum}`);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {savedToast && (
        <div
          role="status"
          className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-gold/40 bg-emerald-950 px-4 py-3 text-center text-xs font-bold text-white shadow-gold md:bottom-8"
        >
          {savedToast}
        </div>
      )}

      {/* Top Breadcrumb & Juz Header Card */}
      <div className="rounded-3xl border border-border bg-card p-4 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border pb-3.5 sm:gap-3 sm:pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/quran?tab=juz"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:border-primary hover:text-primary sm:px-3.5"
            >
              <ChevronRight className="h-4 w-4" />
              <span>فهرس أجزاء القرآن (٣٠ جزءًا)</span>
            </Link>

            <span className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/15 px-3 py-1.5 text-[11px] font-extrabold text-gold">
              <BookOpen className="h-3.5 w-3.5" />
              <span>وضع القراءة فقط</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground sm:gap-2 sm:text-xs">
            <span>
              من ص {toArabicDigits(juz.pageStart)} إلى ص {toArabicDigits(juz.pageEnd)}
            </span>
            <span>•</span>
            <span>{toArabicDigits(juz.totalVersesInJuz)} آية</span>
            <span>•</span>
            <span>{toArabicDigits(juz.segments.length)} سور</span>
          </div>
        </div>

        {/* Ornate Juz Banner */}
        <div className="my-4 flex flex-col items-center justify-center gap-3 rounded-2xl border border-gold/30 bg-gradient-to-l from-primary via-emerald-900 to-primary px-4 py-6 text-center text-white shadow-inner sm:my-5 sm:gap-3.5 sm:px-6 sm:py-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-black/20 px-3.5 py-1 text-xs font-bold text-gold">
            <span>الجزء رقم {toArabicDigits(juz.id)} من ٣٠</span>
            <span>•</span>
            <span>مطلع الجزء: «{juz.titleAr}»</span>
          </div>

          <h1 className="font-serif py-1 text-3xl font-bold leading-[1.7] text-white sm:text-5xl sm:leading-[1.7]">
            {juz.nameAr}
          </h1>

          <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-emerald-50">
            <span>
              يبدأ من سورة {juz.startSurahName} (آية {toArabicDigits(juz.startAyah)})
            </span>
            <span>←</span>
            <span>
              ينتهي عند سورة {juz.endSurahName} (آية {toArabicDigits(juz.endAyah)})
            </span>
          </div>
        </div>

        {/* Pure Reading Controls Toolbar: View Mode, Font Size, Quick Juz Selector */}
        <div className="flex flex-col justify-between gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-start sm:gap-3">
            {/* Continuous Mushaf vs Verse Cards */}
            <div className="inline-flex rounded-xl border border-border bg-muted/50 p-1">
              <button
                type="button"
                onClick={() => updatePrefs({ viewMode: "mushaf" })}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-bold transition sm:px-3",
                  prefs.viewMode === "mushaf"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <AlignJustify className="h-3.5 w-3.5" />
                <span>المصحف المتصل</span>
              </button>
              <button
                type="button"
                onClick={() => updatePrefs({ viewMode: "cards" })}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-bold transition sm:px-3",
                  prefs.viewMode === "cards"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span>آية بآية</span>
              </button>
            </div>

            {/* Font Size Controls */}
            <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-2.5 py-1.5 sm:gap-1.5 sm:px-3">
              <span className="text-xs font-semibold text-muted-foreground">حجم الخط:</span>
              <button
                type="button"
                onClick={() =>
                  updatePrefs({
                    fontSizeLevel: Math.max(1, prefs.fontSizeLevel - 1) as 1 | 2 | 3 | 4,
                  })
                }
                disabled={prefs.fontSizeLevel <= 1}
                aria-label="تصغير الخط القرآني"
                className="rounded-lg p-1 text-foreground hover:bg-muted disabled:opacity-40"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="min-w-[20px] text-center text-xs font-bold text-primary">
                {toArabicDigits(prefs.fontSizeLevel)}
              </span>
              <button
                type="button"
                onClick={() =>
                  updatePrefs({
                    fontSizeLevel: Math.min(4, prefs.fontSizeLevel + 1) as 1 | 2 | 3 | 4,
                  })
                }
                disabled={prefs.fontSizeLevel >= 4}
                aria-label="تكبير الخط القرآني"
                className="rounded-lg p-1 text-foreground hover:bg-muted disabled:opacity-40"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Jump to Any of the 30 Juzs */}
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 shrink-0 text-primary" />
            <label htmlFor="juz-quick-select" className="text-xs font-bold text-muted-foreground">
              انتقال لجزء:
            </label>
            <select
              id="juz-quick-select"
              value={juz.id}
              onChange={(e) => router.push(`/quran/juz/${e.target.value}`)}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground focus:border-primary focus:outline-none sm:flex-initial"
            >
              {allJuzs.map((item) => (
                <option key={item.id} value={item.id}>
                  {toArabicDigits(item.id)}. {item.nameAr} ({item.titleAr})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Selected Ayah Reading Bar (in Mushaf continuous mode — Pure Reading Tools Only) */}
      {prefs.viewMode === "mushaf" && selectedRef && (
        <div className="sticky top-[58px] z-30 flex flex-col gap-2.5 rounded-2xl border border-gold/40 bg-card/95 p-3 shadow-md backdrop-blur-md sm:top-[72px] sm:px-4 sm:py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <span className="shrink-0 rounded-xl bg-primary/15 px-3 py-1.5 text-xs font-extrabold text-primary">
              سورة {selectedRef.surahName} • آية {toArabicDigits(selectedRef.ayahNumber)}
            </span>
            <p className="quran-verse-text min-w-0 flex-1 py-0.5 text-base leading-[2.15] text-foreground sm:text-lg">
              ﴿
              {selectedRef.text.split(/\s+/).length > 10
                ? `${selectedRef.text.split(/\s+/).slice(0, 10).join(" ")} ...`
                : selectedRef.text}
              ﴾
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                handleSaveLastRead(
                  selectedRef.surahId,
                  selectedRef.surahName,
                  selectedRef.ayahNumber
                )
              }
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>حفظ موضع القراءة</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleToggleBookmark(
                  selectedRef.surahId,
                  selectedRef.surahName,
                  selectedRef.ayahNumber,
                  selectedRef.text
                )
              }
              className={cn(
                "inline-flex items-center gap-1 whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-bold transition",
                isBookmarked(selectedRef.surahId, selectedRef.ayahNumber)
                  ? "border-gold bg-gold-muted text-gold"
                  : "border-border bg-background text-foreground hover:bg-muted"
              )}
            >
              <Bookmark className="h-3.5 w-3.5" />
              <span>
                {isBookmarked(selectedRef.surahId, selectedRef.ayahNumber)
                  ? "محفوظة بالمرجعية"
                  : "علامة مرجعية"}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleCopyAyah(
                  selectedRef.surahId,
                  selectedRef.surahName,
                  selectedRef.ayahNumber,
                  selectedRef.text
                )
              }
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              {copiedKey === `${selectedRef.surahId}:${selectedRef.ayahNumber}` ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>نسخ</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleShareAyah(
                  selectedRef.surahId,
                  selectedRef.surahName,
                  selectedRef.ayahNumber,
                  selectedRef.text
                )
              }
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>مشاركة</span>
            </button>
          </div>
        </div>
      )}

      {/* JUZ SEGMENTS (Surahs within this Juz) */}
      <div className="space-y-6">
        {juz.segments.map((seg) => (
          <section
            key={`${juz.id}-surah-${seg.surahId}`}
            aria-label={`سورة ${seg.surahName} في ${juz.nameAr}`}
            className="space-y-4"
          >
            {/* Surah Segment Header Banner */}
            <div className="flex flex-col items-center justify-between gap-2 rounded-2xl border border-gold/35 bg-gradient-to-l from-primary/10 via-gold/10 to-primary/10 px-4 py-3.5 sm:flex-row sm:px-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-extrabold text-primary-foreground">
                  {toArabicDigits(seg.surahId)}
                </span>
                <div>
                  <h2 className="font-quran text-xl font-bold text-foreground sm:text-2xl">
                    سُورَةُ {seg.surahName}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {seg.surahTypeAr} • الآيات في هذا الجزء: من{" "}
                    {toArabicDigits(seg.startAyah)} إلى {toArabicDigits(seg.endAyah)} (من أصل{" "}
                    {toArabicDigits(seg.totalSurahVerses)} آية)
                  </p>
                </div>
              </div>

              <Link
                href={`/quran/${seg.surahId}`}
                className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-primary transition hover:border-primary"
              >
                <span>فتح السورة كاملة</span>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Bismillah Banner if Surah starts at verse 1 (except Al-Fatihah & At-Tawbah) */}
            {seg.showBismillah && (
              <div className="rounded-2xl border border-gold/25 bg-card py-4 text-center shadow-sm">
                <p className="font-quran text-2xl font-bold text-primary sm:text-3xl">
                  بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
                </p>
              </div>
            )}

            {/* MODE 1: Continuous Mushaf View */}
            {prefs.viewMode === "mushaf" ? (
              <article className="rounded-3xl border-2 border-gold/30 bg-card p-5 shadow-soft sm:p-8 md:p-10">
                <div
                  className={cn(
                    "quran-verse-text text-justify text-foreground",
                    FONT_SIZE_CLASSES[prefs.fontSizeLevel]
                  )}
                >
                  {seg.verses.map((verse) => {
                    const isSelected =
                      selectedRef.surahId === seg.surahId &&
                      selectedRef.ayahNumber === verse.id;
                    const isSavedPos =
                      lastRead?.surahId === seg.surahId &&
                      lastRead?.ayahNumber === verse.id;

                    return (
                      <span
                        key={`${seg.surahId}:${verse.id}`}
                        id={`surah-${seg.surahId}-ayah-${verse.id}`}
                        onClick={() =>
                          setSelectedRef({
                            surahId: seg.surahId,
                            surahName: seg.surahName,
                            ayahNumber: verse.id,
                            text: verse.text,
                          })
                        }
                        className={cn(
                          "inline cursor-pointer rounded-xl px-1.5 py-0.5 transition-colors",
                          isSelected
                            ? "bg-gold-muted/70 text-foreground"
                            : isSavedPos
                            ? "underline decoration-gold decoration-2 underline-offset-8"
                            : "hover:bg-muted/70"
                        )}
                      >
                        <span>{verse.text} </span>
                        <span
                          className="mx-1 inline-flex select-none items-center justify-center font-quran text-[0.75em] font-bold text-gold"
                          title={`سورة ${seg.surahName} - الآية ${verse.id}`}
                        >
                          ﴿{toArabicDigits(verse.id)}﴾
                        </span>{" "}
                      </span>
                    );
                  })}
                </div>
              </article>
            ) : (
              /* MODE 2: Verse-by-Verse Reading Cards (No Audio) */
              <div className="space-y-3.5">
                {seg.verses.map((verse) => {
                  const isSavedPos =
                    lastRead?.surahId === seg.surahId &&
                    lastRead?.ayahNumber === verse.id;
                  const bookmarked = isBookmarked(seg.surahId, verse.id);
                  const copyKey = `${seg.surahId}:${verse.id}`;

                  return (
                    <article
                      key={copyKey}
                      id={`surah-${seg.surahId}-ayah-${verse.id}`}
                      className={cn(
                        "rounded-3xl border p-4 transition-all sm:p-6",
                        isSavedPos
                          ? "border-gold bg-gold-muted/20"
                          : "border-border bg-card shadow-soft"
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-xs font-extrabold text-primary">
                            {toArabicDigits(verse.id)}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground">
                            سورة {seg.surahName} • الآية {toArabicDigits(verse.id)}
                          </span>
                          {isSavedPos && (
                            <span className="rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold text-emerald-950">
                              آخر موضع قراءة
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleSaveLastRead(
                                seg.surahId,
                                seg.surahName,
                                verse.id
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-xl border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>حفظ الموضع</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleToggleBookmark(
                                seg.surahId,
                                seg.surahName,
                                verse.id,
                                verse.text
                              )
                            }
                            className={cn(
                              "inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-medium",
                              bookmarked
                                ? "border-gold bg-gold-muted text-gold"
                                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <Bookmark className="h-3.5 w-3.5" />
                            <span>{bookmarked ? "محفوظة" : "مرجعية"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleCopyAyah(
                                seg.surahId,
                                seg.surahName,
                                verse.id,
                                verse.text
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-xl border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            {copiedKey === copyKey ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            <span>نسخ</span>
                          </button>
                        </div>
                      </div>

                      <p
                        className={cn(
                          "quran-verse-text mt-4 text-right text-foreground",
                          FONT_SIZE_CLASSES[prefs.fontSizeLevel]
                        )}
                      >
                        {verse.text}{" "}
                        <span className="font-quran text-[0.75em] text-gold">
                          ﴿{toArabicDigits(verse.id)}﴾
                        </span>
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Previous & Next Juz Navigation + Complete Juz Button */}
      <div className="flex flex-col items-center justify-between gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:p-5">
        {prevJuz ? (
          <Link
            href={`/quran/juz/${prevJuz.id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-5 py-3 text-xs font-bold text-foreground transition hover:border-primary hover:text-primary sm:w-auto sm:text-sm"
          >
            <ChevronRight className="h-4 w-4" />
            <span>الجزء السابق: {prevJuz.nameAr}</span>
          </Link>
        ) : (
          <div className="hidden sm:block" />
        )}

        <button
          type="button"
          onClick={handleCompleteJuzReading}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-xs font-extrabold transition sm:w-auto sm:text-sm",
            juzCompletedToday
              ? "bg-emerald-600 text-white"
              : "bg-gold text-emerald-950 shadow-gold hover:bg-gold/90"
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>
            {juzCompletedToday
              ? `تم تسجيل قراءة ${juz.nameAr} بحمد الله`
              : `إتمام قراءة ${juz.nameAr} وتسجيله بالورد`}
          </span>
        </button>

        {nextJuz ? (
          <Link
            href={`/quran/juz/${nextJuz.id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 sm:w-auto sm:text-sm"
          >
            <span>الجزء التالي: {nextJuz.nameAr}</span>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <Link
            href="/quran/juz/1"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-bold text-primary-foreground sm:w-auto sm:text-sm"
          >
            <span>العودة إلى الجزء الأول (ختمة جديدة)</span>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
