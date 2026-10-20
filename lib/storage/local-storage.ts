import { DEFAULT_USER_LOCATION } from "@/data/egypt-governorates";
import { DEFAULT_CALCULATION_SETTINGS } from "@/lib/prayer-times";
import { getLocalDateKey } from "@/lib/utils";
import {
  AdhanSoundId,
  AdhkarDailyProgress,
  DailyWirdSettings,
  LastReadPosition,
  NotificationToneId,
  PrayerCalculationSettings,
  PrayerNotificationSettings,
  QuranBookmark,
  TasbeehState,
  UserLocation,
} from "@/types";

export const STORAGE_KEYS = {
  THEME: "noor_theme",
  LOCATION: "noor_user_location",
  PRAYER_SETTINGS: "noor_prayer_settings",
  PRAYER_NOTIFICATIONS: "noor_prayer_notifications",
  QURAN_LAST_READ: "noor_quran_last_read",
  QURAN_BOOKMARKS: "noor_quran_bookmarks",
  QURAN_PREFS: "noor_quran_prefs",
  DAILY_WIRD: "noor_daily_wird",
  ADHKAR_PROGRESS: "noor_adhkar_progress",
  TASBEEH_STATE: "noor_tasbeeh_state",
} as const;

export const STORAGE_CHANGE_EVENT = "noor-storage-change";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readStorage<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT, { detail: { key } }));
  } catch {
    // Ignore quota errors gracefully
  }
}

// 1. Location
export function getSavedLocation(): UserLocation {
  return readStorage<UserLocation>(STORAGE_KEYS.LOCATION, DEFAULT_USER_LOCATION);
}

export function saveLocation(location: UserLocation): void {
  writeStorage(STORAGE_KEYS.LOCATION, {
    ...location,
    updatedAt: new Date().toISOString(),
  });
}

// 2. Prayer Calculation Settings
export function getSavedPrayerSettings(): PrayerCalculationSettings {
  const saved = readStorage<PrayerCalculationSettings>(
    STORAGE_KEYS.PRAYER_SETTINGS,
    DEFAULT_CALCULATION_SETTINGS
  );
  return {
    ...DEFAULT_CALCULATION_SETTINGS,
    ...saved,
    adjustments: {
      ...DEFAULT_CALCULATION_SETTINGS.adjustments,
      ...(saved?.adjustments || {}),
    },
  };
}

export function savePrayerSettings(settings: PrayerCalculationSettings): void {
  writeStorage(STORAGE_KEYS.PRAYER_SETTINGS, settings);
}

// 3. Prayer Notifications & Adhan Audio
export const ADHAN_VOICES_META: {
  id: AdhanSoundId;
  nameAr: string;
  styleAr: string;
  audioUrls: string[];
}[] = [
  {
    id: "abdulbasit",
    nameAr: "الشيخ عبد الباسط عبد الصمد",
    styleAr: "أذان مصري خاشع ومؤثر",
    audioUrls: [
      "https://www.islamcan.com/audio/adhan/azan1.mp3",
      "https://cdn.aladhan.com/audio/adhans/a1.mp3",
    ],
  },
  {
    id: "egypt-radio",
    nameAr: "أذان المدرسة المصرية (إذاعة القرآن الكريم)",
    styleAr: "مقام الراست المصري الأصيل",
    audioUrls: [
      "https://www.islamcan.com/audio/adhan/azan6.mp3",
      "https://www.islamcan.com/audio/adhan/azan1.mp3",
    ],
  },
  {
    id: "makkah",
    nameAr: "أذان الحرم المكي الشريف (الشيخ علي أحمد ملا)",
    styleAr: "المسجد الحرام - مكة المكرمة",
    audioUrls: [
      "https://www.islamcan.com/audio/adhan/azan2.mp3",
      "https://cdn.aladhan.com/audio/adhans/a2.mp3",
    ],
  },
  {
    id: "madinah",
    nameAr: "أذان المسجد النبوي الشريف",
    styleAr: "المدينة المنورة",
    audioUrls: [
      "https://www.islamcan.com/audio/adhan/azan3.mp3",
      "https://cdn.aladhan.com/audio/adhans/a3.mp3",
    ],
  },
  {
    id: "afasy",
    nameAr: "الشيخ مشاري راشد العفاسي",
    styleAr: "أذان نديّ عذب",
    audioUrls: [
      "https://www.islamcan.com/audio/adhan/azan16.mp3",
      "https://www.islamcan.com/audio/adhan/azan2.mp3",
    ],
  },
  {
    id: "takbeer-only",
    nameAr: "تكبير صوتي مختصر فقط (بدون أذان كامل)",
    styleAr: "الله أكبر الله أكبر + تنبيه ناطق",
    audioUrls: [],
  },
];

