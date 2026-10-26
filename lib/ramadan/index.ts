import {
  calculateDailyPrayerSchedule,
  DEFAULT_CALCULATION_SETTINGS,
  formatPrayerTime12Ar,
  formatPrayerTime24,
} from "@/lib/prayer-times";
import { getHijriDateInfo, toArabicDigits } from "@/lib/utils";
import { PrayerCalculationSettings } from "@/types";

export interface RamadanStatusInfo {
  isRamadanNow: boolean;
  targetHijriYear: number;
  currentRamadanDay: number | null;
  daysUntilRamadan: number;
  hoursUntilRamadan: number;
  ramadanStartDate: Date;
  ramadanStartGregorianAr: string;
}

export interface RamadanImsakiyahDay {
  ramadanDay: number;
  hijriLabelAr: string;
  gregorianDateKey: string;
  gregorianShortAr: string;
  weekdayAr: string;
  ashraType: "first" | "second" | "last";
  isOddLastTen: boolean;
  isLaylatulQadr27: boolean;
  suhoorTime12Ar: string;
  imsakTime12Ar: string;
  fajrTime12Ar: string;
  fajrTime24: string;
  sunriseTime12Ar: string;
  dhuhrTime12Ar: string;
  asrTime12Ar: string;
  maghribTime12Ar: string;
  maghribTime24: string;
  ishaTime12Ar: string;
  fastingDurationAr: string;
  fastingTotalMinutes: number;
  juzNumber: number;
}

export interface TodayFastingStatus {
  suhoorTime: Date;
  imsakTime: Date;
  fajrTime: Date;
  maghribTime: Date;
  ishaTime: Date;
  suhoorFormatted12: string;
  imsakFormatted12: string;
  fajrFormatted12: string;
  maghribFormatted12: string;
  ishaFormatted12: string;
  fastingDurationAr: string;
  phase: "before_fajr" | "fasting_day" | "after_maghrib";
  targetEventLabelAr: string;
  remainingSeconds: number;
  progressPercent: number;
}

export interface RamadanEssentialDua {
  id: string;
  titleAr: string;
  occasionAr: string;
  arabicText: string;
  sourceAr: string;
  benefitAr: string;
}

export interface RamadanDailyDuaItem {
  day: number;
  titleAr: string;
  arabicText: string;
  sourceAr: string;
}

export interface RamadanDeedMeta {
  id: string;
  labelAr: string;
  subtitleAr: string;
}

function formatFastingDurationAr(fajr: Date, maghrib: Date): {
  formattedAr: string;
  totalMinutes: number;
} {
  const diffMs = Math.max(0, maghrib.getTime() - fajr.getTime());
  const totalMinutes = Math.round(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return {
    formattedAr: `${toArabicDigits(hours)} س و ${toArabicDigits(mins)} د`,
    totalMinutes,
  };
}

/**
 * Determines whether `now` is currently inside the Hijri month of Ramadan (month 9),
 * or finds the exact Gregorian start date of the upcoming 1 Ramadan.
 */
export function getRamadanStatusInfo(now: Date = new Date()): RamadanStatusInfo {
  const todayHijri = getHijriDateInfo(now);

  if (todayHijri.monthNumber === 9) {
    // Currently in Ramadan! Walk backwards up to 30 days to find 1 Ramadan
    const startCandidate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - (todayHijri.day - 1),
      12,
      0,
      0
    );
    const startGregorianAr = new Intl.DateTimeFormat("ar-EG", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Africa/Cairo",
    }).format(startCandidate);

    return {
      isRamadanNow: true,
      targetHijriYear: todayHijri.year,
      currentRamadanDay: Math.min(30, Math.max(1, todayHijri.day)),
      daysUntilRamadan: 0,
      hoursUntilRamadan: 0,
      ramadanStartDate: startCandidate,
      ramadanStartGregorianAr: startGregorianAr,
    };
  }

  // Scan forward day-by-day up to 370 days to locate the first day where Hijri month === 9
  const baseNoon = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0
  );
  let foundStart = new Date(baseNoon.getTime() + 100 * 86400000);
  let targetHijriYear =
    todayHijri.monthNumber < 9 ? todayHijri.year : todayHijri.year + 1;

  for (let offset = 1; offset <= 370; offset++) {
    const candidate = new Date(
      baseNoon.getFullYear(),
      baseNoon.getMonth(),
      baseNoon.getDate() + offset,
      0,
      0,
      0
    );
    const h = getHijriDateInfo(candidate);
    if (h.monthNumber === 9 && h.day === 1) {
      foundStart = candidate;
      targetHijriYear = h.year;
      break;
    }
  }

  const diffMs = Math.max(0, foundStart.getTime() - now.getTime());
  const daysUntilRamadan = Math.ceil(diffMs / 86400000);
  const hoursUntilRamadan = Math.floor((diffMs % 86400000) / 3600000);

  const startGregorianAr = new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Cairo",
  }).format(foundStart);

  return {
    isRamadanNow: false,
    targetHijriYear,
    currentRamadanDay: null,
    daysUntilRamadan,
    hoursUntilRamadan,
    ramadanStartDate: foundStart,
    ramadanStartGregorianAr: startGregorianAr,
  };
}

