export interface CityLocation {
  id: string;
  nameAr: string;
  nameEn: string;
  latitude: number;
  longitude: number;
}

export interface Governorate {
  id: string;
  nameAr: string;
  nameEn: string;
  region: "القاهرة الكبرى" | "الدلتا" | "الإسكندرية والساحل" | "مدن القناة وسيناء" | "شمال الصعيد" | "جنوب الصعيد" | "المحافظات الحدودية";
  capitalId: string;
  latitude: number;
  longitude: number;
  cities: CityLocation[];
}

export interface UserLocation {
  governorateId: string;
  cityId: string;
  governorateNameAr: string;
  cityNameAr: string;
  latitude: number;
  longitude: number;
  isCustomGps?: boolean;
  updatedAt?: string;
}

export type PrayerId = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";
export type MandatoryPrayerId = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export type CalculationMethodId =
  | "Egyptian"
  | "MuslimWorldLeague"
  | "UmmAlQura"
  | "Karachi"
  | "Dubai"
  | "Kuwait"
  | "Qatar"
  | "NorthAmerica";

export type MadhabId = "Shafi" | "Hanafi";

export interface PrayerAdjustments {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

export interface PrayerCalculationSettings {
  method: CalculationMethodId;
  madhab: MadhabId;
  adjustments: PrayerAdjustments;
}

export interface PrayerTimeEntry {
  id: PrayerId;
  nameAr: string;
  time: Date;
  formattedTime12: string;
  formattedTime24: string;
  isObligatory: boolean;
  status: "passed" | "next" | "upcoming";
}

export interface DailyPrayerSchedule {
  date: Date;
  dateKey: string;
  gregorianFormatted: string;
  hijriFormatted: string;
  hijriDay: number;
  hijriMonthName: string;
  hijriYear: number;
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
  middleOfTheNight: Date;
  lastThirdOfTheNight: Date;
  entries: PrayerTimeEntry[];
  nextPrayer: {
    id: PrayerId;
    nameAr: string;
    time: Date;
    isTomorrowFajr: boolean;
    remainingSeconds: number;
    progressPercent: number;
  };
  currentPrayerId: PrayerId | null;
}

export type NotificationToneId =
  | "approaching-only"
  | "approaching-voice"
  | "takbeer-voice"
  | "takbeer-echo"
  | "salawat-afasy"
  | "salawat-maher"
  | "spiritual-chime"
  | "soft-bell"
  | "silent";

export type AdhanSoundId =
  | "abdulbasit"
  | "refaat"
  | "minshawi"
  | "hussary"
  | "mustafa-ismail"
  | "banna"
  | "naqshbandi"
  | "tobar"
  | "shuaisha"
  | "nuinaa"
  | "islam-sobhi"
  | "makkah"
  | "madinah"
  | "aqsa"
  | "afasy"
  | "qatami"
  | "egypt-radio"
  | "takbeer-only";

export interface SinglePrayerAlertConfig {
  enabled: boolean;
  preAlertMinutes: number; // 0, 5, 10, 15, 20, 30
  iqamahMinutes: number; // 0 = disabled, or 10, 15, 20, 30
  tone: NotificationToneId;
  adhanSound?: AdhanSoundId;
  voiceAnnouncementEnabled?: boolean;
}

export interface PrayerNotificationSettings {
  masterEnabled: boolean;
  adhanEnabled: boolean;
  selectedAdhanSound: AdhanSoundId;
  prePrayerVoiceEnabled: boolean;
  browserPermission: "default" | "granted" | "denied" | "unsupported";
  prayers: Record<PrayerId, SinglePrayerAlertConfig>;
}

export interface QiblaInfo {
  bearingDegrees: number;
  distanceKm: number;
  cardinalDirectionAr: string;
  kaabaCoordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface Ayah {
  id: number;
  text: string;
}

export interface SurahMeta {
  id: number;
  name: string;
  transliteration: string;
  type: "meccan" | "medinan";
  typeAr: "مكية" | "مدنية";
  totalVerses: number;
  juzStart: number;
  pageStart: number;
}

export interface SurahDetail extends SurahMeta {
  verses: Ayah[];
}

export interface JuzMeta {
  id: number;
  nameAr: string;
  titleAr: string;
  startSurahId: number;
  startSurahName: string;
  startAyah: number;
  endSurahId: number;
  endSurahName: string;
  endAyah: number;
  pageStart: number;
  pageEnd: number;
}

export interface JuzSurahSegment {
  surahId: number;
  surahName: string;
  surahTypeAr: "مكية" | "مدنية";
  totalSurahVerses: number;
  startAyah: number;
  endAyah: number;
  showBismillah: boolean;
  verses: Ayah[];
}

export interface JuzDetail extends JuzMeta {
  totalVersesInJuz: number;
  segments: JuzSurahSegment[];
}

export interface QuranSearchResult {
  surahId: number;
  surahName: string;
  ayahNumber: number;
  text: string;
}

export interface QuranBookmark {
  id: string;
  surahId: number;
  surahName: string;
  ayahNumber: number;
  ayahSnippet: string;
  createdAt: string;
  note?: string;
}

export interface LastReadPosition {
  surahId: number;
  surahName: string;
  ayahNumber: number;
  updatedAt: string;
}

export type WirdUnit = "ayahs" | "pages" | "juz";

export interface DailyWirdSettings {
  unit: WirdUnit;
  dailyTarget: number;
  weeklyTarget: number;
  reminderTime: string; // e.g. "20:00"
  reminderEnabled: boolean;
  currentProgressToday: number;
  lastUpdatedDate: string; // YYYY-MM-DD
  completedDates: string[]; // Array of YYYY-MM-DD
  history: Record<string, { target: number; unit: WirdUnit; completedAmount: number; completed: boolean }>;
}

export type QuranAudioMode = "gapless-ayah" | "continuous-surah";

export interface ReciterInfo {
  id: string;
  nameAr: string;
  styleAr: string;
  everyAyahFolder: string;
  surahAudioServerUrl?: string;
}

export type AdhkarCategoryId =
  | "morning"
  | "evening"
  | "after-prayer"
  | "sleep"
  | "waking"
  | "general"
  | "prophetic-duas";

export interface AdhkarCategoryMeta {
  id: AdhkarCategoryId;
  titleAr: string;
  subtitleAr: string;
  recommendedTimeAr: string;
  iconName: string;
}

export interface DhikrItem {
  id: string;
  category: AdhkarCategoryId;
  titleAr?: string;
  text: string;
  count: number;
  virtueAr?: string;
  sourceAr: string;
  gradeAr?: string;
}

export interface AdhkarDailyProgress {
  dateKey: string; // YYYY-MM-DD
  counts: Record<string, number>; // dhikrId -> currentCount
  favorites: string[]; // array of dhikrIds
}

export interface TasbeehPhrase {
  id: string;
  text: string;
  virtueAr: string;
  recommendedTarget: number;
  isCustom?: boolean;
}

export interface TasbeehState {
  activePhraseId: string;
  currentCount: number;
  targetCount: number;
  cyclesCompleted: number;
  vibrateEnabled: boolean;
  customPhrases: TasbeehPhrase[];
  dailyHistory: Record<string, { total: number; byPhrase: Record<string, number> }>;
  lifetimeTotal: number;
}

export interface HijriDateInfo {
  day: number;
  monthNumber: number;
  monthNameAr: string;
  year: number;
  formattedAr: string;
  weekdayAr: string;
}

export interface IslamicOccasion {
  id: string;
  titleAr: string;
  hijriMonth: number;
  hijriDay: number;
  descriptionAr: string;
  category: "عيد" | "عبادة" | "ذكرى تاريخية";
  requiresMoonSighting: boolean;
}

export interface AllahName {
  number: number;
  name: string;
  meaningAr: string;
}

export interface DailyInspirationContent {
  ayah: {
    surahId: number;
    surahName: string;
    ayahNumber: number;
    text: string;
    reflectionAr: string;
  };
  hadith: {
    text: string;
    narratorAr: string;
    sourceAr: string;
    gradeAr: string;
    explanationAr: string;
  };
  dhikr: {
    text: string;
    virtueAr: string;
    sourceAr: string;
  };
  dua: {
    text: string;
    sourceAr: string;
    occasionAr: string;
  };
}
