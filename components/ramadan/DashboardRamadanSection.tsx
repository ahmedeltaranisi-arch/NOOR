"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Heart,
  Moon,
  Sparkles,
} from "lucide-react";
import { DEFAULT_USER_LOCATION } from "@/data/egypt-governorates";
import { getRamadanStatusInfo, getTodayFastingStatus } from "@/lib/ramadan";
import {
  getSavedLocation,
  getSavedPrayerSettings,
  STORAGE_CHANGE_EVENT,
} from "@/lib/storage/local-storage";
import { toArabicDigits } from "@/lib/utils";
import { PrayerCalculationSettings, UserLocation } from "@/types";

const RAMADAN_FEATURES = [
  {
    href: "/ramadan?tab=imsakiyah",
    title: "إمساكية رمضان للـ ٢٧ محافظة",
    desc: "جدول ٣٠ يومًا كاملًا لمواعيد السحور والإمساك والفجر والمغرب والتراويح وساعات الصيام في محافظتك.",
    badge: "٣٠ يومًا • ٢٧ محافظة",
    icon: Calendar,
  },
  {
    href: "/ramadan?tab=khatmah",
    title: "جدول ختمة رمضان (٣٠ جزءًا)",
    desc: "خطة يومية لختم القرآن الكريم في رمضان (ختمة أو ختمتان أو ٣ ختمات) مع القراءة والاستماع لـ ١١ شيخًا.",
    badge: "٣٠ جزءًا",
    icon: BookOpen,
  },
  {
    href: "/ramadan?tab=duas",
    title: "أدعية الإفطار والسحور وليلة القدر",
    desc: "الأدعية النبوية الصحيحة الثابتة عند الفطر وفي قنوت الوتر وليلة القدر + ٣٠ دعاءً لأيام الشهر.",
    badge: "سنة نبوية موثقة",
    icon: Heart,
  },
  {
    href: "/ramadan?tab=tracker",
    title: "جدول الطاعات وحاسبة زكاة الفطر",
    desc: "متابعة يومية للطاعات السبعة في رمضان مع حاسبة زكاة الفطر وفدية الصيام بالجنيه المصري والصاع.",
    badge: "متابعة وحاسبة",
    icon: CheckCircle2,
  },
];

