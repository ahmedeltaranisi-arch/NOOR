"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, ChevronLeft, MapPin, Navigation2 } from "lucide-react";
import { DEFAULT_USER_LOCATION } from "@/data/egypt-governorates";
import { calculateQiblaInfo } from "@/lib/qibla";
import { getSavedLocation, STORAGE_CHANGE_EVENT } from "@/lib/storage/local-storage";
import { toArabicDigits } from "@/lib/utils";
import { UserLocation } from "@/types";

export function DashboardQiblaCard() {
  const [location, setLocation] = useState<UserLocation>(DEFAULT_USER_LOCATION);

  useEffect(() => {
    setLocation(getSavedLocation());
    const sync = () => setLocation(getSavedLocation());
    window.addEventListener(STORAGE_CHANGE_EVENT, sync);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, sync);
  }, []);

  const qibla = calculateQiblaInfo(location.latitude, location.longitude);

  return (
    <div className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-soft">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">اتجاه القبلة</h2>
              <p className="text-xs text-muted-foreground">
                من {location.governorateNameAr} ({location.cityNameAr})
              </p>
            </div>
          </div>
          <span className="rounded-xl border border-gold/30 bg-gold-muted px-3 py-1 text-xs font-bold text-gold">
            {toArabicDigits(qibla.bearingDegrees)}° من الشمال
          </span>
        </div>

        {/* Visual Compass Dial */}
        <div className="my-6 flex items-center justify-center">
          <div className="relative flex h-44 w-44 items-center justify-center rounded-full border-2 border-border bg-background/80 shadow-inner">
            {/* Cardinal Labels */}
            <span className="absolute top-2 text-xs font-extrabold text-primary">ش (N)</span>
            <span className="absolute bottom-2 text-[11px] font-semibold text-muted-foreground">
              ج (S)
            </span>
            <span className="absolute right-2.5 text-[11px] font-semibold text-muted-foreground">
              شرق
            </span>
            <span className="absolute left-2.5 text-[11px] font-semibold text-muted-foreground">
              غرب
            </span>

            {/* Degree ticks ring */}
            <div className="h-32 w-32 rounded-full border border-dashed border-border" />

            {/* Rotating Qibla Pointer */}
            <div
              className="absolute inset-0 flex items-center justify-center transition-transform duration-700"
              style={{ transform: `rotate(${qibla.bearingDegrees}deg)` }}
              aria-label={`مؤشر القبلة بزاوية ${qibla.bearingDegrees} درجة`}
            >
              <div className="flex h-32 flex-col items-center justify-start">
                <div className="flex h-7 w-7 -translate-y-1 items-center justify-center rounded-lg bg-emerald-900 text-[11px] font-bold text-gold shadow-md ring-2 ring-gold">
                  🕋
                </div>
                <div className="h-12 w-1 rounded-full bg-gradient-to-b from-gold to-primary" />
              </div>
            </div>

            {/* Center Pivot */}
            <div className="z-10 h-3.5 w-3.5 rounded-full border-2 border-card bg-primary shadow" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-center text-xs">
          <div className="rounded-2xl border border-border/70 bg-muted/40 p-2.5">
            <span className="text-muted-foreground">الاتجاه الجغرافي</span>
            <p className="mt-1 font-bold text-foreground">{qibla.cardinalDirectionAr}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/40 p-2.5">
            <span className="text-muted-foreground">المسافة للكعبة المشرفة</span>
            <p className="mt-1 font-bold text-foreground">
              {toArabicDigits(qibla.distanceKm)} كم
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 pt-2">
        <Link
          href="/qibla"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
        >
          <Navigation2 className="h-4 w-4" />
          <span>فتح البوصلة التفاعلية</span>
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <Link
          href="/qibla#nearby-mosques"
          className="inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-secondary/70 px-3 py-2.5 text-xs font-semibold text-foreground transition hover:bg-secondary"
        >
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span>أقرب المساجد</span>
        </Link>
      </div>
    </div>
  );
}