/**
 * Generates the complete 30-day Ramadan Imsakiyah timetable for any Egyptian governorate/city.
 */
export function generateRamadanImsakiyah(
  latitude: number,
  longitude: number,
  settings: PrayerCalculationSettings = DEFAULT_CALCULATION_SETTINGS,
  now: Date = new Date()
): {
  status: RamadanStatusInfo;
  days: RamadanImsakiyahDay[];
} {
  const status = getRamadanStatusInfo(now);
  const start = status.ramadanStartDate;
  const days: RamadanImsakiyahDay[] = [];

  for (let i = 0; i < 30; i++) {
    const ramadanDay = i + 1;
    const dayDate = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + i,
      12,
      0,
      0
    );
    const sched = calculateDailyPrayerSchedule(
      latitude,
      longitude,
      dayDate,
      settings,
      dayDate
    );

    const suhoorDate = new Date(sched.fajr.getTime() - 45 * 60000);
    const imsakDate = new Date(sched.fajr.getTime() - 10 * 60000);
    const duration = formatFastingDurationAr(sched.fajr, sched.maghrib);

    const gregorianShortAr = new Intl.DateTimeFormat("ar-EG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Africa/Cairo",
    }).format(dayDate);

    const weekdayAr = new Intl.DateTimeFormat("ar-EG", {
      weekday: "long",
      timeZone: "Africa/Cairo",
    }).format(dayDate);

    const ashraType: "first" | "second" | "last" =
      ramadanDay <= 10 ? "first" : ramadanDay <= 20 ? "second" : "last";
    const isOddLastTen = ramadanDay >= 21 && ramadanDay % 2 === 1;

    days.push({
      ramadanDay,
      hijriLabelAr: `${toArabicDigits(ramadanDay)} رمضان ${toArabicDigits(
        status.targetHijriYear
      )} هـ`,
      gregorianDateKey: sched.dateKey,
      gregorianShortAr,
      weekdayAr,
      ashraType,
      isOddLastTen,
      isLaylatulQadr27: ramadanDay === 27,
      suhoorTime12Ar: formatPrayerTime12Ar(suhoorDate),
      imsakTime12Ar: formatPrayerTime12Ar(imsakDate),
      fajrTime12Ar: formatPrayerTime12Ar(sched.fajr),
      fajrTime24: formatPrayerTime24(sched.fajr),
      sunriseTime12Ar: formatPrayerTime12Ar(sched.sunrise),
      dhuhrTime12Ar: formatPrayerTime12Ar(sched.dhuhr),
      asrTime12Ar: formatPrayerTime12Ar(sched.asr),
      maghribTime12Ar: formatPrayerTime12Ar(sched.maghrib),
      maghribTime24: formatPrayerTime24(sched.maghrib),
      ishaTime12Ar: formatPrayerTime12Ar(sched.isha),
      fastingDurationAr: duration.formattedAr,
      fastingTotalMinutes: duration.totalMinutes,
      juzNumber: ramadanDay,
    });
  }

  return { status, days };
}

