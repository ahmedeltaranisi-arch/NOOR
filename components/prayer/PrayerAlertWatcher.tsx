"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bell, Square, Volume2, X } from "lucide-react";
import { calculateDailyPrayerSchedule } from "@/lib/prayer-times";
import {
  ADHAN_VOICES_META,
  getSavedLocation,
  getSavedPrayerNotifications,
  getSavedPrayerSettings,
  playApproachingPrayerAlert,
  playFullAdhanAudio,
  speakArabicAlert,
  stopFullAdhanAudio,
} from "@/lib/storage/local-storage";
import { AdhanSoundId, NotificationToneId } from "@/types";

interface ActiveAlertBanner {
  id: string;
  type: "pre" | "adhan" | "iqamah";
  prayerNameAr: string;
  titleAr: string;
  messageAr: string;
  sheikhNameAr?: string;
  tone: NotificationToneId;
  adhanSound: AdhanSoundId;
  preMinutes?: number;
}

export function PrayerAlertWatcher() {
  const [banner, setBanner] = useState<ActiveAlertBanner | null>(null);
  const triggeredKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkAlerts = () => {
      const notifSettings = getSavedPrayerNotifications();
      if (!notifSettings.masterEnabled) return;

      const loc = getSavedLocation();
      const calcSettings = getSavedPrayerSettings();
      const now = new Date();
      const schedule = calculateDailyPrayerSchedule(
        loc.latitude,
        loc.longitude,
        now,
        calcSettings,
        now
      );

      for (const entry of schedule.entries) {
        const cfg = notifSettings.prayers[entry.id];
        if (!cfg || !cfg.enabled) continue;

        const prayerMs = entry.time.getTime();
        const nowMs = now.getTime();
        const diffSec = Math.round((prayerMs - nowMs) / 1000);
        const chosenAdhan =
          cfg.adhanSound || notifSettings.selectedAdhanSound || "abdulbasit";
        const sheikhMeta =
          ADHAN_VOICES_META.find((a) => a.id === chosenAdhan) || ADHAN_VOICES_META[0];

        // 1. Pre-prayer alert ("اقتربت صلاة الظهر / العصر...")
        if (cfg.preAlertMinutes > 0) {
          const preTargetSec = cfg.preAlertMinutes * 60;
          if (Math.abs(diffSec - preTargetSec) <= 25) {
            const key = `${schedule.dateKey}-${entry.id}-pre`;
            if (!triggeredKeysRef.current.has(key)) {
              triggeredKeysRef.current.add(key);
              const titleAr = entry.isObligatory
                ? `اقتربت صلاة ${entry.nameAr}`
                : `اقترب وقت ${entry.nameAr}`;
              const messageAr = `اللَّهُ أَكْبَرُ — يتبقى ${cfg.preAlertMinutes} دقائق على موعد ${
                entry.isObligatory ? `أذان ${entry.nameAr}` : entry.nameAr
              } في ${loc.cityNameAr}`;

              setBanner({
                id: key,
                type: "pre",
                prayerNameAr: entry.nameAr,
                titleAr,
                messageAr,
                tone: cfg.tone,
                adhanSound: chosenAdhan,
                preMinutes: cfg.preAlertMinutes,
              });

              playApproachingPrayerAlert(entry.nameAr, cfg.preAlertMinutes, cfg.tone);
              sendBrowserNotification(titleAr, messageAr);
            }
          }
        }

        // 2. Exact prayer time alert (Full Adhan Audio)
        if (Math.abs(diffSec) <= 25) {
          const key = `${schedule.dateKey}-${entry.id}-exact`;
          if (!triggeredKeysRef.current.has(key)) {
            triggeredKeysRef.current.add(key);
            const titleAr = entry.isObligatory
              ? `حان الآن موعد أذان صلاة ${entry.nameAr}`
              : `حان الآن وقت الشروق`;
            const messageAr = `حسب التوقيت المحلي لمدينة ${loc.cityNameAr} (${loc.governorateNameAr})`;

            setBanner({
              id: key,
              type: "adhan",
              prayerNameAr: entry.nameAr,
              titleAr,
              messageAr,
              sheikhNameAr: entry.isObligatory ? sheikhMeta.nameAr : undefined,
              tone: cfg.tone,
              adhanSound: chosenAdhan,
            });

            if (entry.isObligatory && notifSettings.adhanEnabled !== false) {
              playFullAdhanAudio(chosenAdhan, entry.nameAr);
            } else {
              playApproachingPrayerAlert(entry.nameAr, 0, cfg.tone);
            }

            sendBrowserNotification(titleAr, messageAr);
          }
        }

        // 3. Iqamah reminder (after prayer time)
        if (entry.isObligatory && cfg.iqamahMinutes > 0) {
          const iqamahTargetSec = -cfg.iqamahMinutes * 60;
          if (Math.abs(diffSec - iqamahTargetSec) <= 25) {
            const key = `${schedule.dateKey}-${entry.id}-iqamah`;
            if (!triggeredKeysRef.current.has(key)) {
              triggeredKeysRef.current.add(key);
              const titleAr = `تذكير بإقامة صلاة ${entry.nameAr}`;
              const messageAr = `قد قامت الصلاة — مضى ${cfg.iqamahMinutes} دقيقة على أذان ${entry.nameAr}`;

              setBanner({
                id: key,
                type: "iqamah",
                prayerNameAr: entry.nameAr,
                titleAr,
                messageAr,
                tone: cfg.tone,
                adhanSound: chosenAdhan,
              });

              playApproachingPrayerAlert(entry.nameAr, 0, "takbeer-voice");
              sendBrowserNotification(titleAr, messageAr);
            }
          }
        }
      }
    };

    const sendBrowserNotification = (titleAr: string, bodyAr: string) => {
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        window.Notification.permission === "granted"
      ) {
        try {
          new window.Notification(titleAr, {
            body: bodyAr,
            icon: "/logo-mark.png",
            lang: "ar",
            dir: "rtl",
          });
        } catch {
          // ignore
        }
      }
    };

    checkAlerts();
    const timer = setInterval(checkAlerts, 20000);
    return () => clearInterval(timer);
  }, []);

  if (!banner) return null;

  const handleClose = () => {
    stopFullAdhanAudio();
    setBanner(null);
  };

  const handleReplay = () => {
    if (banner.type === "adhan") {
      playFullAdhanAudio(banner.adhanSound, banner.prayerNameAr);
    } else {
      playApproachingPrayerAlert(
        banner.prayerNameAr,
        banner.preMinutes || 10,
        banner.tone
      );
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-3 right-3 z-50 mx-auto max-w-md rounded-3xl border-2 border-gold/60 bg-card/95 p-4 shadow-2xl backdrop-blur-md md:bottom-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Bell className="h-5 w-5 animate-bounce text-gold" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-foreground sm:text-base">
              {banner.titleAr}
            </h4>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {banner.messageAr}
            </p>
            {banner.sheikhNameAr && (
              <p className="mt-1 text-[11px] font-bold text-primary">
                المؤذن: {banner.sheikhNameAr}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="إغلاق وإيقاف الصوت"
          className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3.5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleReplay}
          className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground hover:bg-secondary/80"
        >
          <Volume2 className="h-3.5 w-3.5 text-primary" />
          <span>{banner.type === "adhan" ? "إعادة الأذان" : "إعادة التنبيه الصوتي"}</span>
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground"
        >
          <Square className="h-3 w-3 fill-current" />
          <span>إيقاف وإغلاق</span>
        </button>
      </div>
    </div>
  );
}
