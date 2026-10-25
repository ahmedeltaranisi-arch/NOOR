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
  QuranAudioMode,
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
export const ADHAN_AUDIO_STATE_EVENT = "noor:adhan-audio-state";

export interface AdhanVoiceMeta {
  id: AdhanSoundId;
  nameAr: string;
  titleAr: string;
  countryAr: string;
  category: "egypt" | "arab";
  styleAr: string;
  audioUrls: string[];
}

export const ADHAN_VOICES_META: AdhanVoiceMeta[] = [
  // أولا: عمالقة المدرسة المصرية (شيوخ مصر)
  {
    id: "abdulbasit",
    nameAr: "الشيخ عبد الباسط عبد الصمد",
    titleAr: "صوت مكة والقاهرة الخاشع",
    countryAr: "مصر",
    category: "egypt",
    styleAr: "أذان القاهرة التاريخي الخاشع والمؤثر",
    audioUrls: ["/audio/adhan/abdulbasit.mp3"],
  },
  {
    id: "refaat",
    nameAr: "الشيخ محمد رفعت",
    titleAr: "قيثارة السماء",
    countryAr: "مصر",
    category: "egypt",
    styleAr: "تسجيل أذان القاهرة التراثي النادر",
    audioUrls: ["/audio/adhan/refaat.mp3"],
  },
  {
    id: "minshawi",
    nameAr: "الشيخ محمد صديق المنشاوي",
    titleAr: "الصوت الباكي الخاشع",
    countryAr: "مصر",
    category: "egypt",
    styleAr: "أذان المدرسة المصرية بمقام الراست الأصيل",
    audioUrls: ["/audio/adhan/minshawi.mp3"],
  },
  {
    id: "hussary",
    nameAr: "الشيخ محمود خليل الحصري",
    titleAr: "شيخ عموم المقارئ المصرية",
    countryAr: "مصر",
    category: "egypt",
    styleAr: "أذان إذاعة القرآن الكريم من القاهرة",
    audioUrls: ["/audio/adhan/hussary.mp3"],
  },
  {
    id: "mustafa-ismail",
    nameAr: "الشيخ مصطفى إسماعيل",
    titleAr: "عبقري التلاوة والمقامات",
    countryAr: "مصر",
    category: "egypt",
    styleAr: "أذان مصري أصيل متقن المقامات",
    audioUrls: ["/audio/adhan/mustafa-ismail.mp3"],
  },
  {
    id: "banna",
    nameAr: "الشيخ محمود علي البنا",
    titleAr: "سفير القرآن الكريم",
    countryAr: "مصر",
    category: "egypt",
    styleAr: "أذان القاهرة الإذاعي العذب",
    audioUrls: ["/audio/adhan/banna.mp3"],
  },
  {
    id: "naqshbandi",
    nameAr: "الشيخ سيد النقشبندي",
    titleAr: "إمام المبتهلين",
    countryAr: "مصر",
    category: "egypt",
    styleAr: "أذان مصري روحاني خاشع ومهيب",
    audioUrls: ["/audio/adhan/naqshbandi.mp3"],
  },
  {
    id: "tobar",
    nameAr: "الشيخ نصر الدين طوبار",
    titleAr: "صوت السحر والابتهال",
    countryAr: "مصر",
    category: "egypt",
    styleAr: "أذان مصري شجي نادر من القاهرة",
    audioUrls: ["/audio/adhan/tobar.mp3"],
  },
  {
    id: "shuaisha",
    nameAr: "الشيخ أبو العينين شعيشع",
    titleAr: "نقيب قراء مصر السابق",
    countryAr: "مصر",
    category: "egypt",
    styleAr: "أذان القاهرة الكلاسيكي الرصين",
    audioUrls: ["/audio/adhan/shuaisha.mp3"],
  },
  {
    id: "nuinaa",
    nameAr: "الشيخ أحمد نعينع",
    titleAr: "قارئ المساجد الكبرى بمصر",
    countryAr: "مصر",
    category: "egypt",
    styleAr: "أذان القاهرة النديّ المتقن",
    audioUrls: ["/audio/adhan/nuinaa.mp3"],
  },
  {
    id: "islam-sobhi",
    nameAr: "الشيخ إسلام صبحي",
    titleAr: "القارئ المصري الشاب",
    countryAr: "مصر",
    category: "egypt",
    styleAr: "أذان هادئ شجي يبعث السكينة",
    audioUrls: ["/audio/adhan/islam-sobhi.mp3"],
  },
  // ثانيا: الحرمان الشريفان والمسجد الأقصى والعالم العربي
  {
    id: "makkah",
    nameAr: "الشيخ علي أحمد ملا (الحرم المكي)",
    titleAr: "شيخ مؤذني المسجد الحرام",
    countryAr: "مكة المكرمة",
    category: "arab",
    styleAr: "أذان المسجد الحرام بمكة المكرمة",
    audioUrls: ["/audio/adhan/makkah.mp3"],
  },
  {
    id: "madinah",
    nameAr: "أذان المسجد النبوي الشريف",
    titleAr: "مؤذنو الحرم النبوي",
    countryAr: "المدينة المنورة",
    category: "arab",
    styleAr: "الأذان المدني الروحاني من الروضة الشريفة",
    audioUrls: ["/audio/adhan/madinah.mp3"],
  },
  {
    id: "aqsa",
    nameAr: "أذان المسجد الأقصى المبارك",
    titleAr: "نداء أولى القبلتين",
    countryAr: "القدس الشريف",
    category: "arab",
    styleAr: "الأذان المقدسي العريق من رحاب الأقصى",
    audioUrls: ["/audio/adhan/aqsa.mp3"],
  },
  {
    id: "afasy",
    nameAr: "الشيخ مشاري راشد العفاسي",
    titleAr: "إمام المسجد الكبير",
    countryAr: "الكويت",
    category: "arab",
    styleAr: "أذان نديّ عذب فائق النقاء",
    audioUrls: ["/audio/adhan/afasy.mp3"],
  },
  {
    id: "qatami",
    nameAr: "الشيخ ناصر القطامي",
    titleAr: "إمام جامع القاضي بالرياض",
    countryAr: "السعودية",
    category: "arab",
    styleAr: "أذان خاشع ومؤثر",
    audioUrls: ["/audio/adhan/qatami.mp3"],
  },
  {
    id: "takbeer-only",
    nameAr: "تكبير صوتي مختصر (الشيخ عبد الباسط)",
    titleAr: "تكبير وتشهد بدون أذان كامل",
    countryAr: "مصر",
    category: "egypt",
    styleAr: "اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ (٢٥ ثانية فقط)",
    audioUrls: ["/audio/alerts/takbeer-egypt.mp3"],
  },
];