/**
 * Computes today's exact Suhoor, Imsak, Fajr, and Maghrib (Iftar) times and live countdown
 * for the selected Egyptian city.
 */
export function getTodayFastingStatus(
  latitude: number,
  longitude: number,
  settings: PrayerCalculationSettings = DEFAULT_CALCULATION_SETTINGS,
  now: Date = new Date()
): TodayFastingStatus {
  const sched = calculateDailyPrayerSchedule(
    latitude,
    longitude,
    now,
    settings,
    now
  );
  const suhoorTime = new Date(sched.fajr.getTime() - 45 * 60000);
  const imsakTime = new Date(sched.fajr.getTime() - 10 * 60000);
  const duration = formatFastingDurationAr(sched.fajr, sched.maghrib);

  if (now.getTime() < sched.fajr.getTime()) {
    const remainingSeconds = Math.max(
      0,
      Math.floor((sched.fajr.getTime() - now.getTime()) / 1000)
    );
    return {
      suhoorTime,
      imsakTime,
      fajrTime: sched.fajr,
      maghribTime: sched.maghrib,
      ishaTime: sched.isha,
      suhoorFormatted12: formatPrayerTime12Ar(suhoorTime),
      imsakFormatted12: formatPrayerTime12Ar(imsakTime),
      fajrFormatted12: formatPrayerTime12Ar(sched.fajr),
      maghribFormatted12: formatPrayerTime12Ar(sched.maghrib),
      ishaFormatted12: formatPrayerTime12Ar(sched.isha),
      fastingDurationAr: duration.formattedAr,
      phase: "before_fajr",
      targetEventLabelAr: "المتبقي على أذان الفجر وبدء الصيام",
      remainingSeconds,
      progressPercent: 0,
    };
  }

  if (now.getTime() < sched.maghrib.getTime()) {
    const totalFastMs = Math.max(
      1,
      sched.maghrib.getTime() - sched.fajr.getTime()
    );
    const elapsedMs = Math.max(0, now.getTime() - sched.fajr.getTime());
    const progressPercent = Math.min(
      100,
      Math.max(0, Math.round((elapsedMs / totalFastMs) * 100))
    );
    const remainingSeconds = Math.max(
      0,
      Math.floor((sched.maghrib.getTime() - now.getTime()) / 1000)
    );
    return {
      suhoorTime,
      imsakTime,
      fajrTime: sched.fajr,
      maghribTime: sched.maghrib,
      ishaTime: sched.isha,
      suhoorFormatted12: formatPrayerTime12Ar(suhoorTime),
      imsakFormatted12: formatPrayerTime12Ar(imsakTime),
      fajrFormatted12: formatPrayerTime12Ar(sched.fajr),
      maghribFormatted12: formatPrayerTime12Ar(sched.maghrib),
      ishaFormatted12: formatPrayerTime12Ar(sched.isha),
      fastingDurationAr: duration.formattedAr,
      phase: "fasting_day",
      targetEventLabelAr: "المتبقي على أذان المغرب وموعد الإفطار",
      remainingSeconds,
      progressPercent,
    };
  }

  // After Maghrib: calculate tomorrow's Fajr for Suhoor countdown
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    12,
    0,
    0
  );
  const tomorrowSched = calculateDailyPrayerSchedule(
    latitude,
    longitude,
    tomorrow,
    settings,
    tomorrow
  );
  const remainingSeconds = Math.max(
    0,
    Math.floor((tomorrowSched.fajr.getTime() - now.getTime()) / 1000)
  );

  return {
    suhoorTime,
    imsakTime,
    fajrTime: sched.fajr,
    maghribTime: sched.maghrib,
    ishaTime: sched.isha,
    suhoorFormatted12: formatPrayerTime12Ar(suhoorTime),
    imsakFormatted12: formatPrayerTime12Ar(imsakTime),
    fajrFormatted12: formatPrayerTime12Ar(sched.fajr),
    maghribFormatted12: formatPrayerTime12Ar(sched.maghrib),
    ishaFormatted12: formatPrayerTime12Ar(sched.isha),
    fastingDurationAr: duration.formattedAr,
    phase: "after_maghrib",
    targetEventLabelAr: "المتبقي على فجر الغد والسحور القادم",
    remainingSeconds,
    progressPercent: 100,
  };
}

