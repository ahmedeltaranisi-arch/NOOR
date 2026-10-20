"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bell, Volume2, X } from "lucide-react";
import { calculateDailyPrayerSchedule } from "@/lib/prayer-times";
import {
  getSavedLocation,
  getSavedPrayerNotifications,
  getSavedPrayerSettings,
  playNotificationTone,
} from "@/lib/storage/local-storage";

interface ActiveAlertBanner {
  id: string;
  titleAr: string;
  messageAr: string;
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

        // 1. Pre-prayer alert
        if (cfg.preAlertMinutes > 0) {
          const preTargetSec = cfg.preAlertMinutes * 60;
          if (Math.abs(diffSec - preTargetSec) <= 25) {
            const key = `${schedule.dateKey}-${entry.id}-pre`;
            if (!triggeredKeysRef.current.has(key)) {
              triggeredKeysRef.current.add(key);
              triggerNotification(
                key,
                `اقترب موعد ${entry.isObligatory ? "صلاة " : ""}${entry.nameAr}`,
                `يتبقى ${cfg.preAlertMinutes} دقيقة على موعد ${entry.nameAr} في ${loc.cityNameAr}`,
                cfg.tone
              );
            }
          }
        }

        // 2. Exact prayer time alert
        if (Math.abs(diffSec) <= 25) {
          const key = `${schedule.dateKey}-${entry.id}-exact`;
          if (!triggeredKeysRef.current.has(key)) {
            triggeredKeysRef.current.add(key);
            triggerNotification(
              key,
              `حان الآن موعد ${entry.isObligatory ? "صلاة " : ""}${entry.nameAr}`,
              `حسب التوقيت المحلي لمدينة ${loc.cityNameAr} (${loc.governorateNameAr})`,
              cfg.tone
            );
          }
        }

        // 3. Iqamah reminder (after prayer time)
        if (entry.isObligatory && cfg.iqamahMinutes > 0) {
          const iqamahTargetSec = -cfg.iqamahMinutes * 60;
          if (Math.abs(diffSec - iqamahTargetSec) <= 25) {
            const key = `${schedule.dateKey}-${entry.id}-iqamah`;
            if (!triggeredKeysRef.current.has(key)) {
              triggeredKeysRef.current.add(key);
              triggerNotification(
                key,
                `تذكير بإقامة صلاة ${entry.nameAr}`,
                `مضى ${cfg.iqamahMinutes} دقيقة على أذان ${entry.nameAr}`,
                cfg.tone
              );
            }
          }
        }
      }
    };

    const triggerNotification = (
      id: string,
      titleAr: string,
      messageAr: string,
      tone: Parameters<typeof playNotificationTone>[0]
    ) => {
      setBanner({ id, titleAr, messageAr });
      playNotificationTone(tone);

      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        window.Notification.permission === "granted"
      ) {
        try {
          new window.Notification(titleAr, {
            body: messageAr,
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

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-gold/40 bg-card p-4 shadow-gold md:bottom-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Bell className="h-5 w-5 animate-bounce" />
          </div>
          <div>
            <h4 className="font-bold text-foreground">{banner.titleAr}</h4>
            <p className="mt-0.5 text-sm text-muted-foreground">{banner.messageAr}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setBanner(null)}
          aria-label="إغلاق التنبيه"
          className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => playNotificationTone("spiritual-chime")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
        >
          <Volume2 className="h-3.5 w-3.5" />
          <span>إعادة الصوت</span>
        </button>
        <button
          type="button"
          onClick={() => setBanner(null)}
          className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          حسناً
        </button>
      </div>
    </div>
  );
}
