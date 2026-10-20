import {
  Coordinates,
  CalculationMethod,
  CalculationParameters,
  PrayerTimes,
  SunnahTimes,
  Madhab,
} from "adhan";
import {
  CalculationMethodId,
  DailyPrayerSchedule,
  MadhabId,
  PrayerCalculationSettings,
  PrayerId,
  PrayerTimeEntry,
} from "@/types";
import { formatGregorianDateAr, getHijriDateInfo, getLocalDateKey } from "@/lib/utils";

export const DEFAULT_CALCULATION_SETTINGS: PrayerCalculationSettings = {
  method: "Egyptian",
  madhab: "Shafi",
  adjustments: {
    fajr: 0,
    sunrise: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  },
};

export const CALCULATION_METHODS_META: {
  id: CalculationMethodId;
  nameAr: string;
  descriptionAr: string;
  fajrAngle: number;
  ishaAngle: string;
}[] = [
  {
    id: "Egyptian",
    nameAr: "الهيئة المصرية العامة للمساحة (الافتراضي لمصر)",
    descriptionAr: "المعتمدة رسميًا في جمهورية مصر العربية ودار الإفتاء المصرية",
    fajrAngle: 19.5,
    ishaAngle: "17.5°",
  },
  {
    id: "MuslimWorldLeague",
    nameAr: "رابطة العالم الإسلامي",
    descriptionAr: "معتمدة في أوروبا والشرق الأقصى وأجزاء من العالم العربي",
    fajrAngle: 18,
    ishaAngle: "17°",
  },
  {
    id: "UmmAlQura",
    nameAr: "جامعة أم القرى - مكة المكرمة",
    descriptionAr: "المعتمدة في المملكة العربية السعودية ودول الخليج",
    fajrAngle: 18.5,
    ishaAngle: "90 دقيقة بعد المغرب (120 في رمضان)",
  },
  {
    id: "Karachi",
    nameAr: "جامعة العلوم الإسلامية بكراتشي",
    descriptionAr: "معتمدة في باكستان والهند وبنغلاديش",
    fajrAngle: 18,
    ishaAngle: "18°",
  },
  {
    id: "Dubai",
    nameAr: "دبي - الإمارات العربية المتحدة",
    descriptionAr: "الهيئة العامة للشؤون الإسلامية والأوقاف بالإمارات",
    fajrAngle: 18.2,
    ishaAngle: "18.2°",
  },
  {
    id: "Kuwait",
    nameAr: "الكويت",
    descriptionAr: "وزارة الأوقاف والشؤون الإسلامية بدولة الكويت",
    fajrAngle: 18,
    ishaAngle: "17.5°",
  },
  {
    id: "Qatar",
    nameAr: "قطر",
    descriptionAr: "وزارة الأوقاف والشؤون الإسلامية بدولة قطر",
    fajrAngle: 18,
    ishaAngle: "90 دقيقة بعد المغرب",
  },
  {
    id: "NorthAmerica",
    nameAr: "الجمعية الإسلامية لأمريكا الشمالية (ISNA)",
    descriptionAr: "معتمدة في أمريكا الشمالية وكندا",
    fajrAngle: 15,
    ishaAngle: "15°",
  },
];

export const MADHAB_OPTIONS_META: {
  id: MadhabId;
  nameAr: string;
  descriptionAr: string;
}[] = [
  {
    id: "Shafi",
    nameAr: "مذهب الجمهور (الشافعي، المالكي، الحنبلي)",
    descriptionAr: "المعتمد في مصر: يدخل وقت العصر عندما يصير ظل كل شيء مثله بعد فيء الزوال",
  },
  {
    id: "Hanafi",
    nameAr: "المذهب الحنفي",
    descriptionAr: "يدخل وقت العصر عندما يصير ظل كل شيء مثليه بعد فيء الزوال",
  },
];