export const RAMADAN_DAILY_DEEDS_META: RamadanDeedMeta[] = [
  {
    id: "fasting",
    labelAr: "صيام اليوم إيمانًا واحتسابًا",
    subtitleAr: "من صام رمضان إيمانًا واحتسابًا غُفر له ما تقدم من ذنبه",
  },
  {
    id: "prayers",
    labelAr: "الصلوات الخمس المفروضة في وقتها",
    subtitleAr: "المحافظة على الفجر والظهر والعصر والمغرب والعشاء",
  },
  {
    id: "quran_juz",
    labelAr: "قراءة الورد القرآني (جزء اليوم)",
    subtitleAr: "قراءة جزء كامل أو ٢٠ صفحة من المصحف الشريف",
  },
  {
    id: "taraweeh",
    labelAr: "صلاة التراويح وقيام الليل والوتر",
    subtitleAr: "من قام مع الإمام حتى ينصرف كُتب له قيام ليلة",
  },
  {
    id: "adhkar",
    labelAr: "أذكار الصباح والمساء وأذكار بعد الصلاة",
    subtitleAr: "حصن المسلم اليومي والاستغفار بالأسحار",
  },
  {
    id: "sadaqah",
    labelAr: "صدقة اليوم أو تفطير صائم",
    subtitleAr: "كان النبي ﷺ أجود الناس وكان أجود ما يكون في رمضان",
  },
  {
    id: "dua_iftar",
    labelAr: "الدعاء عند الإفطار وفي وقت السحر",
    subtitleAr: "للصائم عند فطره دعوة لا تُرد",
  },
];

