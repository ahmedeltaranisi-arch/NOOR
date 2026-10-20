"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Heart,
  LayoutList,
  Moon,
  MoonStar,
  RotateCcw,
  Sparkles,
  Sun,
  Sunrise,
  ZoomIn,
  ZoomOut,
  Layers,
  HeartHandshake,
} from "lucide-react";
import { ADHKAR_CATEGORIES, ADHKAR_DATA } from "@/data/adhkar";
import {
  getAdhkarDailyProgress,
  saveAdhkarDailyProgress,
  STORAGE_CHANGE_EVENT,
} from "@/lib/storage/local-storage";
import { logSpiritualActivity } from "@/lib/storage/indexed-db";
import { getLocalDateKey, toArabicDigits, cn } from "@/lib/utils";
import { AdhkarCategoryId, AdhkarDailyProgress } from "@/types";

const CATEGORY_ICONS: Record<AdhkarCategoryId, React.ElementType> = {
  morning: Sun,
  evening: Moon,
  "after-prayer": CheckCircle2,
  sleep: MoonStar,
  waking: Sunrise,
  general: Sparkles,
  "prophetic-duas": HeartHandshake,
};

export function AdhkarExplorerClient({
  initialCategory = "morning",
  lockedCategory,
}: {
  initialCategory?: AdhkarCategoryId;
  lockedCategory?: AdhkarCategoryId;
}) {
  const [selectedCategory, setSelectedCategory] = useState<
    AdhkarCategoryId | "favorites"
  >(lockedCategory || initialCategory);
  const [progress, setProgress] = useState<AdhkarDailyProgress>(() => ({
    dateKey: getLocalDateKey(),
    counts: {},
    favorites: [],
  }));
  const [sequentialMode, setSequentialMode] = useState(false);
  const [seqIndex, setSeqIndex] = useState(0);
  const [fontSize, setFontSize] = useState<1 | 2 | 3>(2);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setProgress(getAdhkarDailyProgress());

    if (!lockedCategory && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get("cat") as AdhkarCategoryId | null;
      if (cat && ADHKAR_CATEGORIES.some((c) => c.id === cat)) {
        setSelectedCategory(cat);
      }
    }

    const sync = () => setProgress(getAdhkarDailyProgress());
    window.addEventListener(STORAGE_CHANGE_EVENT, sync);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, sync);
  }, [lockedCategory]);

  const items = useMemo(() => {
    if (selectedCategory === "favorites") {
      return ADHKAR_DATA.filter((item) => progress.favorites.includes(item.id));
    }
    return ADHKAR_DATA.filter((item) => item.category === selectedCategory);
  }, [selectedCategory, progress.favorites]);

  const activeCategoryMeta = useMemo(() => {
    if (selectedCategory === "favorites") {
      return {
        id: "favorites",
        titleAr: "الأذكار المفضلة",
        subtitleAr: "الأذكار والأدعية التي اخترتها للوصول السريع",
        recommendedTimeAr: "في جميع الأوقات",
      };
    }
    return (
      ADHKAR_CATEGORIES.find((c) => c.id === selectedCategory) ||
      ADHKAR_CATEGORIES[0]
    );
  }, [selectedCategory]);

  // Overall progress in active category
  const categoryStats = useMemo(() => {
    const totalItems = items.length;
    if (totalItems === 0) {
      return { completedItems: 0, totalItems: 0, percent: 0 };
    }
    const completedItems = items.filter(
      (item) => (progress.counts[item.id] || 0) >= item.count
    ).length;
    return {
      completedItems,
      totalItems,
      percent: Math.round((completedItems / totalItems) * 100),
    };
  }, [items, progress.counts]);

  const updateCount = async (dhikrId: string, targetMax: number, newCount: number) => {
    const clamped = Math.max(0, Math.min(targetMax, newCount));
    const nextProgress: AdhkarDailyProgress = {
      ...progress,
      dateKey: getLocalDateKey(),
      counts: {
        ...progress.counts,
        [dhikrId]: clamped,
      },
    };
    saveAdhkarDailyProgress(nextProgress);
    setProgress(nextProgress);

    // Trigger subtle haptic vibration on mobile if supported
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(clamped === targetMax ? [30, 50, 40] : 15);
      } catch {
        // ignore
      }
    }

    // Auto-advance in sequential mode when completed
    if (sequentialMode && clamped >= targetMax && seqIndex < items.length - 1) {
      setTimeout(() => {
        setSeqIndex((prev) => Math.min(items.length - 1, prev + 1));
      }, 320);
    } else if (!sequentialMode && clamped >= targetMax) {
      // Smooth scroll to next uncompleted dhikr in list mode
      const currentIdx = items.findIndex((i) => i.id === dhikrId);
      if (currentIdx >= 0 && currentIdx < items.length - 1) {
        const nextItem = items[currentIdx + 1];
        const nextEl = document.getElementById(`dhikr-card-${nextItem.id}`);
        if (nextEl) {
          setTimeout(() => {
            nextEl.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 250);
        }
      }
    }

    // Check if entire category just completed
    const allDone =
      items.length > 0 &&
      items.every((item) => (nextProgress.counts[item.id] || 0) >= item.count);
    if (allDone && categoryStats.percent < 100) {
      await logSpiritualActivity({
        dateKey: getLocalDateKey(),
        type: "adhkar-complete",
        titleAr: `إتمام ${activeCategoryMeta.titleAr}`,
        detailsAr: `أتممت جميع أذكار قسم ${activeCategoryMeta.titleAr} (${items.length} ذكر)`,
      });
    }
  };

  const resetCategoryProgress = () => {
    const nextCounts = { ...progress.counts };
    for (const item of items) {
      delete nextCounts[item.id];
    }
    const nextProgress: AdhkarDailyProgress = {
      ...progress,
      counts: nextCounts,
    };
    saveAdhkarDailyProgress(nextProgress);
    setProgress(nextProgress);
    setSeqIndex(0);
  };

  const toggleFavorite = (dhikrId: string) => {
    const exists = progress.favorites.includes(dhikrId);
    const nextFavs = exists
      ? progress.favorites.filter((id) => id !== dhikrId)
      : [...progress.favorites, dhikrId];
    const nextProgress: AdhkarDailyProgress = {
      ...progress,
      favorites: nextFavs,
    };
    saveAdhkarDailyProgress(nextProgress);
    setProgress(nextProgress);
  };

  const handleCopy = async (id: string, text: string, source: string) => {
    try {
      await navigator.clipboard.writeText(`${text}\n[${source}]`);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  const fontSizeClass =
    fontSize === 1
      ? "text-lg leading-loose"
      : fontSize === 2
      ? "text-xl leading-[2.2] sm:text-2xl sm:leading-[2.3]"
      : "text-2xl leading-[2.35] sm:text-3xl sm:leading-[2.45]";

  const currentSequentialItem = items[seqIndex] || items[0];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>حصن المسلم الموثق من القرآن والسنة</span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold text-foreground sm:text-3xl">
              {activeCategoryMeta.titleAr}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {activeCategoryMeta.subtitleAr} • الوقت المستحب:{" "}
              <strong>{activeCategoryMeta.recommendedTimeAr}</strong>
            </p>
          </div>

          {lockedCategory && (
            <Link
              href="/adhkar"
              className="inline-flex items-center gap-1.5 self-start rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold text-foreground hover:border-primary hover:text-primary lg:self-center"
            >
              <ChevronRight className="h-4 w-4" />
              <span>جميع تصنيفات الأذكار والأدعية</span>
            </Link>
          )}
        </div>

        {/* Category Tabs (shown when not locked or as quick switcher) */}
        <div className="mt-6 flex flex-wrap gap-2">
          {ADHKAR_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id] || Sparkles;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSeqIndex(0);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-bold transition-all sm:text-sm",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{cat.titleAr}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setSelectedCategory("favorites");
              setSeqIndex(0);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-bold transition-all sm:text-sm",
              selectedCategory === "favorites"
                ? "border-gold bg-gold text-emerald-950 shadow-sm"
                : "border-border bg-background text-muted-foreground hover:border-gold/50 hover:text-foreground"
            )}
          >
            <Heart className="h-4 w-4" />
            <span>المفضلة ({toArabicDigits(progress.favorites.length)})</span>
          </button>
        </div>

        {/* Category Progress Bar & Controls Toolbar */}
        <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-border/80 bg-muted/35 p-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-foreground">
                التقدم اليومي في {activeCategoryMeta.titleAr}:{" "}
                {toArabicDigits(categoryStats.completedItems)} من{" "}
                {toArabicDigits(categoryStats.totalItems)} ذكر
              </span>
              <span className="text-primary">
                {toArabicDigits(categoryStats.percent)}٪
              </span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-gradient-to-l from-primary to-gold transition-all duration-500"
                style={{ width: `${categoryStats.percent}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sequential vs List View */}
            <button
              type="button"
              onClick={() => {
                setSequentialMode((prev) => !prev);
                setSeqIndex(0);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition",
                sequentialMode
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted"
              )}
            >
              {sequentialMode ? (
                <>
                  <LayoutList className="h-3.5 w-3.5" />
                  <span>عرض القائمة الكاملة</span>
                </>
              ) : (
                <>
                  <Layers className="h-3.5 w-3.5" />
                  <span>وضع القراءة المتتابعة</span>
                </>
              )}
            </button>

            {/* Font Size */}
            <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-2.5 py-1.5">
              <button
                type="button"
                onClick={() => setFontSize((f) => Math.max(1, f - 1) as 1 | 2 | 3)}
                disabled={fontSize <= 1}
                aria-label="تصغير النص"
                className="rounded p-1 text-foreground hover:bg-muted disabled:opacity-40"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="px-1 text-xs font-bold text-primary">حجم الخط</span>
              <button
                type="button"
                onClick={() => setFontSize((f) => Math.min(3, f + 1) as 1 | 2 | 3)}
                disabled={fontSize >= 3}
                aria-label="تكبير النص"
                className="rounded p-1 text-foreground hover:bg-muted disabled:opacity-40"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Reset All */}
            <button
              type="button"
              onClick={resetCategoryProgress}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>تصفير العدادات</span>
            </button>
          </div>
        </div>
      </div>

      {/* Empty Favorites State */}
      {items.length === 0 && (
        <div className="rounded-3xl border border-border bg-card p-12 text-center shadow-soft">
          <Heart className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-3 text-lg font-bold text-foreground">
            لا توجد أذكار في قائمة المفضلة حاليًا
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            اضغط على أيقونة القلب بجانب أي ذكر لإضافته إلى مفضلتك اليومية.
          </p>
        </div>
      )}

      {/* MODE 1: Sequential Focused Reading Mode */}
      {sequentialMode && currentSequentialItem && (
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span>
              الذكر {toArabicDigits(seqIndex + 1)} من {toArabicDigits(items.length)}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSeqIndex((i) => Math.max(0, i - 1))}
                disabled={seqIndex === 0}
                className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-foreground disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
                <span>السابق</span>
              </button>
              <button
                type="button"
                onClick={() => setSeqIndex((i) => Math.min(items.length - 1, i + 1))}
                disabled={seqIndex >= items.length - 1}
                className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-foreground disabled:opacity-40"
              >
                <span>التالي</span>
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>

          {(() => {
            const item = currentSequentialItem;
            const currentCount = progress.counts[item.id] || 0;
            const isDone = currentCount >= item.count;
            const isFav = progress.favorites.includes(item.id);

            return (
              <article className="rounded-3xl border-2 border-primary/30 bg-card p-6 shadow-soft sm:p-8">
                <div className="flex items-center justify-between gap-2 border-b border-border pb-4">
                  <h2 className="text-lg font-extrabold text-primary">
                    {item.titleAr || "ذكر مأثور"}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleFavorite(item.id)}
                      aria-label="إضافة للمفضلة"
                      className={cn(
                        "rounded-xl border p-2 transition",
                        isFav
                          ? "border-gold bg-gold-muted text-gold"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Heart className={cn("h-4 w-4", isFav && "fill-current")} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.id, item.text, item.sourceAr)}
                      className="rounded-xl border border-border p-2 text-muted-foreground hover:text-foreground"
                    >
                      {copiedId === item.id ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <p
                  className={cn(
                    "font-serif my-6 whitespace-pre-line text-foreground",
                    fontSizeClass
                  )}
                >
                  {item.text}
                </p>

                {item.virtueAr && (
                  <div className="rounded-2xl border border-gold/25 bg-gold-muted/30 p-3.5 text-xs leading-relaxed text-foreground">
                    <strong className="text-gold">الفضل والثواب: </strong>
                    {item.virtueAr}
                  </div>
                )}

                <div className="mt-3 text-xs text-muted-foreground">
                  المصدر: {item.sourceAr}{" "}
                  {item.gradeAr && (
                    <span className="mr-2 rounded-full bg-primary/10 px-2 py-0.5 font-bold text-primary">
                      {item.gradeAr}
                    </span>
                  )}
                </div>

                {/* Big Interactive Counter Button */}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => updateCount(item.id, item.count, currentCount + 1)}
                    className={cn(
                      "flex flex-1 items-center justify-between rounded-2xl px-6 py-4 text-base font-extrabold shadow-md transition active:scale-[0.99]",
                      isDone
                        ? "bg-emerald-600 text-white"
                        : "bg-primary text-primary-foreground hover:bg-primary/95"
                    )}
                  >
                    <span>
                      {isDone
                        ? "اكتمل الذكر بحمد الله"
                        : "اضغط للتسبيح والعد التفاعلي"}
                    </span>
                    <span className="rounded-xl bg-black/20 px-4 py-1 text-xl">
                      {toArabicDigits(currentCount)} / {toArabicDigits(item.count)}
                    </span>
                  </button>

                  {!isDone && item.count > 1 && (
                    <button
                      type="button"
                      onClick={() => updateCount(item.id, item.count, item.count)}
                      className="rounded-2xl border border-border bg-secondary px-4 py-4 text-xs font-bold text-secondary-foreground hover:bg-secondary/80"
                    >
                      إتمام الكل ({toArabicDigits(item.count)})
                    </button>
                  )}

                  {currentCount > 0 && (
                    <button
                      type="button"
                      onClick={() => updateCount(item.id, item.count, 0)}
                      aria-label="إعادة عداد هذا الذكر"
                      className="rounded-2xl border border-border bg-background px-4 py-4 text-xs font-bold text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="mx-auto h-4 w-4" />
                    </button>
                  )}
                </div>
              </article>
            );
          })()}
        </div>
      )}

      {/* MODE 2: Full List View */}
      {!sequentialMode && items.length > 0 && (
        <div className="space-y-4">
          {items.map((item, idx) => {
            const currentCount = progress.counts[item.id] || 0;
            const isDone = currentCount >= item.count;
            const itemPercent = Math.min(
              100,
              Math.round((currentCount / item.count) * 100)
            );
            const isFav = progress.favorites.includes(item.id);

            return (
              <article
                key={item.id}
                id={`dhikr-card-${item.id}`}
                className={cn(
                  "scroll-mt-24 rounded-3xl border p-6 transition-all",
                  isDone
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-border bg-card shadow-soft"
                )}
              >
                {/* Card Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-xl text-xs font-extrabold",
                        isDone
                          ? "bg-emerald-600 text-white"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {toArabicDigits(idx + 1)}
                    </span>
                    <h2 className="text-base font-extrabold text-foreground sm:text-lg">
                      {item.titleAr || `الذكر ${toArabicDigits(idx + 1)}`}
                    </h2>
                    <span className="rounded-full border border-gold/30 bg-gold-muted px-2.5 py-0.5 text-xs font-bold text-gold">
                      التكرار: {toArabicDigits(item.count)}{" "}
                      {item.count === 1 ? "مرة" : item.count <= 10 ? "مرات" : "مرة"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleFavorite(item.id)}
                      aria-label={isFav ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
                      className={cn(
                        "rounded-xl border p-2 transition",
                        isFav
                          ? "border-gold bg-gold-muted text-gold"
                          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Heart className={cn("h-4 w-4", isFav && "fill-current")} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(item.id, item.text, item.sourceAr)}
                      aria-label="نسخ الذكر"
                      className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {copiedId === item.id ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Vocalized Dhikr Text */}
                <p
                  onClick={() => {
                    if (!isDone) updateCount(item.id, item.count, currentCount + 1);
                  }}
                  className={cn(
                    "font-serif my-5 cursor-pointer whitespace-pre-line text-foreground",
                    fontSizeClass
                  )}
                >
                  {item.text}
                </p>

                {/* Virtue & Source */}
                {item.virtueAr && (
                  <div className="mb-3 rounded-2xl border border-border/80 bg-background/60 p-3.5 text-xs leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">الفضل: </strong>
                    {item.virtueAr}
                  </div>
                )}

                <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>المصدر: {item.sourceAr}</span>
                  {item.gradeAr && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-bold text-primary">
                      {item.gradeAr}
                    </span>
                  )}
                </div>

                {/* Progress Bar & Interactive Counter Controls */}
                <div className="space-y-3 border-t border-border/60 pt-4">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        isDone ? "bg-emerald-600" : "bg-primary"
                      )}
                      style={{ width: `${itemPercent}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => updateCount(item.id, item.count, currentCount + 1)}
                      disabled={isDone}
                      className={cn(
                        "inline-flex flex-1 items-center justify-between rounded-2xl px-5 py-3 text-sm font-extrabold transition active:scale-[0.99]",
                        isDone
                          ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-300"
                          : "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                      )}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {isDone ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            <span>تم إتمام التكرار بحمد الله</span>
                          </>
                        ) : (
                          <span>اضغط للعد ({toArabicDigits(item.count - currentCount)} متبقي)</span>
                        )}
                      </span>
                      <span className="rounded-xl bg-black/15 px-3 py-0.5 text-base font-extrabold">
                        {toArabicDigits(currentCount)} / {toArabicDigits(item.count)}
                      </span>
                    </button>

                    {!isDone && item.count > 1 && (
                      <button
                        type="button"
                        onClick={() => updateCount(item.id, item.count, item.count)}
                        className="rounded-2xl border border-border bg-secondary px-4 py-3 text-xs font-bold text-secondary-foreground hover:bg-secondary/80"
                      >
                        إتمام ({toArabicDigits(item.count)})
                      </button>
                    )}

                    {currentCount > 0 && (
                      <button
                        type="button"
                        onClick={() => updateCount(item.id, item.count, 0)}
                        aria-label="إعادة ضبط العداد"
                        title="إعادة ضبط العداد"
                        className="rounded-2xl border border-border bg-background p-3 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