export const DEFAULT_PRAYER_NOTIFICATIONS: PrayerNotificationSettings = {
  masterEnabled: true,
  adhanEnabled: true,
  selectedAdhanSound: "abdulbasit",
  prePrayerVoiceEnabled: true,
  browserPermission: "default",
  prayers: {
    fajr: {
      enabled: true,
      preAlertMinutes: 15,
      iqamahMinutes: 20,
      tone: "approaching-voice",
      adhanSound: "abdulbasit",
      voiceAnnouncementEnabled: true,
    },
    sunrise: {
      enabled: false,
      preAlertMinutes: 10,
      iqamahMinutes: 0,
      tone: "soft-bell",
      adhanSound: "takbeer-only",
      voiceAnnouncementEnabled: true,
    },
    dhuhr: {
      enabled: true,
      preAlertMinutes: 10,
      iqamahMinutes: 15,
      tone: "approaching-voice",
      adhanSound: "abdulbasit",
      voiceAnnouncementEnabled: true,
    },
    asr: {
      enabled: true,
      preAlertMinutes: 10,
      iqamahMinutes: 15,
      tone: "approaching-voice",
      adhanSound: "abdulbasit",
      voiceAnnouncementEnabled: true,
    },
    maghrib: {
      enabled: true,
      preAlertMinutes: 10,
      iqamahMinutes: 10,
      tone: "approaching-voice",
      adhanSound: "abdulbasit",
      voiceAnnouncementEnabled: true,
    },
    isha: {
      enabled: true,
      preAlertMinutes: 10,
      iqamahMinutes: 15,
      tone: "approaching-voice",
      adhanSound: "abdulbasit",
      voiceAnnouncementEnabled: true,
    },
  },
};

export function getSavedPrayerNotifications(): PrayerNotificationSettings {
  const saved = readStorage<PrayerNotificationSettings>(
    STORAGE_KEYS.PRAYER_NOTIFICATIONS,
    DEFAULT_PRAYER_NOTIFICATIONS
  );
  return {
    ...DEFAULT_PRAYER_NOTIFICATIONS,
    ...saved,
    prayers: {
      ...DEFAULT_PRAYER_NOTIFICATIONS.prayers,
      ...(saved?.prayers || {}),
    },
  };
}

export function savePrayerNotifications(settings: PrayerNotificationSettings): void {
  writeStorage(STORAGE_KEYS.PRAYER_NOTIFICATIONS, settings);
}

let activeAdhanAudio: HTMLAudioElement | null = null;