export const RAMADAN_ESSENTIAL_DUAS: RamadanEssentialDua[] = [
  {
    id: "iftar-authentic",
    titleAr: "دعاء الإفطار الثابت عن النبي ﷺ",
    occasionAr: "يُقال عقب الفطر مباشرة بعد التسمية وتناول التمر أو الماء",
    arabicText:
      "«ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ، وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ».",
    sourceAr: "رواه أبو داود (٢٣٥٧) وحسّنه الألباني عن ابن عمر رضي الله عنهما",
    benefitAr:
      "من السنة تعجيل الفطر على رُطَبات فإن لم يجد فعلى تمرات فإن لم يجد حسا حسوات من ماء، ثم يقول هذا الدعاء النبوي.",
  },
  {
    id: "laylat-al-qadr",
    titleAr: "دعاء ليلة القدر والعشر الأواخر",
    occasionAr: "يُكثر منه في العشر الأواخر من رمضان وفي ليالي الوتر خاصة",
    arabicText: "«اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي».",
    sourceAr:
      "رواه الترمذي (٣٥١٣) وابن ماجه (٣٨٥٠) وصححه الترمذي عن أم المؤمنين عائشة رضي الله عنها",
    benefitAr:
      "قالت عائشة رضي الله عنها: يا رسول الله، أرأيتَ إن علمتُ أي ليلةٍ ليلةُ القدر ما أقول فيها؟ فعلمها النبي ﷺ هذا الدعاء الجامع.",
  },
  {
    id: "crescent-sighting",
    titleAr: "دعاء رؤية هلال شهر رمضان",
    occasionAr: "عند رؤية الهلال في أول ليلة من الشهر المبارك",
    arabicText:
      "«اللَّهُمَّ أَهِلَّهُ عَلَيْنَا بِالْيُمْنِ وَالْإِيمَانِ، وَالسَّلَامَةِ وَالْإِسْلَامِ، رَبِّي وَرَبُّكَ اللَّهُ».",
    sourceAr: "رواه الترمذي (٣٤٥١) وأحمد عن طلحة بن عبيد الله رضي الله عنه",
    benefitAr:
      "استفتاح الشهر بسؤال الله البركة والأمن والثبات على الإيمان والتوفيق لطاعته.",
  },
  {
    id: "qunoot-witr",
    titleAr: "دعاء القنوت في صلاة الوتر والتراويح",
    occasionAr: "في الركعة الأخيرة من صلاة الوتر في قيام رمضان وسائر العام",
    arabicText:
      "«اللَّهُمَّ اهْدِنِي فِيمَنْ هَدَيْتَ، وَعَافِنِي فِيمَنْ عَافَيْتَ، وَتَوَلَّنِي فِيمَنْ تَوَلَّيْتَ، وَبَارِكْ لِي فِيمَا أَعْطَيْتَ، وَقِنِي شَرَّ مَا قَضَيْتَ، فَإِنَّكَ تَقْضِي وَلَا يُقْضَى عَلَيْكَ، وَإِنَّهُ لَا يَذِلُّ مَنْ وَالَيْتَ، وَلَا يَعِزُّ مَنْ عَادَيْتَ، تَبَارَكْتَ رَبَّنَا وَتَعَالَيْتَ».",
    sourceAr:
      "رواه أبو داود (١٤٢٥) والترمذي (٤٦٤) والنسائي عن الحسن بن علي رضي الله عنهما",
    benefitAr:
      "علمه رسول الله ﷺ سبطه الحسن بن علي رضي الله عنهما ليقوله في قنوت الوتر.",
  },
  {
    id: "after-witr",
    titleAr: "الذكر المأثور بعد التسليم من صلاة الوتر",
    occasionAr: "بعد السلام من صلاة الوتر مباشرة",
    arabicText:
      "«سُبْحَانَ الْمَلِكِ الْقُدُّوسِ، سُبْحَانَ الْمَلِكِ الْقُدُّوسِ، سُبْحَانَ الْمَلِكِ الْقُدُّوسِ» (ثلاث مرات، ويرفع ويمدّ صوته في الثالثة).",
    sourceAr: "رواه أبو داود (١٤٣٠) والنسائي (١٧٣٢) بإسناد صحيح عن أُبي بن كعب رضي الله عنه",
    benefitAr:
      "سنة ثابتة عن النبي ﷺ يختم بها المسلم صلاة الليل والوتر في رمضان وغيره.",
  },
  {
    id: "guest-iftar",
    titleAr: "دعاء الصائم إذا أفطر عند قوم",
    occasionAr: "يُقال لأهل البيت الذين أطعموا الصائمين أو دعوهم للإفطار",
    arabicText:
      "«أَفْطَرَ عِنْدَكُمُ الصَّائِمُونَ، وَأَكَلَ طَعَامَكُمُ الْأَبْرَارُ، وَصَلَّتْ عَلَيْكُمُ الْمَلَائِكَةُ».",
    sourceAr: "رواه أبو داود (٣٨٥٤) وابن ماجه بسنَد صحيح عن أنس بن مالك رضي الله عنه",
    benefitAr:
      "من هدي النبي ﷺ مكافأة من صنع المعروف وأطعم الصائمين بالدعاء المبارك له.",
  },
];

