import { describe, expect, it } from "vitest";
import {
  EGYPT_GOVERNORATES,
  findNearestEgyptianCity,
  getCityByIds,
} from "@/data/egypt-governorates";
import {
  calculateDailyPrayerSchedule,
  calculateMonthlyPrayerSchedules,
  DEFAULT_CALCULATION_SETTINGS,
} from "@/lib/prayer-times";
import { calculateQiblaInfo, getShortestAngleDifference } from "@/lib/qibla";
import {
  getSurahDetailById,
  searchQuranVerses,
  SURAHS_META,
  QURAN_JUZ_META,
  getJuzDetailById,
} from "@/lib/quran";
import { getHijriDateInfo, normalizeArabicText } from "@/lib/utils";
import { ALLAH_NAMES, QURAN_RECITERS } from "@/data/daily-content";
import {
  AUDIO_OVERLAP_HOLD_MS,
  DEEP_OVERLAP_LEAD_SECONDS,
  DEEP_START_SILENCE_SKIP_SECONDS,
  formatAudioTime,
  getAyahAudioUrl,
  getEffectiveStartSkipSeconds,
  getPreloadWindowIndices,
  getSurahFallbackAudioUrl,
  HAVE_ENOUGH_DATA_READY_STATE,
  PRELOAD_AHEAD_COUNT,
  shouldSmartCrossTrigger,
  SMART_CROSS_TRIGGER_LEAD_SECONDS,
  START_SILENCE_SKIP_SECONDS,
} from "@/lib/quran/audio";
import { ADHKAR_CATEGORIES, ADHKAR_DATA } from "@/data/adhkar";
import {
  HADITH_BOOKS_META,
  loadHadithBookFile,
  queryHadiths,
  TOTAL_HADITH_BOOKS_COUNT,
  TOTAL_HADITH_CHAPTERS_COUNT,
  TOTAL_HADITHS_COUNT,
} from "@/lib/hadith";
import { ADHAN_VOICES_META } from "@/lib/storage/local-storage";
import fs from "fs";
import path from "path";

describe("1. المحافظات المصرية الـ 27 وتحديد الموقع", () => {
  it("يدعم جميع محافظات جمهورية مصر العربية الـ 27 كاملة مع مدنها وإحداثياتها", () => {
    expect(EGYPT_GOVERNORATES.length).toBe(27);

    const requiredGovNames = [
      "القاهرة",
      "الجيزة",
      "الإسكندرية",
      "الدقهلية",
      "دمياط",
      "الشرقية",
      "الغربية",
      "المنوفية",
      "القليوبية",
      "كفر الشيخ",
      "البحيرة",
      "الإسماعيلية",
      "السويس",
      "بورسعيد",
      "شمال سيناء",
      "جنوب سيناء",
      "البحر الأحمر",
      "الفيوم",
      "بني سويف",
      "المنيا",
      "أسيوط",
      "سوهاج",
      "قنا",
      "الأقصر",
      "أسوان",
      "الوادي الجديد",
      "مطروح",
    ];

    const actualNames = EGYPT_GOVERNORATES.map((g) => g.nameAr);
    for (const name of requiredGovNames) {
      expect(actualNames).toContain(name);
    }

    for (const gov of EGYPT_GOVERNORATES) {
      expect(gov.cities.length).toBeGreaterThanOrEqual(4);
      for (const city of gov.cities) {
        expect(city.latitude).toBeGreaterThan(21.5);
        expect(city.latitude).toBeLessThan(32.0);
        expect(city.longitude).toBeGreaterThan(24.5);
        expect(city.longitude).toBeLessThan(37.0);
      }
    }
  });

  it("يحدد أقرب مدينة مصرية بدقة من الإحداثيات الجغرافية (دمياط والقاهرة)", () => {
    const damiettaLoc = findNearestEgyptianCity(31.4175, 31.8144);
    expect(damiettaLoc.governorateId).toBe("damietta");
    expect(damiettaLoc.governorateNameAr).toBe("دمياط");

    const cairoLoc = findNearestEgyptianCity(30.0444, 31.2357);
    expect(cairoLoc.governorateId).toBe("cairo");
    expect(cairoLoc.governorateNameAr).toBe("القاهرة");
  });
});