export function stopFullAdhanAudio(): void {
  if (activeAdhanAudio) {
    try {
      activeAdhanAudio.pause();
      activeAdhanAudio.currentTime = 0;
    } catch {
      // ignore
    }
    activeAdhanAudio = null;
  }
  if (isBrowser() && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

/**
 * Speaks an Arabic notification phrase (e.g. "الله أكبر الله أكبر، اقتربت صلاة الظهر")
 * using the browser's Arabic SpeechSynthesis engine.
 */
export function speakArabicAlert(text: string): void {
  if (!isBrowser() || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ar-EG";
    utterance.rate = 0.92;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const arabicVoice =
      voices.find((v) => v.lang.startsWith("ar-EG")) ||
      voices.find((v) => v.lang.startsWith("ar-SA")) ||
      voices.find((v) => v.lang.startsWith("ar"));

    if (arabicVoice) {
      utterance.voice = arabicVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch {
    // ignore speech synthesis restrictions
  }
}

/**
 * Plays a pre-prayer approaching alert: e.g. "الله أكبر الله أكبر.. اقتربت صلاة الظهر"
 */
export function playApproachingPrayerAlert(
  prayerNameAr: string,
  preMinutes = 10,
  tone: NotificationToneId = "approaching-voice"
): void {
  if (!isBrowser() || tone === "silent") return;

  playNotificationTone(tone);

  if (tone === "approaching-voice" || tone === "takbeer-voice") {
    const text =
      tone === "takbeer-voice"
        ? `اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ. اقتربت صلاة ${prayerNameAr}`
        : preMinutes > 0
        ? `اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ. اقتربت صلاة ${prayerNameAr}، يتبقى ${preMinutes} دقائق على موعد الأذان`
        : `اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ. اقتربت صلاة ${prayerNameAr}`;

    setTimeout(() => {
      speakArabicAlert(text);
    }, 350);
  }
}

/**
 * Plays the full Adhan audio for a Sheikh at prayer time, with fallback to spoken Takbeer/Adhan.
 */
export async function playFullAdhanAudio(
  adhanId: AdhanSoundId = "abdulbasit",
  prayerNameAr = "الظهر",
  onEnded?: () => void
): Promise<void> {
  if (!isBrowser()) return;
  stopFullAdhanAudio();

  const meta =
    ADHAN_VOICES_META.find((a) => a.id === adhanId) || ADHAN_VOICES_META[0];

  if (adhanId === "takbeer-only" || meta.audioUrls.length === 0) {
    playNotificationTone("takbeer-echo");
    setTimeout(() => {
      speakArabicAlert(
        `اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ. حان الآن موعد أذان صلاة ${prayerNameAr}. حَيَّ عَلَى الصَّلَاةِ، حَيَّ عَلَى الْفَلَاحِ.`
      );
      if (onEnded) setTimeout(onEnded, 6000);
    }, 500);
    return;
  }

  for (const url of meta.audioUrls) {
    try {
      const audio = new Audio(url);
      activeAdhanAudio = audio;
      audio.onended = () => {
        activeAdhanAudio = null;
        if (onEnded) onEnded();
      };
      await audio.play();
      return;
    } catch {
      // try next fallback URL
    }
  }

  // Fallback if offline or external audio blocked
  playNotificationTone("takbeer-echo");
  setTimeout(() => {
    speakArabicAlert(
      `اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ. حان الآن موعد أذان صلاة ${prayerNameAr}. أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ، أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ، حَيَّ عَلَى الصَّلَاةِ، حَيَّ عَلَى الْفَلَاحِ، اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ، لَا إِلَهَ إِلَّا اللَّهُ.`
    );
    if (onEnded) setTimeout(onEnded, 9000);
  }, 400);
}

// Synthesizes legal, pleasant spiritual notification tones via Web Audio API
export function playNotificationTone(tone: NotificationToneId): void {
  if (!isBrowser() || tone === "silent") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playNote = (
      freq: number,
      startTime: number,
      duration: number,
      gainPeak = 0.2
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(gainPeak, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    if (tone === "spiritual-chime") {
      playNote(528, now, 0.5, 0.18);
      playNote(660, now + 0.25, 0.6, 0.18);
      playNote(792, now + 0.5, 0.9, 0.2);
    } else if (
      tone === "takbeer-echo" ||
      tone === "takbeer-voice" ||
      tone === "approaching-voice"
    ) {
      playNote(440, now, 0.35, 0.2);
      playNote(587.33, now + 0.2, 0.45, 0.22);
      playNote(659.25, now + 0.42, 0.45, 0.2);
      playNote(880, now + 0.65, 0.9, 0.24);
    } else if (tone === "soft-bell") {
      playNote(587.33, now, 0.8, 0.16);
      playNote(880, now + 0.3, 1.0, 0.14);
    }
  } catch {
    // Ignore audio context restriction errors
  }
}

// 4. Quran State & Daily Wird
export function getLastReadPosition(): LastReadPosition | null {
  return readStorage<LastReadPosition | null>(STORAGE_KEYS.QURAN_LAST_READ, null);
}

export function saveLastReadPosition(pos: LastReadPosition): void {
  writeStorage(STORAGE_KEYS.QURAN_LAST_READ, pos);
}

export function getQuranBookmarks(): QuranBookmark[] {
  return readStorage<QuranBookmark[]>(STORAGE_KEYS.QURAN_BOOKMARKS, []);
}

export function toggleQuranBookmark(bookmark: Omit<QuranBookmark, "id" | "createdAt">): {
  added: boolean;
  bookmarks: QuranBookmark[];
} {
  const existing = getQuranBookmarks();
  const id = `${bookmark.surahId}:${bookmark.ayahNumber}`;
  const foundIndex = existing.findIndex((b) => b.id === id);

  let updated: QuranBookmark[];
  let added: boolean;

  if (foundIndex >= 0) {
    updated = existing.filter((b) => b.id !== id);
    added = false;
  } else {
    updated = [
      {
        ...bookmark,
        id,
        createdAt: new Date().toISOString(),
      },
      ...existing,
    ];
    added = true;
  }

  writeStorage(STORAGE_KEYS.QURAN_BOOKMARKS, updated);
  return { added, bookmarks: updated };
}

export interface QuranReaderPrefs {
  fontSizeLevel: 1 | 2 | 3 | 4;
  reciterId: string;
  viewMode: "mushaf" | "cards";
}

export const DEFAULT_QURAN_PREFS: QuranReaderPrefs = {
  fontSizeLevel: 2,
  reciterId: "husary",
  viewMode: "mushaf",
};

export function getQuranPrefs(): QuranReaderPrefs {
  return readStorage<QuranReaderPrefs>(STORAGE_KEYS.QURAN_PREFS, DEFAULT_QURAN_PREFS);
}

export function saveQuranPrefs(prefs: QuranReaderPrefs): void {
  writeStorage(STORAGE_KEYS.QURAN_PREFS, prefs);
}

export const DEFAULT_DAILY_WIRD: DailyWirdSettings = {
  unit: "pages",
  dailyTarget: 4,
  weeklyTarget: 28,
  reminderTime: "20:00",
  reminderEnabled: false,
  currentProgressToday: 0,
  lastUpdatedDate: getLocalDateKey(),
  completedDates: [],
  history: {},
};

export function getDailyWird(): DailyWirdSettings {
  const saved = readStorage<DailyWirdSettings>(STORAGE_KEYS.DAILY_WIRD, DEFAULT_DAILY_WIRD);
  const todayKey = getLocalDateKey();

  if (saved.lastUpdatedDate !== todayKey) {
    const resetForToday: DailyWirdSettings = {
      ...DEFAULT_DAILY_WIRD,
      ...saved,
      currentProgressToday: saved.history?.[todayKey]?.completedAmount || 0,
      lastUpdatedDate: todayKey,
    };
    return resetForToday;
  }

  return {
    ...DEFAULT_DAILY_WIRD,
    ...saved,
  };
}

export function saveDailyWird(wird: DailyWirdSettings): void {
  writeStorage(STORAGE_KEYS.DAILY_WIRD, wird);
}

// 5. Adhkar Daily Progress (auto-resets counts on new day while keeping favorites)
export function getAdhkarDailyProgress(): AdhkarDailyProgress {
  const todayKey = getLocalDateKey();
  const fallback: AdhkarDailyProgress = {
    dateKey: todayKey,
    counts: {},
    favorites: [],
  };

  const saved = readStorage<AdhkarDailyProgress>(STORAGE_KEYS.ADHKAR_PROGRESS, fallback);
  if (saved.dateKey !== todayKey) {
    const resetProgress: AdhkarDailyProgress = {
      dateKey: todayKey,
      counts: {},
      favorites: saved.favorites || [],
    };
    writeStorage(STORAGE_KEYS.ADHKAR_PROGRESS, resetProgress);
    return resetProgress;
  }

  return {
    dateKey: todayKey,
    counts: saved.counts || {},
    favorites: saved.favorites || [],
  };
}

export function saveAdhkarDailyProgress(progress: AdhkarDailyProgress): void {
  writeStorage(STORAGE_KEYS.ADHKAR_PROGRESS, progress);
}

// 6. Tasbeeh State
export const DEFAULT_TASBEEH_STATE: TasbeehState = {
  activePhraseId: "subhan-allah",
  currentCount: 0,
  targetCount: 33,
  cyclesCompleted: 0,
  vibrateEnabled: true,
  customPhrases: [],
  dailyHistory: {},
  lifetimeTotal: 0,
};

export function getTasbeehState(): TasbeehState {
  const saved = readStorage<TasbeehState>(STORAGE_KEYS.TASBEEH_STATE, DEFAULT_TASBEEH_STATE);
  return {
    ...DEFAULT_TASBEEH_STATE,
    ...saved,
    customPhrases: saved.customPhrases || [],
    dailyHistory: saved.dailyHistory || {},
  };
}

export function saveTasbeehState(state: TasbeehState): void {
  writeStorage(STORAGE_KEYS.TASBEEH_STATE, state);
}

// 7. Privacy & Data Management
export function exportAllLocalData(): Record<string, unknown> {
  if (!isBrowser()) return {};
  const data: Record<string, unknown> = {};
  Object.values(STORAGE_KEYS).forEach((key) => {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      try {
        data[key] = JSON.parse(raw);
      } catch {
        data[key] = raw;
      }
    }
  });
  return data;
}

export function clearAllLocalData(): void {
  if (!isBrowser()) return;
  Object.values(STORAGE_KEYS).forEach((key) => {
    window.localStorage.removeItem(key);
  });
  window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT, { detail: { key: "ALL" } }));
}