export const RAMADAN_THIRTY_DAILY_DUAS: RamadanDailyDuaItem[] = [
  {
    day: 1,
    titleAr: "دعاء اليوم الأول — سؤال القبول والإعانة",
    arabicText:
      "اللَّهُمَّ أَعِنَّا فِيهِ عَلَى الصِّيَامِ وَالْقِيَامِ وَغَضِّ الْبَصَرِ وَحِفْظِ اللِّسَانِ، وَاجْعَلْنَا فِيهِ مِنَ الْمَقْبُولِينَ الْفَائِزِينَ بِرَحْمَتِكَ يَا أَرْحَمَ الرَّاحِمِينَ.",
    sourceAr: "من جوامع الدعاء المشروع في استقبال رمضان",
  },
  {
    day: 2,
    titleAr: "دعاء اليوم الثاني — الإعانة على الذكر والشكر",
    arabicText:
      "«اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ، وَشُكْرِكَ، وَحُسْنِ عِبَادَتِكَ».",
    sourceAr: "وصية النبي ﷺ لمعاذ بن جبل — رواه أبو داود والنسائي",
  },
  {
    day: 3,
    titleAr: "دعاء اليوم الثالث — الثبات والهداية",
    arabicText:
      "﴿رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً ۚ إِنَّكَ أَنتَ الْوَهَّابُ﴾.",
    sourceAr: "القرآن الكريم — سورة آل عمران: الآية ٨",
  },
  {
    day: 4,
    titleAr: "دعاء اليوم الرابع — سؤال الجنة والنجاة من النار",
    arabicText: "«اللَّهُمَّ إِنِّي أَسْأَلُكَ الْجَنَّةَ وَأَعُوذُ بِكَ مِنَ النَّارِ».",
    sourceAr: "رواه أبو داود وابن ماجه",
  },
  {
    day: 5,
    titleAr: "دعاء اليوم الخامس — الهداية والتقى والعفاف والغنى",
    arabicText:
      "«اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى».",
    sourceAr: "رواه مسلم (٢٧٢١) عن عبد الله بن مسعود رضي الله عنه",
  },
  {
    day: 6,
    titleAr: "دعاء اليوم السادس — صلاح الدين والدنيا والآخرة",
    arabicText:
      "«اللَّهُمَّ أَصْلِحْ لِي دِينِي الَّذِي هُوَ عِصْمَةُ أَمْرِي، وَأَصْلِحْ لِي دُنْيَايَ الَّتِي فِيهَا مَعَاشِي، وَأَصْلِحْ لِي آخِرَتِي الَّتِي فِيهَا مَعَادِي».",
    sourceAr: "رواه مسلم (٢٧٢٠) عن أبي هريرة رضي الله عنه",
  },
  {
    day: 7,
    titleAr: "دعاء اليوم السابع — العلم النافع والعمل المتقبل",
    arabicText:
      "«اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا».",
    sourceAr: "رواه ابن ماجه وأحمد عن أم سلمة رضي الله عنها",
  },
  {
    day: 8,
    titleAr: "دعاء اليوم الثامن — مغفرة الذنوب كلها",
    arabicText:
      "«اللَّهُمَّ اغْفِرْ لِي ذَنْبِي كُلَّهُ، دِقَّهُ وَجِلَّهُ، وَأَوَّلَهُ وَآخِرَهُ، وَعَلَانِيَتَهُ وَسِرَّهُ».",
    sourceAr: "رواه مسلم (٤٨٣) عن أبي هريرة رضي الله عنه",
  },
  {
    day: 9,
    titleAr: "دعاء اليوم التاسع — القبول كما تقبل من الصالحين",
    arabicText:
      "﴿رَبَّنَا تَقَبَّلْ مِنَّا ۖ إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ * وَتُبْ عَلَيْنَا ۖ إِنَّكَ أَنتَ التَّوَّابُ الرَّحِيمُ﴾.",
    sourceAr: "القرآن الكريم — سورة البقرة: ١٢٧-١٢٨",
  },
  {
    day: 10,
    titleAr: "دعاء اليوم العاشر — ختام العشر الأوائل بالرحمة",
    arabicText:
      "﴿رَبَّنَا آمَنَّا فَاغْفِرْ لَنَا وَارْحَمْنَا وَأَنتَ خَيْرُ الرَّاحِمِينَ﴾.",
    sourceAr: "القرآن الكريم — سورة المؤمنون: الآية ١٠٩",
  },
  {
    day: 11,
    titleAr: "دعاء اليوم الحادي عشر — حب الله وحب ما يقرب إليه",
    arabicText:
      "«اللَّهُمَّ إِنِّي أَسْأَلُكَ حُبَّكَ، وَحُبَّ مَنْ يُحِبُّكَ، وَالْعَمَلَ الَّذِي يُبَلِّغُنِي حُبَّكَ».",
    sourceAr: "رواه الترمذي (٣٤٩٠) عن معاذ بن جبل رضي الله عنه",
  },
  {
    day: 12,
    titleAr: "دعاء اليوم الثاني عشر — شرح الصدر وتيسير الأمر",
    arabicText:
      "﴿رَبِّ اشْرَحْ لِي صَدْرِي * وَيَسِّرْ لِي أَمْرِي﴾.",
    sourceAr: "القرآن الكريم — سورة طه: ٢٥-٢٦",
  },
  {
    day: 13,
    titleAr: "دعاء اليوم الثالث عشر — الاستعاذة من زوال النعمة",
    arabicText:
      "«اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ زَوَالِ نِعْمَتِكَ، وَتَحَوُّلِ عَافِيَتِكَ، وَفُجَاءَةِ نِقْمَتِكَ، وَجَمِيعِ سَخَطِكَ».",
    sourceAr: "رواه مسلم (٢٧٣٩) عن ابن عمر رضي الله عنهما",
  },
  {
    day: 14,
    titleAr: "دعاء اليوم الرابع عشر — قلب خاشع ونفس مطمئنة",
    arabicText:
      "«اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عِلْمٍ لَا يَنْفَعُ، وَمِنْ قَلْبٍ لَا يَخْشَعُ، وَمِنْ نَفْسٍ لَا تَشْبَعُ، وَمِنْ دَعْوَةٍ لَا يُسْتَجَابُ لَهَا».",
    sourceAr: "رواه مسلم (٢٧٢٢) عن زيد بن أرقم رضي الله عنه",
  },
  {
    day: 15,
    titleAr: "دعاء اليوم الخامس عشر — منتصف الشهر المبارك",
    arabicText:
      "«اللَّهُمَّ آتِ نَفْسِي تَقْوَاهَا، وَزَكِّهَا أَنْتَ خَيْرُ مَنْ زَكَّاهَا، أَنْتَ وَلِيُّهَا وَمَوْلَاهَا».",
    sourceAr: "رواه مسلم (٢٧٢٢)",
  },
  {
    day: 16,
    titleAr: "دعاء اليوم السادس عشر — الصبر والفرج والكرب",
    arabicText:
      "«لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ».",
    sourceAr: "سورة الأنبياء: ٨٧ — دعوة ذي النون",
  },
  {
    day: 17,
    titleAr: "دعاء اليوم السابع عشر — ذكرى نصر بدر والفرج",
    arabicText:
      "﴿رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَثَبِّتْ أَقْدَامَنَا وَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ﴾.",
    sourceAr: "القرآن الكريم — سورة البقرة: الآية ٢٥٠",
  },
  {
    day: 18,
    titleAr: "دعاء اليوم الثامن عشر — نور القلب والسمع والبصر",
    arabicText:
      "«اللَّهُمَّ اجْعَلْ فِي قَلْبِي نُورًا، وَفِي لِسَانِي نُورًا، وَفِي سَمْعِي نُورًا، وَفِي بَصَرِي نُورًا، وَأَعْظِمْ لِي نُورًا».",
    sourceAr: "متفق عليه — صحيح البخاري ومسلم",
  },
  {
    day: 19,
    titleAr: "دعاء اليوم التاسع عشر — صلاح الذرية والأهل",
    arabicText:
      "﴿رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا﴾.",
    sourceAr: "القرآن الكريم — سورة الفرقان: الآية ٧٤",
  },
  {
    day: 20,
    titleAr: "دعاء اليوم العشرين — التهيؤ للعشر الأواخر",
    arabicText:
      "«يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ، وَيَا مُصَرِّفَ الْقُلُوبِ صَرِّفْ قَلْبِي عَلَى طَاعَتِكَ».",
    sourceAr: "رواه مسلم والترمذي",
  },
  {
    day: 21,
    titleAr: "دعاء اليوم الحادي والعشرين — أولى ليالي الوتر",
    arabicText:
      "«اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي».",
    sourceAr: "رواه الترمذي وابن ماجه عن عائشة رضي الله عنها",
  },
  {
    day: 22,
    titleAr: "دعاء اليوم الثاني والعشرين — سؤال الفردوس الأعلى",
    arabicText:
      "«اللَّهُمَّ إِنِّي أَسْأَلُكَ الْفِرْدَوْسَ أَعْلَى الْجَنَّةِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ النَّارِ».",
    sourceAr: "صحيح البخاري (٢٧٩٠)",
  },
  {
    day: 23,
    titleAr: "دعاء اليوم الثالث والعشرين — ليلة وتر مباركة",
    arabicText:
      "«اللَّهُمَّ إِنِّي أَعُوذُ بِرِضَاكَ مِنْ سَخَطِكَ، وَبِمُعَافَاتِكَ مِنْ عُقُوبَتِكَ، وَأَعُوذُ بِكَ مِنْكَ لَا أُحْصِي ثَنَاءً عَلَيْكَ».",
    sourceAr: "رواه مسلم (٤٨٦) عن عائشة رضي الله عنها",
  },
  {
    day: 24,
    titleAr: "دعاء اليوم الرابع والعشرين — دعاء الوالدين والمؤمنين",
    arabicText:
      "﴿رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ﴾.",
    sourceAr: "القرآن الكريم — سورة إبراهيم: الآية ٤١",
  },
  {
    day: 25,
    titleAr: "دعاء اليوم الخامس والعشرين — ليلة وتر مباركة",
    arabicText:
      "«اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنَ الْخَيْرِ كُلِّهِ عَاجِلِهِ وَآجِلِهِ مَا عَلِمْتُ مِنْهُ وَمَا لَمْ أَعْلَمْ، وَأَعُوذُ بِكَ مِنَ الشَّرِّ كُلِّهِ عَاجِلِهِ وَآجِلِهِ».",
    sourceAr: "رواه ابن ماجه وأحمد وصححه الألباني",
  },
  {
    day: 26,
    titleAr: "دعاء اليوم السادس والعشرين — الاستغفار وسيد الاستغفار",
    arabicText:
      "«اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي».",
    sourceAr: "صحيح البخاري (٦٣٠٦) عن شداد بن أوس رضي الله عنه",
  },
  {
    day: 27,
    titleAr: "دعاء اليوم السابع والعشرين — تحري ليلة القدر المباركة",
    arabicText:
      "«اللَّهُمَّ إِنَّكَ عَفُوٌّ كَرِيمٌ تُحِبُّ الْعَفْوَ فَاعْفُ عَنَّا، وَاكْتُبْنَا اللّيْلَةَ مِنْ عُتَقَائِكَ مِنَ النَّارِ وَمِنَ السُّعَدَاءِ الْمَقْبُولِينَ».",
    sourceAr: "رواه الترمذي وابن ماجه",
  },
  {
    day: 28,
    titleAr: "دعاء اليوم الثامن والعشرين — حسن الخاتمة والرضوان",
    arabicText:
      "«اللَّهُمَّ أَحْسِنْ عَاقِبَتَنَا فِي الْأُمُورِ كُلِّهَا، وَأَجِرْنَا مِنْ خِزْيِ الدُّنْيَا وَعَذَابِ الْآخِرَةِ».",
    sourceAr: "رواه أحمد والطبراني",
  },
  {
    day: 29,
    titleAr: "دعاء اليوم التاسع والعشرين — آخر ليالي الوتر والعتق",
    arabicText:
      "﴿رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ﴾.",
    sourceAr: "القرآن الكريم — سورة البقرة: الآية ٢٠١ (أكثر دعاء النبي ﷺ)",
  },
  {
    day: 30,
    titleAr: "دعاء اليوم الثلاثين — ختام شهر رمضان والقبول",
    arabicText:
      "اللَّهُمَّ لَا تَجْعَلْ هَذَا آخِرَ الْعَهْدِ بِرَمَضَانَ، وَأَعِدْهُ عَلَيْنَا أَعْوَامًا عَدِيدَةً وَأَزْمِنَةً مَدِيدَةً فِي صِحَّةٍ وَعَافِيَةٍ وَإِيمَانٍ، وَتَقَبَّلْ مِنَّا الصِّيَامَ وَالْقِيَامَ وَصَالِحَ الْأَعْمَالِ.",
    sourceAr: "من أدعية السلف الصالح في وداع شهر رمضان",
  },
];