describe("2. حسابات مواقيت الصلاة الفلكية (الهيئة المصرية العامة للمساحة)", () => {
  const testDate = new Date("2026-10-20T10:00:00Z");

  it("يحسب الصلوات الخمس والشروق بترتيب زمني صحيح", () => {
    const schedule = calculateDailyPrayerSchedule(
      30.0444,
      31.2357,
      testDate,
      DEFAULT_CALCULATION_SETTINGS,
      testDate
    );

    expect(schedule.fajr.getTime()).toBeLessThan(schedule.sunrise.getTime());
    expect(schedule.sunrise.getTime()).toBeLessThan(schedule.dhuhr.getTime());
    expect(schedule.dhuhr.getTime()).toBeLessThan(schedule.asr.getTime());
    expect(schedule.asr.getTime()).toBeLessThan(schedule.maghrib.getTime());
    expect(schedule.maghrib.getTime()).toBeLessThan(schedule.isha.getTime());
  });

  it("تختلف المواقيت باختلاف المدينة داخل المحافظة أو بين المحافظات (القاهرة، الإسكندرية، دمياط، أسوان)", () => {
    const cairo = calculateDailyPrayerSchedule(30.0444, 31.2357, testDate);
    const alex = calculateDailyPrayerSchedule(31.2001, 29.9187, testDate);
    const damietta = calculateDailyPrayerSchedule(31.4175, 31.8144, testDate);

    // Alexandria is west of Cairo, so Dhuhr in Alexandria is later than Cairo
    expect(alex.dhuhr.getTime()).toBeGreaterThan(cairo.dhuhr.getTime());
    // Damietta is east of Cairo, so Dhuhr in Damietta is earlier than Cairo
    expect(damietta.dhuhr.getTime()).toBeLessThan(cairo.dhuhr.getTime());

    // Different cities inside Damietta governorate have distinct coordinates
    const damiettaCity = getCityByIds("damietta", "ras-el-bar")!;
    const zarqaCity = getCityByIds("damietta", "zarqa")!;
    const sched1 = calculateDailyPrayerSchedule(
      damiettaCity.city.latitude,
      damiettaCity.city.longitude,
      testDate
    );
    const sched2 = calculateDailyPrayerSchedule(
      zarqaCity.city.latitude,
      zarqaCity.city.longitude,
      testDate
    );
    expect(sched1.fajr.getTime()).not.toBe(sched2.fajr.getTime());
  });

  it("يطبق المذهب الحنفي والفروق الزمنية اليدوية بدقة", () => {
    const shafiSched = calculateDailyPrayerSchedule(
      30.0444,
      31.2357,
      testDate,
      DEFAULT_CALCULATION_SETTINGS
    );
    const hanafiSched = calculateDailyPrayerSchedule(30.0444, 31.2357, testDate, {
      ...DEFAULT_CALCULATION_SETTINGS,
      madhab: "Hanafi",
    });

    // Hanafi Asr is later than Shafi Asr
    expect(hanafiSched.asr.getTime()).toBeGreaterThan(shafiSched.asr.getTime());

    // Manual offset +5 minutes on Fajr
    const adjustedSched = calculateDailyPrayerSchedule(30.0444, 31.2357, testDate, {
      ...DEFAULT_CALCULATION_SETTINGS,
      adjustments: {
        ...DEFAULT_CALCULATION_SETTINGS.adjustments,
        fajr: 5,
      },
    });
    const diffMinutes = Math.round(
      (adjustedSched.fajr.getTime() - shafiSched.fajr.getTime()) / 60000
    );
    expect(diffMinutes).toBe(5);
  });

  it("يولد جدول مواقيت الشهر كاملًا بعدد أيام الشهر الصحيح", () => {
    const octoberSchedules = calculateMonthlyPrayerSchedules(
      31.4175,
      31.8144,
      2026,
      9 // October (0-indexed)
    );
    expect(octoberSchedules.length).toBe(31);
  });
});

describe("3. حسابات اتجاه القبلة والمسافة إلى الكعبة المشرفة", () => {
  it("يحسب زاوية القبلة والمسافة من القاهرة ودمياط وأسوان بدقة", () => {
    const cairoQibla = calculateQiblaInfo(30.0444, 31.2357);
    expect(cairoQibla.bearingDegrees).toBeGreaterThan(135);
    expect(cairoQibla.bearingDegrees).toBeLessThan(137);
    expect(cairoQibla.distanceKm).toBeGreaterThan(1270);
    expect(cairoQibla.distanceKm).toBeLessThan(1300);
    expect(cairoQibla.cardinalDirectionAr).toContain("الجنوب الشرقي");

    const damiettaQibla = calculateQiblaInfo(31.4175, 31.8144);
    expect(damiettaQibla.bearingDegrees).toBeGreaterThan(141);
    expect(damiettaQibla.bearingDegrees).toBeLessThan(144);

    expect(getShortestAngleDifference(136, 136)).toBe(0);
    expect(getShortestAngleDifference(350, 10)).toBe(20);
  });
});

