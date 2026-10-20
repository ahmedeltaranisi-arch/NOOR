"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Flame,
  Plus,
  RotateCcw,
} from "lucide-react";
import {
  DEFAULT_DAILY_WIRD,
  getDailyWird,
  getLastReadPosition,
  saveDailyWird,
  STORAGE_CHANGE_EVENT,
} from "@/lib/storage/local-storage";
import { logSpiritualActivity } from "@/lib/storage/indexed-db";
import { getLocalDateKey, toArabicDigits, cn } from "@/lib/utils";
import { DailyWirdSettings, LastReadPosition, WirdUnit } from "@/types";

const UNIT_LABELS: Record<WirdUnit, string> = {
  pages: "صفحات",
  ayahs: "آيات",
  juz: "أجزاء",
};

export function DashboardWirdCard() {
  const [wird, setWird] = useState<DailyWirdSettings>(DEFAULT_DAILY_WIRD);
  const [lastRead, setLastRead] = useState<LastReadPosition | null>(null);

  useEffect(() => {
    setWird(getDailyWird());
    setLastRead(getLastReadPosition());

    const sync = () => {
      setWird(getDailyWird());
      setLastRead(getLastReadPosition());
    };

    window.addEventListener(STORAGE_CHANGE_EVENT, sync);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, sync);
  }, []);

  const todayKey = getLocalDateKey();
  const isCompletedToday =
    wird.currentProgressToday >= wird.dailyTarget ||
    wird.completedDates.includes(todayKey);

  const progressPercent = Math.min(
    100,
    Math.round((wird.currentProgressToday / Math.max(1, wird.dailyTarget)) * 100)
  );

  const handleUpdateProgress = async (newAmount: number) => {
    const clamped = Math.max(0, newAmount);
    const completed = clamped >= wird.dailyTarget;
    const completedDates = completed
      ? Array.from(new Set([...wird.completedDates, todayKey]))
      : wird.completedDates.filter((d) => d !== todayKey);

    const updated: DailyWirdSettings = {
      ...wird,
      currentProgressToday: clamped,
      lastUpdatedDate: todayKey,
      completedDates,
      history: {
        ...wird.history,
        [todayKey]: {
          target: wird.dailyTarget,
          unit: wird.unit,
          completedAmount: clamped,
          completed,
        },
      },
    };

    saveDailyWird(updated);
    setWird(updated);

    if (completed && ! isCompletedToday) {
      await logSpiritualActivity({
        dateKey: todayKey,
        type: "quran-wird",
        titleAr: "إتمام ورد القرآن اليومي",
        detailsAr: `أتممت ${wird.dailyTarget} ${UNIT_LABELS[wird.unit]} بحمد الله`,
      });
    }
  };

  return (
    <div className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-soft">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">ورد القرآن اليومي</h2>
              <p className="text-xs text-muted-foreground">
                الهدف اليومي: {toArabicDigits(wird.dailyTarget)} {UNIT_LABELS[wird.unit]}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1 rounded-xl border border-gold/30 bg-gold-muted px-3 py-1 text-xs font-bold text-gold">
            <Flame className="h-3.5 w-3.5" />
            <span>{toArabicDigits(wird.completedDates.length)} يوم مكتمل</span>
          </div>
        </div>

        {/* Progress Bar & Status */}
        <div className="mt-5 rounded-2xl border border-border/80 bg-muted/35 p-4">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-foreground">
              الإنجاز اليومي: {toArabicDigits(wird.currentProgressToday)} من{" "}
              {toArabicDigits(wird.dailyTarget)} {UNIT_LABELS[wird.unit]}
            </span>
            <span
              className={cn(
                "font-bold",
                isCompletedToday ? "text-emerald-600 dark:text-emerald-400" : "text-primary"
              )}
            >
              {toArabicDigits(progressPercent)}٪
            </span>
          </div>

          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isCompletedToday
                  ? "bg-emerald-600"
                  : "bg-gradient-to-l from-primary to-gold"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleUpdateProgress(wird.currentProgressToday + 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground transition hover:border-primary hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>إضافة +١</span>
            </button>

            <button
              type="button"
              onClick={() => handleUpdateProgress(wird.dailyTarget)}
              disabled={isCompletedToday}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition",
                isCompletedToday
                  ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{isCompletedToday ? "اكتمل ورد اليوم بحمد الله" : "تسجيل الورد كمكتمل"}</span>
            </button>

            {wird.currentProgressToday > 0 && (
              <button
                type="button"
                onClick={() => handleUpdateProgress(0)}
                aria-label="إعادة ضبط تقدم اليوم"
                title="إعادة ضبط تقدم اليوم"
                className="rounded-xl border border-border bg-card p-1.5 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Last Read Position */}
        <div className="mt-4 rounded-2xl border border-border/70 bg-background/60 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground">
                آخر موضع قراءة محفوظ
              </span>
              <p className="mt-0.5 text-sm font-bold text-foreground">
                {lastRead
                  ? `سورة ${lastRead.surahName} • الآية ${toArabicDigits(lastRead.ayahNumber)}`
                  : "سورة الفاتحة • الآية ١ (ابدأ ختمتك)"}
              </p>
            </div>
            <Link
              href={
                lastRead
                  ? `/quran/${lastRead.surahId}#ayah-${lastRead.ayahNumber}`
                  : "/quran/1"
              }
              className="inline-flex items-center gap-1 rounded-xl bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground transition hover:bg-primary hover:text-primary-foreground"
            >
              <span>متابعة التلاوة</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
        <Link
          href="/quran#wird-settings"
          className="font-semibold text-primary hover:underline"
        >
          تعديل هدف الورد اليومي والأسبوعي
        </Link>
        <Link
          href="/quran"
          className="inline-flex items-center gap-1 font-bold text-foreground hover:text-primary"
        >
          <span>فهرس السور (١١٤)</span>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