export const PRAYER_NAMES_AR: Record<PrayerId, string> = {
  fajr: "الفجر",
  sunrise: "الشروق",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

export function buildCalculationParameters(
  settings: PrayerCalculationSettings = DEFAULT_CALCULATION_SETTINGS
): CalculationParameters {
  let params: CalculationParameters;

  switch (settings.method) {
    case "Egyptian":
      params = CalculationMethod.Egyptian();
      break;
    case "MuslimWorldLeague":
      params = CalculationMethod.MuslimWorldLeague();
      break;
    case "UmmAlQura":
      params = CalculationMethod.UmmAlQura();
      break;
    case "Karachi":
      params = CalculationMethod.Karachi();
      break;
    case "Dubai":
      params = CalculationMethod.Dubai();
      break;
    case "Kuwait":
      params = CalculationMethod.Kuwait();
      break;
    case "Qatar":
      params = CalculationMethod.Qatar();
      break;
    case "NorthAmerica":
      params = CalculationMethod.NorthAmerica();
      break;
    default:
      params = CalculationMethod.Egyptian();
  }

  params.madhab = settings.madhab === "Hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  params.adjustments = {
    fajr: settings.adjustments?.fajr || 0,
    sunrise: settings.adjustments?.sunrise || 0,
    dhuhr: settings.adjustments?.dhuhr || 0,
    asr: settings.adjustments?.asr || 0,
    maghrib: settings.adjustments?.maghrib || 0,
    isha: settings.adjustments?.isha || 0,
  };

  return params;
}

export function formatPrayerTime12Ar(date: Date): string {
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Africa/Cairo",
    }).format(date);
  } catch {
    return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  }
}

export function formatPrayerTime24(date: Date): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Africa/Cairo",
    }).format(date);
  } catch {
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
}

/**
 * Calculates accurate daily prayer times and upcoming prayer countdown
 * for given coordinates, target date, and reference "now" timestamp.
 */
