import { DEFAULT_USER_LOCATION } from "@/data/egypt-governorates";
import { DEFAULT_CALCULATION_SETTINGS } from "@/lib/prayer-times";
import { getLocalDateKey } from "@/lib/utils";
import {
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

// 3. Prayer Notifications
export const DEFAULT_PRAYER_NOTIFICATIONS: PrayerNotificationSettings = {
  masterEnabled: true,
  browserPermission: "default",
  prayers: {
    fajr: { enabled: true, preAlertMinutes: 15, iqamahMinutes: 20, tone: "takbeer-echo" },
    sunrise: { enabled: false, preAlertMinutes: 10, iqamahMinutes: 0, tone: "soft-bell" },
    dhuhr: { enabled: true, preAlertMinutes: 10, iqamahMinutes: 15, tone: "spiritual-chime" },
    asr: { enabled: true, preAlertMinutes: 10, iqamahMinutes: 15, tone: "spiritual-chime" },
    maghrib: { enabled: true, preAlertMinutes: 10, iqamahMinutes: 10, tone: "takbeer-echo" },
    isha: { enabled: true, preAlertMinutes: 10, iqamahMinutes: 15, tone: "spiritual-chime" },
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

//Synthesizes legal, pleasant spiritual notification tones via Web Audio API
export function playNotificationTone(tone: NotificationToneId): void {
  if (!isBrowser() || tone === "silent") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playNote = (freq: number, startTime: number, duration: number, gainPeak = 0.2) => {
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
    } else if (tone === "takbeer-echo") {
      playNote(440, now, 0.4, 0.2);
      playNote(587.33, now + 0.22, 0.5, 0.22);
      playNote(659.25, now + 0.48, 0.5, 0.2);
      playNote(880, now + 0.75, 1.0, 0.24);
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