describe("4. التقويم الهجري والقرآن الكريم والأذكار وأسماء الله الحسنى", () => {
  it("يحول التاريخ الميلادي إلى هجري بصورة صحيحة", () => {
    const hijri = getHijriDateInfo(new Date("2026-10-20T12:00:00Z"));
    expect(hijri.year).toBeGreaterThanOrEqual(1448);
    expect(hijri.day).toBeGreaterThanOrEqual(1);
    expect(hijri.day).toBeLessThanOrEqual(30);
    expect(hijri.monthNameAr.length).toBeGreaterThan(2);
  });

  it("يتضمن القرآن الكريم 114 سورة و6236 آية ويدعم البحث بدون تشكيل", () => {
    expect(SURAHS_META.length).toBe(114);
    const totalVerses = SURAHS_META.reduce((acc, s) => acc + s.totalVerses, 0);
    expect(totalVerses).toBe(6236);

    const fatiha = getSurahDetailById(1);
    expect(fatiha?.name).toBe("الفاتحة");
    expect(fatiha?.verses.length).toBe(7);

    const results = searchQuranVerses("الكرسي", 10);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].surahId).toBe(2);
    expect(results[0].ayahNumber).toBe(255);

    expect(normalizeArabicText("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ")).toBe("بسم الله الرحمن");

    // Verify all 30 Juzs cover all 6,236 verses accurately without gaps or duplicates
    expect(QURAN_JUZ_META.length).toBe(30);
    let totalVersesAcross30Juzs = 0;
    for (let j = 1; j <= 30; j++) {
      const juzDetail = getJuzDetailById(j);
      expect(juzDetail).toBeDefined();
      expect(juzDetail!.segments.length).toBeGreaterThanOrEqual(1);
      expect(juzDetail!.totalVersesInJuz).toBeGreaterThan(100);
      totalVersesAcross30Juzs += juzDetail!.totalVersesInJuz;
    }
    expect(totalVersesAcross30Juzs).toBe(6236);

    // Verify all 11 requested Sheikhs are present for Juz & Surah recitation
    expect(QURAN_RECITERS.length).toBe(11);
    const expectedSheikhs = [
      "الشيخ عبد الباسط عبد الصمد",
      "الشيخ محمد صديق المنشاوي",
      "الشيخ محمود خليل الحصري",
      "الشيخ مصطفى إسماعيل",
      "الشيخ ماهر المعيقلي",
      "الشيخ عبد الرحمن السديس",
      "الشيخ مشاري بن راشد العفاسي",
      "الشيخ ياسر الدوسري",
      "الشيخ أحمد بن علي العجمي",
      "الشيخ فارس عباد",
      "الشيخ ناصر القطامي",
    ];
    for (const sName of expectedSheikhs) {
      expect(QURAN_RECITERS.map((r) => r.nameAr)).toContain(sName);
    }
  });

  it("يتضمن جميع تصنيفات الأذكار الـ 7 وأسماء الله الحسنى الـ 99", () => {
    expect(ADHKAR_CATEGORIES.length).toBe(7);
    expect(ADHKAR_DATA.length).toBeGreaterThanOrEqual(30);
    expect(ALLAH_NAMES.length).toBe(99);
  });

  it("يتحقق من وجود وصلاحية جميع ملفات صوت الأذان للشيوخ وتنبيهات اقتراب الصلاة محليًا", () => {
    expect(ADHAN_VOICES_META.length).toBe(17);

    // Every Sheikh voice must have an existing, non-empty local MP3 file
    for (const voice of ADHAN_VOICES_META) {
      expect(voice.audioUrls.length).toBeGreaterThanOrEqual(1);
      for (const relUrl of voice.audioUrls) {
        const diskPath = path.join(process.cwd(), "public", relUrl);
        expect(fs.existsSync(diskPath)).toBe(true);
        const stat = fs.statSync(diskPath);
        expect(stat.size).toBeGreaterThan(50 * 1024); // > 50 KB
      }
    }

    // Every approaching prayer alert & Salawat/Takbeer file must exist and be non-empty
    const requiredAlerts = [
      "approaching-only-fajr.mp3",
      "approaching-only-sunrise.mp3",
      "approaching-only-dhuhr.mp3",
      "approaching-only-asr.mp3",
      "approaching-only-maghrib.mp3",
      "approaching-only-isha.mp3",
      "approaching-fajr.mp3",
      "approaching-sunrise.mp3",
      "approaching-dhuhr.mp3",
      "approaching-asr.mp3",
      "approaching-maghrib.mp3",
      "approaching-isha.mp3",
      "takbeer-egypt.mp3",
      "takbeer-haram.mp3",
      "salawat-afasy.mp3",
      "salawat-maher.mp3",
    ];
    for (const filename of requiredAlerts) {
      const alertPath = path.join(process.cwd(), "public", "audio", "alerts", filename);
      expect(fs.existsSync(alertPath)).toBe(true);
      const stat = fs.statSync(alertPath);
      expect(stat.size).toBeGreaterThan(8 * 1024); // > 8 KB
    }
  });

  it("يدعم التحميل المسبق المزدوج للآيتين القادمتين والدمج المتداخل الصفري (0% فاصل) والبث المتصل للسور", () => {
    expect(PRELOAD_AHEAD_COUNT).toBe(2);
    expect(HAVE_ENOUGH_DATA_READY_STATE).toBe(4);
    expect(SMART_CROSS_TRIGGER_LEAD_SECONDS).toBe(0.38);
    expect(DEEP_OVERLAP_LEAD_SECONDS).toBe(0.52);
    expect(START_SILENCE_SKIP_SECONDS).toBe(0.18);
    expect(DEEP_START_SILENCE_SKIP_SECONDS).toBe(0.24);
    expect(AUDIO_OVERLAP_HOLD_MS).toBe(180);

    // Preload window returns exact next 2 verses in the playlist
    expect(getPreloadWindowIndices(0, 7)).toEqual([1, 2]);
    expect(getPreloadWindowIndices(5, 7)).toEqual([6]);
    expect(getPreloadWindowIndices(6, 7)).toEqual([]);

    // Pre-seek start silence skip scales safely for normal and short verses
    expect(getEffectiveStartSkipSeconds(5.0, DEEP_START_SILENCE_SKIP_SECONDS)).toBe(0.24);
    expect(getEffectiveStartSkipSeconds(0.5, DEEP_START_SILENCE_SKIP_SECONDS)).toBe(0);

    // Smart Cross-Trigger activates before trailing silence (380ms standard / 520ms deep)
    expect(shouldSmartCrossTrigger(4.2, 5.0)).toBe(false);
    expect(shouldSmartCrossTrigger(4.65, 5.0)).toBe(true);
    expect(shouldSmartCrossTrigger(4.5, 5.0, DEEP_OVERLAP_LEAD_SECONDS)).toBe(true);
    expect(shouldSmartCrossTrigger(0.2, 0.4)).toBe(false); // ignores tiny durations <= 0.6s

    // Every reciter has both EveryAyah folder and continuous Surah stream server URL
    for (const rec of QURAN_RECITERS) {
      expect(getAyahAudioUrl(1, 1, rec.everyAyahFolder)).toContain("/001001.mp3");
      expect(rec.surahAudioServerUrl).toBeTruthy();
      expect(getSurahFallbackAudioUrl(2, rec.surahAudioServerUrl)).toContain("/002.mp3");
    }

    expect(formatAudioTime(125)).toBe("02:05");
  });

  it("يتضمن موسوعة الأحاديث النبوية الشريفة الكاملة (50,759 حديثًا في 17 كتابًا و607 أبواب)", () => {
    expect(HADITH_BOOKS_META.length).toBe(17);
    expect(TOTAL_HADITH_BOOKS_COUNT).toBe(17);

    let sumHadiths = 0;
    let sumChapters = 0;
    for (const meta of HADITH_BOOKS_META) {
      const bookData = loadHadithBookFile(meta.slug);
      expect(bookData.hadiths.length).toBe(meta.totalHadiths);
      expect(bookData.chapters.length).toBe(meta.totalChapters);
      sumHadiths += bookData.hadiths.length;
      sumChapters += bookData.chapters.length;
    }

    expect(sumHadiths).toBe(TOTAL_HADITHS_COUNT);
    expect(sumHadiths).toBe(50759);
    expect(sumChapters).toBe(TOTAL_HADITH_CHAPTERS_COUNT);
    expect(sumChapters).toBe(607);

    // Verify diacritics-insensitive Arabic Hadith search
    const nawawiSearch = queryHadiths({
      bookSlug: "nawawi40",
      query: "انما الاعمال بالنيات",
      page: 1,
      pageSize: 10,
    });
    expect(nawawiSearch.totalItems).toBeGreaterThanOrEqual(1);
    expect(nawawiSearch.items[0].id).toBe(1);
  });
});
