"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Check,
  Copy,
  HeartHandshake,
  MessageSquareQuote,
  Share2,
  Sparkles,
} from "lucide-react";
import { DailyInspirationContent } from "@/types";
import { toArabicDigits } from "@/lib/utils";

export function DailyInspirationSection({
  content,
}: {
  content: DailyInspirationContent;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleShare = async (title: string, textToShare: string) => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: textToShare });
        return;
      } catch {
        // fallback to copy
      }
    }
    await handleCopy(title, textToShare);
  };

  return (
    <section aria-label="المحتوى الإيماني اليومي الموثق" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">
            نفحات إيمانية يومية موثقة
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            آية وحديث وذكر ودعاء مختارة من القرآن الكريم وصحاح السنة النبوية
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* 1. Daily Quranic Ayah */}
        <article className="flex flex-col justify-between rounded-3xl border border-gold/30 bg-card p-6 shadow-soft">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-muted px-3 py-1 text-xs font-bold text-gold">
                <BookOpen className="h-3.5 w-3.5" />
                <span>آية اليوم</span>
              </span>
              <span className="text-xs font-bold text-primary">
                سورة {content.ayah.surahName} • الآية {toArabicDigits(content.ayah.ayahNumber)}
              </span>
            </div>

            <blockquote className="quran-verse-text my-5 rounded-2xl border border-border/60 bg-background/70 p-5 text-center text-xl text-foreground sm:text-2xl">
              ﴿{content.ayah.text}﴾
              <span className="mr-2 inline-block text-base text-gold">
                ﴿{toArabicDigits(content.ayah.ayahNumber)}﴾
              </span>
            </blockquote>

            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              <strong className="text-foreground">وقفة تدبرية: </strong>
              {content.ayah.reflectionAr}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3.5">
            <Link
              href={`/quran/${content.ayah.surahId}#ayah-${content.ayah.ayahNumber}`}
              className="text-xs font-bold text-primary hover:underline"
            >
              قراءة السورة كاملة في المصحف ←
            </Link>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    "ayah",
                    `﴿${content.ayah.text}﴾ [سورة ${content.ayah.surahName}: ${content.ayah.ayahNumber}]`
                  )
                }
                className="inline-flex items-center gap-1 rounded-xl border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {copiedId === "ayah" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>نسخ</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() =>
                  handleShare(
                    `آية اليوم - سورة ${content.ayah.surahName}`,
                    `﴿${content.ayah.text}﴾ [سورة ${content.ayah.surahName}: ${content.ayah.ayahNumber}]`
                  )
                }
                className="inline-flex items-center gap-1 rounded-xl border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>مشاركة</span>
              </button>
            </div>
          </div>
        </article>

        {/* 2. Daily Authentic Hadith */}
        <article className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                <MessageSquareQuote className="h-3.5 w-3.5" />
                <span>حديث نبوي شريف</span>
              </span>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                درجة الصحة: {content.hadith.gradeAr}
              </span>
            </div>

            <div className="my-5 rounded-2xl border border-border/60 bg-background/70 p-5">
              <p className="text-xs font-medium text-muted-foreground">
                عن {content.hadith.narratorAr} أن رسول الله ﷺ قال:
              </p>
              <blockquote className="font-serif mt-2 text-lg font-bold leading-loose text-foreground sm:text-xl">
                «{content.hadith.text}»
              </blockquote>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              <strong className="text-foreground">من فوائد الحديث: </strong>
              {content.hadith.explanationAr}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3.5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground">
                المصدر: {content.hadith.sourceAr}
              </span>
              <Link
                href="/hadith"
                className="text-xs font-bold text-primary hover:underline"
              >
                موسوعة الأحاديث الكاملة (٥٠,٧٥٩ حديث) ←
              </Link>
            </div>
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  "hadith",
                  `قال رسول الله ﷺ: «${content.hadith.text}» (${content.hadith.sourceAr} - ${content.hadith.gradeAr})`
                )
              }
              className="inline-flex items-center gap-1 rounded-xl border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {copiedId === "hadith" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>نسخ الحديث</span>
                </>
              )}
            </button>
          </div>
        </article>

        {/* 3. Daily Dhikr */}
        <article className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>ذكر اليوم</span>
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {content.dhikr.sourceAr}
              </span>
            </div>

            <p className="font-serif my-4 text-lg font-bold leading-loose text-foreground">
              {content.dhikr.text}
            </p>
            <p className="text-xs text-muted-foreground">{content.dhikr.virtueAr}</p>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
            <Link href="/tasbeeh" className="text-xs font-bold text-primary hover:underline">
              الانتقال للمسبحة الإلكترونية ←
            </Link>
            <button
              type="button"
              onClick={() => handleCopy("dhikr", content.dhikr.text)}
              className="inline-flex items-center gap-1 rounded-xl border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {copiedId === "dhikr" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedId === "dhikr" ? "تم النسخ" : "نسخ"}</span>
            </button>
          </div>
        </article>

        {/* 4. Daily Dua */}
        <article className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-muted px-3 py-1 text-xs font-bold text-gold">
                <HeartHandshake className="h-3.5 w-3.5" />
                <span>دعاء اليوم</span>
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {content.dua.sourceAr}
              </span>
            </div>

            <p className="font-serif my-4 text-lg font-bold leading-loose text-foreground">
              {content.dua.text}
            </p>
            <p className="text-xs text-muted-foreground">{content.dua.occasionAr}</p>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
            <Link
              href="/adhkar?cat=prophetic-duas"
              className="text-xs font-bold text-primary hover:underline"
            >
              تصفح جميع الأدعية النبوية ←
            </Link>
            <button
              type="button"
              onClick={() => handleCopy("dua", content.dua.text)}
              className="inline-flex items-center gap-1 rounded-xl border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {copiedId === "dua" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedId === "dua" ? "تم النسخ" : "نسخ"}</span>
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