export function calculateDailyPrayerSchedule(
  latitude: number,
  longitude: number,
  date: Date = new Date(),
  settings: PrayerCalculationSettings = DEFAULT_CALCULATION_SETTINGS,
  now: Date = new Date()
): DailyPrayerSchedule {
  const coords = new Coordinates(latitude, longitude);
  const params = buildCalculationParameters(settings);
  const prayerTimes = new PrayerTimes(coords, date, params);
  const sunnahTimes = new SunnahTimes(prayerTimes);

  const hijri = getHijriDateInfo(date);
  const dateKey = getLocalDateKey(date);

  const rawList: { id: PrayerId; time: Date; isObligatory: boolean }[] = [
    { id: "fajr", time: prayerTimes.fajr, isObligatory: true },
    { id: "sunrise", time: prayerTimes.sunrise, isObligatory: false },
    { id: "dhuhr", time: prayerTimes.dhuhr, isObligatory: true },
    { id: "asr", time: prayerTimes.asr, isObligatory: true },
    { id: "maghrib", time: prayerTimes.maghrib, isObligatory: true },
    { id: "isha", time: prayerTimes.isha, isObligatory: true },
  ];

  // Determine next obligatory prayer (or Sunrise if user wants to see next event,
  // but Islamic standard highlights next obligatory prayer while also showing Sunrise status)
  const obligatoryList = rawList.filter((item) => item.isObligatory);
  let nextObligatory = obligatoryList.find((item) => item.time.getTime() > now.getTime());
  let isTomorrowFajr = false;
  let prevPrayerTime: Date;

  if (!nextObligatory) {
    // All 5 prayers today have passed; next prayer is tomorrow's Fajr
    const tomorrow = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowPrayers = new PrayerTimes(coords, tomorrow, params);
    nextObligatory = {
      id: "fajr",
      time: tomorrowPrayers.fajr,
      isObligatory: true,
    };
    isTomorrowFajr = true;
    prevPrayerTime = prayerTimes.isha;
  } else {
    const idx = obligatoryList.findIndex((p) => p.id === nextObligatory!.id);
    if (idx > 0) {
      prevPrayerTime = obligatoryList[idx - 1].time;
    } else {
      // Before today's Fajr: previous prayer was yesterday's Isha
      const yesterday = new Date(date.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayPrayers = new PrayerTimes(coords, yesterday, params);
      prevPrayerTime = yesterdayPrayers.isha;
    }
  }

  const remainingSeconds = Math.max(
    0,
    Math.floor((nextObligatory.time.getTime() - now.getTime()) / 1000)
  );

  const totalIntervalMs = Math.max(
    1,
    nextObligatory.time.getTime() - prevPrayerTime.getTime()
  );
  const elapsedMs = Math.max(0, now.getTime() - prevPrayerTime.getTime());
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalIntervalMs) * 100)));

  let currentPrayerId: PrayerId | null = null;
  for (let i = rawList.length - 1; i >= 0; i--) {
    if (now.getTime() >= rawList[i].time.getTime()) {
      currentPrayerId = rawList[i].id;
      break;
    }
  }

  const entries: PrayerTimeEntry[] = rawList.map((item) => {
    let status: "passed" | "next" | "upcoming" = "upcoming";
    if (!isTomorrowFajr && item.id === nextObligatory!.id) {
      status = "next";
    } else if (item.time.getTime() <= now.getTime()) {
      status = "passed";
    }
    return {
      id: item.id,
      nameAr: PRAYER_NAMES_AR[item.id],
      time: item.time,
      formattedTime12: formatPrayerTime12Ar(item.time),
      formattedTime24: formatPrayerTime24(item.time),
      isObligatory: item.isObligatory,
      status,
    };
  });

  return {
    date,
    dateKey,
    gregorianFormatted: formatGregorianDateAr(date),
    hijriFormatted: hijri.formattedAr,
    hijriDay: hijri.day,
    hijriMonthName: hijri.monthNameAr,
    hijriYear: hijri.year,
    fajr: prayerTimes.fajr,
    sunrise: prayerTimes.sunrise,
    dhuhr: prayerTimes.dhuhr,
    asr: prayerTimes.asr,
    maghrib: prayerTimes.maghrib,
    isha: prayerTimes.isha,
    middleOfTheNight: sunnahTimes.middleOfTheNight,
    lastThirdOfTheNight: sunnahTimes.lastThirdOfTheNight,
    entries,
    nextPrayer: {
      id: nextObligatory.id,
      nameAr: PRAYER_NAMES_AR[nextObligatory.id],
      time: nextObligatory.time,
      isTomorrowFajr,
      remainingSeconds,
      progressPercent,
    },
    currentPrayerId,
  };
}

/**
 * Generates prayer schedules for a number of consecutive days starting from `startDate`.
 */
export function calculateRangePrayerSchedules(
  latitude: number,
  longitude: number,
  startDate: Date,
  daysCount: number,
  settings: PrayerCalculationSettings = DEFAULT_CALCULATION_SETTINGS
): DailyPrayerSchedule[] {
  const result: DailyPrayerSchedule[] = [];
  const baseYear = startDate.getFullYear();
  const baseMonth = startDate.getMonth();
  const baseDay = startDate.getDate();

  for (let i = 0; i < daysCount; i++) {
    const dayDate = new Date(baseYear, baseMonth, baseDay + i, 12, 0, 0);
    result.push(calculateDailyPrayerSchedule(latitude, longitude, dayDate, settings));
  }
  return result;
}

/**
 * Generates full monthly prayer timetable for a given year and 0-indexed month.
 */
export function calculateMonthlyPrayerSchedules(
  latitude: number,
  longitude: number,
  year: number,
  monthIndex: number,
  settings: PrayerCalculationSettings = DEFAULT_CALCULATION_SETTINGS
): DailyPrayerSchedule[] {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDay = new Date(year, monthIndex, 1, 12, 0, 0);
  return calculateRangePrayerSchedules(latitude, longitude, firstDay, daysInMonth, settings);
}
