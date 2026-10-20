import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { HijriDateInfo } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolves the canonical site URL across custom domain, Vercel production/preview URLs, and localhost.
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export function toArabicDigits(value: number | string): string {
  return String(value).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);
}

export function formatCountdown(totalSeconds: number): {
  hours: string;
  minutes: string;
  seconds: string;
  formatted: string;
} {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    hours: pad(hrs),
    minutes: pad(mins),
    seconds: pad(secs),
    formatted: `${pad(hrs)}:${pad(mins)}:${pad(secs)}`,
  };
}

export const HIJRI_MONTHS_AR = [
  "محرم",
  "صفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الآخرة",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذو القعدة",
  "ذو الحجة",
];

export const WEEKDAYS_AR = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

/**
 * Converts a Gregorian Date to Hijri Date info using Umm al-Qura calendar via Intl
 * with deterministic fallback calculation.
 */
export function getHijriDateInfo(date: Date = new Date()): HijriDateInfo {
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      timeZone: "Africa/Cairo",
    }).formatToParts(date);

    const dayPart = parts.find((p) => p.type === "day")?.value;
    const monthPart = parts.find((p) => p.type === "month")?.value;
    const yearPart = parts.find((p) => p.type === "year")?.value;

    const day = parseInt(dayPart || "1", 10);
    const monthNumber = parseInt(monthPart || "1", 10);
    const year = parseInt((yearPart || "1447").replace(/\D/g, ""), 10);

    const monthNameAr = HIJRI_MONTHS_AR[Math.max(0, Math.min(11, monthNumber - 1))];
    const weekdayAr = new Intl.DateTimeFormat("ar-EG", {
      weekday: "long",
      timeZone: "Africa/Cairo",
    }).format(date);

    return {
      day,
      monthNumber,
      monthNameAr,
      year,
      weekdayAr,
      formattedAr: `${toArabicDigits(day)} ${monthNameAr} ${toArabicDigits(year)} هـ`,
    };
  } catch {
    // Fallback Kuwaiti tabular Islamic calendar algorithm
    const jd = Math.floor(date.getTime() / 86400000) + 2440588;
    const l = jd - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    const l2 = l - 10631 * n + 354;
    const j =
      Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
      Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
    const l3 =
      l2 -
      Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
      Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
      29;
    const monthNumber = Math.floor((24 * l3) / 709);
    const day = l3 - Math.floor((709 * monthNumber) / 24);
    const year = 30 * n + j - 30;
    const monthNameAr = HIJRI_MONTHS_AR[Math.max(0, Math.min(11, monthNumber - 1))];
    const weekdayAr = WEEKDAYS_AR[date.getDay()];

    return {
      day,
      monthNumber,
      monthNameAr,
      year,
      weekdayAr,
      formattedAr: `${toArabicDigits(day)} ${monthNameAr} ${toArabicDigits(year)} هـ`,
    };
  }
}

export function formatGregorianDateAr(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Africa/Cairo",
    }).format(date);
  } catch {
    return date.toLocaleDateString("ar-EG");
  }
}

export function getLocalDateKey(date: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Africa/Cairo",
    }).format(date);
    return parts; // YYYY-MM-DD
  } catch {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
}

/**
 * Strips Arabic Tashkeel (diacritics), Uthmani symbols, and normalizes Alef, Ya, and Teh Marbuta
 * for accurate Quran & Adhkar search.
 */
export function normalizeArabicText(text: string): string {
  return text
    .replace(/ـٔ/g, "ا")
    .replace(/[\u0610-\u061A\u0640\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[أإآٱءؤئ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}