export function DashboardRamadanSection() {
  const [location, setLocation] = useState<UserLocation>(DEFAULT_USER_LOCATION);
  const [calcSettings, setCalcSettings] = useState<PrayerCalculationSettings>(
    getSavedPrayerSettings()
  );
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    setLocation(getSavedLocation());
    setCalcSettings(getSavedPrayerSettings());

    const handleStorage = () => {
      setLocation(getSavedLocation());
      setCalcSettings(getSavedPrayerSettings());
    };
    window.addEventListener(STORAGE_CHANGE_EVENT, handleStorage);
    return () =>
      window.removeEventListener(STORAGE_CHANGE_EVENT, handleStorage);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const ramadanStatus = useMemo(() => getRamadanStatusInfo(now), [now]);
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

  return (
    <section
      aria-label="قسم شهر رمضان المبارك"
      className="rounded-3xl border border-gold/40 bg-card p-4 shadow-soft sm:p-6 md:p-8"
    >
      {/* Section Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-border/70 pb-5 lg:flex-row lg:items-center">
        <div>
          <div className="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-extrabold text-gold">
            <Moon className="h-3.5 w-3.5" />
            <span>
              واحة شهر رمضان المبارك {toArabicDigits(ramadanStatus.targetHijriYear)}{" "}
              هـ • الإمساكية والختمة والأدعية
            </span>
          </div>

          <h2 className="mt-2 text-xl font-extrabold text-foreground sm:text-2xl">
            شهر رمضان المبارك
          </h2>

          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            إمساكية شهر رمضان الكاملة لجميع محافظات مصر الـ ٢٧، مواعيد السحور والإمساك
            وأذان المغرب، ختمة الثلاثين جزءًا، أدعية الإفطار وليلة القدر، وجدول الطاعات
            اليومي.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          <div className="inline-flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/15 px-3.5 py-2 text-xs font-extrabold text-amber-900 dark:text-gold">
            <Sparkles className="h-3.5 w-3.5" />
            {ramadanStatus.isRamadanNow ? (
              <span>
                اليوم {toArabicDigits(ramadanStatus.currentRamadanDay || 1)} من
                رمضان {toArabicDigits(ramadanStatus.targetHijriYear)} هـ
              </span>
            ) : (
              <span>
                متبقي على رمضان {toArabicDigits(ramadanStatus.targetHijriYear)} هـ:{" "}
                {toArabicDigits(ramadanStatus.daysUntilRamadan)} يومًا
              </span>
            )}
          </div>

          <Link
            href="/ramadan"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
          >
            <Moon className="h-4 w-4" />
            <span>فتح واحة شهر رمضان الكاملة</span>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Live Today Suhoor / Imsak / Fajr / Maghrib Strip + Prophetic Iftar Dua */}
      <div className="mt-4 grid grid-cols-1 gap-3.5 lg:grid-cols-12">
        <div className="rounded-2xl border border-gold/30 bg-gradient-to-l from-emerald-950 via-emerald-900 to-emerald-950 p-4 text-white lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-2.5">
            <span className="text-xs font-extrabold text-gold">
              مواقيت السحور والإمساك والإفطار اليوم في {location.governorateNameAr} (
              {location.cityNameAr})
            </span>
            <span className="rounded-lg bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-100">
              ساعات الصيام: {todayFasting.fastingDurationAr}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-black/20 p-2.5 text-center">
              <p className="text-[10px] text-emerald-200">السحور الموصى به</p>
              <p className="mt-0.5 text-xs font-extrabold text-white sm:text-sm">
                {todayFasting.suhoorFormatted12}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-2.5 text-center">
              <p className="text-[10px] text-emerald-200">وقت الإمساك</p>
              <p className="mt-0.5 text-xs font-extrabold text-gold sm:text-sm">
                {todayFasting.imsakFormatted12}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-2.5 text-center">
              <p className="text-[10px] text-emerald-200">أذان الفجر</p>
              <p className="mt-0.5 text-xs font-extrabold text-white sm:text-sm">
                {todayFasting.fajrFormatted12}
              </p>
            </div>
            <div className="rounded-xl border border-gold/40 bg-gold/20 p-2.5 text-center">
              <p className="text-[10px] font-bold text-gold">
                أذان المغرب (الإفطار)
              </p>
              <p className="mt-0.5 text-xs font-extrabold text-white sm:text-sm">
                {todayFasting.maghribFormatted12}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-gold/30 bg-muted/30 p-4 lg:col-span-5">
          <div>
            <span className="inline-block rounded-lg bg-primary/10 px-2.5 py-0.5 text-[11px] font-extrabold text-primary">
              دعاء الإفطار الثابت عن النبي ﷺ
            </span>
            <p className="mt-2 font-serif text-lg font-bold leading-relaxed text-foreground sm:text-xl">
              «ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ، وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ»
            </p>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
            <span>رواه أبو داود عن ابن عمر رضي الله عنهما</span>
            <Link href="/ramadan?tab=duas" className="font-bold text-primary">
              جميع أدعية رمضان ←
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Ramadan Feature Cards */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {RAMADAN_FEATURES.map((feat) => {
          const Icon = feat.icon;
          return (
            <Link
              key={feat.href}
              href={feat.href}
              className="group flex flex-col justify-between rounded-2xl border border-border bg-background/70 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card hover:shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="rounded-lg border border-gold/30 bg-gold/15 px-2 py-0.5 text-[10px] font-extrabold text-gold">
                    {feat.badge}
                  </span>
                </div>

                <h3 className="mt-3 font-sans text-sm font-extrabold text-foreground group-hover:text-primary sm:text-base">
                  {feat.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {feat.desc}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-[11px] font-bold text-primary">
                <span>فتح القسم</span>
                <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