export function getAdhanVoiceMeta(adhanId?: AdhanSoundId): AdhanVoiceMeta {
  if (!adhanId) return ADHAN_VOICES_META[0];
  if (adhanId === "egypt-radio") {
    return ADHAN_VOICES_META.find((a) => a.id === "banna") || ADHAN_VOICES_META[0];
  }
  return ADHAN_VOICES_META.find((a) => a.id === adhanId) || ADHAN_VOICES_META[0];
}

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
      tone: "approaching-only",
      adhanSound: "abdulbasit",
      voiceAnnouncementEnabled: true,
    },
    sunrise: {
      enabled: false,
      preAlertMinutes: 10,
      iqamahMinutes: 0,
      tone: "approaching-only",
      adhanSound: "takbeer-only",
      voiceAnnouncementEnabled: true,
    },
    dhuhr: {
      enabled: true,
      preAlertMinutes: 10,
      iqamahMinutes: 15,
      tone: "approaching-only",
      adhanSound: "abdulbasit",
      voiceAnnouncementEnabled: true,
    },
    asr: {
      enabled: true,
      preAlertMinutes: 10,
      iqamahMinutes: 15,
      tone: "approaching-only",
      adhanSound: "abdulbasit",
      voiceAnnouncementEnabled: true,
    },
    maghrib: {
      enabled: true,
      preAlertMinutes: 10,
      iqamahMinutes: 10,
      tone: "approaching-only",
      adhanSound: "abdulbasit",
      voiceAnnouncementEnabled: true,
    },
    isha: {
      enabled: true,
      preAlertMinutes: 10,
      iqamahMinutes: 15,
      tone: "approaching-only",
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
let activeAudioState: {
  playing: boolean;
  labelAr: string | null;
  adhanId: AdhanSoundId | null;
} = {
  playing: false,
  labelAr: null,
  adhanId: null,
};

function notifyAudioState(
  playing: boolean,
  labelAr: string | null = null,
  adhanId: AdhanSoundId | null = null
): void {
  activeAudioState = { playing, labelAr, adhanId };
  if (isBrowser()) {
    window.dispatchEvent(
      new CustomEvent(ADHAN_AUDIO_STATE_EVENT, { detail: activeAudioState })
    );
  }
}

export function getActiveAudioState() {
  return activeAudioState;
}

export function stopFullAdhanAudio(): void {
  if (activeAdhanAudio) {
    try {
      activeAdhanAudio.onended = null;
      activeAdhanAudio.onerror = null;
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
  notifyAudioState(false, null, null);
}

function resolvePrayerSlugFromArabic(prayerNameAr: string): string {
  if (prayerNameAr.includes("الفجر") || prayerNameAr.includes("فجر")) return "fajr";
  if (prayerNameAr.includes("الشروق") || prayerNameAr.includes("شروق")) return "sunrise";
  if (prayerNameAr.includes("الظهر") || prayerNameAr.includes("ظهر")) return "dhuhr";
  if (prayerNameAr.includes("العصر") || prayerNameAr.includes("عصر")) return "asr";
  if (prayerNameAr.includes("المغرب") || prayerNameAr.includes("مغرب")) return "maghrib";
  if (prayerNameAr.includes("العشاء") || prayerNameAr.includes("عشاء")) return "isha";
  return "dhuhr";
}

/**
 * Speaks an Arabic notification phrase as fallback if audio file is unavailable.
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
 * Plays a pre-prayer approaching alert using verified pre-recorded MP3 files:
 * - approaching-only: "/audio/alerts/approaching-only-{prayer}.mp3" ("اقتربت صلاة ... فقط بدون تكبير")
 * - approaching-voice: "/audio/alerts/approaching-{prayer}.mp3" ("الله أكبر.. اقتربت صلاة ... حي على الصلاة")
 * - takbeer-voice: "/audio/alerts/takbeer-egypt.mp3" (Takbeer by Sheikh Abdul Basit)
 * - takbeer-echo: "/audio/alerts/takbeer-haram.mp3" (Takbeer of Makkah Haram by Sheikh Ali Ahmed Mulla)
 * - salawat-afasy: "/audio/alerts/salawat-afasy.mp3" (Salawat on the Prophet ﷺ by Mishary Al-Afasy)
 * - salawat-maher: "/audio/alerts/salawat-maher.mp3" (Salawat on the Prophet ﷺ by Maher Al-Muaiqly)
 */
export async function playApproachingPrayerAlert(
  prayerNameAr: string,
  _preMinutes = 10,
  tone: NotificationToneId = "approaching-only",
  onEnded?: () => void
): Promise<void> {
  if (!isBrowser() || tone === "silent") return;

  stopFullAdhanAudio();

  if (tone === "spiritual-chime" || tone === "soft-bell") {
    playNotificationTone(tone);
    if (onEnded) setTimeout(onEnded, 1500);
    return;
  }

  const slug = resolvePrayerSlugFromArabic(prayerNameAr);
  let alertAudioUrl = `/audio/alerts/approaching-only-${slug}.mp3`;
  let labelAr = `اقتربت صلاة ${prayerNameAr}`;

  if (tone === "approaching-voice") {
    alertAudioUrl = `/audio/alerts/approaching-${slug}.mp3`;
    labelAr = `الله أكبر.. اقتربت صلاة ${prayerNameAr}`;
  } else if (tone === "takbeer-voice") {
    alertAudioUrl = "/audio/alerts/takbeer-egypt.mp3";
    labelAr = "تكبير (الشيخ عبد الباسط عبد الصمد)";
  } else if (tone === "takbeer-echo") {
    alertAudioUrl = "/audio/alerts/takbeer-haram.mp3";
    labelAr = "تكبير الحرم المكي (الشيخ علي أحمد ملا)";
  } else if (tone === "salawat-afasy") {
    alertAudioUrl = "/audio/alerts/salawat-afasy.mp3";
    labelAr = "الصلاة على النبي ﷺ (الشيخ مشاري العفاسي)";
  } else if (tone === "salawat-maher") {
    alertAudioUrl = "/audio/alerts/salawat-maher.mp3";
    labelAr = "الصلاة على النبي ﷺ (الشيخ ماهر المعيقلي)";
  }

  try {
    const audio = new Audio(alertAudioUrl);
    activeAdhanAudio = audio;
    notifyAudioState(true, labelAr, null);
    audio.onended = () => {
      activeAdhanAudio = null;
      notifyAudioState(false, null, null);
      if (onEnded) onEnded();
    };
    audio.onerror = () => {
      activeAdhanAudio = null;
      notifyAudioState(false, null, null);
      if (onEnded) onEnded();
    };
    await audio.play();
  } catch {
    activeAdhanAudio = null;
    notifyAudioState(false, null, null);
    if (onEnded) onEnded();
  }
}

/**
 * Plays the full verified Adhan audio for the selected Sheikh from local /audio/adhan/*.mp3
 */
export async function playFullAdhanAudio(
  adhanId: AdhanSoundId = "abdulbasit",
  prayerNameAr = "الظهر",
  onEnded?: () => void
): Promise<void> {
  if (!isBrowser()) return;
  stopFullAdhanAudio();

  const meta = getAdhanVoiceMeta(adhanId);

  for (const url of meta.audioUrls) {
    try {
      const audio = new Audio(url);
      activeAdhanAudio = audio;
      notifyAudioState(true, `${meta.nameAr} — أذان ${prayerNameAr}`, meta.id);
      audio.onended = () => {
        activeAdhanAudio = null;
        notifyAudioState(false, null, null);
        if (onEnded) onEnded();
      };
      audio.onerror = () => {
        activeAdhanAudio = null;
        notifyAudioState(false, null, null);
        if (onEnded) onEnded();
      };
      await audio.play();
      return;
    } catch {
      // try next URL if any
    }
  }

  notifyAudioState(false, null, null);
  if (onEnded) onEnded();
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
  audioMode?: QuranAudioMode;
  smartCrossTriggerEnabled?: boolean;
  gaplessTightness?: "standard-overlap" | "deep-overlap";
}

export const DEFAULT_QURAN_PREFS: QuranReaderPrefs = {
  fontSizeLevel: 2,
  reciterId: "husary",
  viewMode: "mushaf",
  audioMode: "gapless-ayah",
  smartCrossTriggerEnabled: true,
  gaplessTightness: "deep-overlap",
};

export function getQuranPrefs(): QuranReaderPrefs {
  const saved = readStorage<QuranReaderPrefs>(STORAGE_KEYS.QURAN_PREFS, DEFAULT_QURAN_PREFS);
  return {
    ...DEFAULT_QURAN_PREFS,
    ...saved,
  };
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
