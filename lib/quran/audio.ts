import type { QuranAudioMode } from "@/types";

/**
 * Default lead time (in seconds) before the end of an Ayah MP3 file
 * to trigger the next preloaded Ayah (380ms = 0.38s) so trailing MP3
 * silence padding is completely bypassed with true audio overlap.
 */
export const SMART_CROSS_TRIGGER_LEAD_SECONDS = 0.38;

/**
 * Ultra-tight overlap lead time (520ms = 0.52s) for reciters whose
 * individual verse MP3s include longer trailing room silence.
 */
export const DEEP_OVERLAP_LEAD_SECONDS = 0.52;

/**
 * Leading silence offset (in seconds) pre-seeked on the standby <audio>
 * element while paused so the next verse begins immediately on the
 * Sheikh's vocal onset (180ms = 0.18s) with zero seek delay.
 */
export const START_SILENCE_SKIP_SECONDS = 0.18;

/**
 * Ultra-tight leading silence offset (240ms = 0.24s) for deep overlap mode.
 */
export const DEEP_START_SILENCE_SKIP_SECONDS = 0.24;

/**
 * Duration (in milliseconds) that the outgoing audio slot continues playing
 * concurrently after the incoming standby slot has started playing, ensuring
 * a 100% seamless zero-gap transition.
 */
export const AUDIO_OVERLAP_HOLD_MS = 180;

/**
 * Number of upcoming verses to preload into memory concurrently.
 */
export const PRELOAD_AHEAD_COUNT = 2;

/**
 * HTMLMediaElement.HAVE_ENOUGH_DATA constant (readyState === 4).
 */
export const HAVE_ENOUGH_DATA_READY_STATE = 4;

export type GaplessTightnessPreset = "standard-overlap" | "deep-overlap";

/**
 * Builds the audio URL for a specific Surah and Ayah using EveryAyah CDN format:
 * e.g. https://everyayah.com/data/Husary_128kbps/001001.mp3
 */
export function getAyahAudioUrl(
  surahId: number,
  ayahNumber: number,
  everyAyahFolder = "Husary_128kbps",
  baseUrlOverride?: string
): string {
  const baseUrl = (
    baseUrlOverride ||
    process.env.NEXT_PUBLIC_QURAN_AUDIO_CDN ||
    "https://everyayah.com/data"
  ).replace(/\/$/, "");
  const sPad = String(surahId).padStart(3, "0");
  const aPad = String(ayahNumber).padStart(3, "0");
  return `${baseUrl}/${everyAyahFolder}/${sPad}${aPad}.mp3`;
}

/**
 * Fallback CDN that mirrors the same SSS.mp3 naming for reciters whose
 * official mp3quran server is unreachable (e.g. الشيخ أحمد كاسب).
 */
export const SURAH_AUDIO_FALLBACK_SERVERS: Record<string, string> = {
  "ahmed-kasib": "https://archive.org/download/Ahmad-Kaseb",
};

/**
 * Returns the ordered list of whole-Surah stream URLs to try for a reciter:
 * the official server first, then any documented mirror.
 */
export function getSurahAudioUrlCandidates(
  surahId: number,
  reciter?: {
    id?: string;
    surahAudioServerUrl?: string;
  } | null
): string[] {
  const urls: string[] = [];
  const primary = getSurahFallbackAudioUrl(
    surahId,
    reciter?.surahAudioServerUrl
  );
  if (primary) urls.push(primary);
  const mirror =
    reciter?.id ? SURAH_AUDIO_FALLBACK_SERVERS[reciter.id] : undefined;
  if (mirror) {
    const mirrorUrl = getSurahFallbackAudioUrl(surahId, mirror);
    if (!urls.includes(mirrorUrl)) urls.push(mirrorUrl);
  }
  return urls;
}

/**
 * Reciters published as whole-Surah files only (no verse-by-verse audio)
 * can never use the per-Ayah gapless engine — they must always stream the
 * complete Surah and follow verse positions from the timeline instead.
 */
export function isSurahOnlyReciter(
  reciter?: { audioAvailability?: "ayah-and-surah" | "surah-only" } | null
): boolean {
  return reciter?.audioAvailability === "surah-only";
}

/**
 * Effective playback mode for a reciter: forces the continuous Surah stream
 * for reciters that have no verse-by-verse audio published.
 */
export function resolveAudioModeForReciter(
  mode: QuranAudioMode,
  reciter?: { audioAvailability?: "ayah-and-surah" | "surah-only" } | null
): QuranAudioMode {
  return isSurahOnlyReciter(reciter) ? "continuous-surah" : mode;
}

/**
 * Builds a full-Surah continuous stream MP3 URL from MP3Quran CDN:
 * e.g. https://server8.mp3quran.net/mustafa/001.mp3
 */
export function getSurahFallbackAudioUrl(
  surahId: number,
  surahAudioServerUrl?: string
): string {
  const base = (
    surahAudioServerUrl || "https://server13.mp3quran.net/husr"
  ).replace(/\/$/, "");
  const sPad = String(surahId).padStart(3, "0");
  return `${base}/${sPad}.mp3`;
}

/**
 * Computes the indices of the next N verses to preload into memory
 * (default: next 2 verses, [currentIndex + 1, currentIndex + 2]).
 */
export function getPreloadWindowIndices(
  currentIndex: number,
  totalLength: number,
  aheadCount: number = PRELOAD_AHEAD_COUNT
): number[] {
  const indices: number[] = [];
  if (currentIndex < 0 || totalLength <= 0) return indices;
  for (let offset = 1; offset <= aheadCount; offset++) {
    const candidate = currentIndex + offset;
    if (candidate >= 0 && candidate < totalLength) {
      indices.push(candidate);
    }
  }
  return indices;
}

/**
 * Computes the safe pre-seek start offset (in seconds) to skip leading silence
 * on a preloaded standby verse without clipping short verses.
 */
export function getEffectiveStartSkipSeconds(
  duration: number,
  targetSkip: number = START_SILENCE_SKIP_SECONDS
): number {
  if (!Number.isFinite(duration) || duration <= 0.8) {
    return 0;
  }
  return Math.min(targetSkip, duration * 0.08);
}

/**
 * Determines whether the Smart Cross-Trigger should advance to the preloaded
 * next verse (~380ms–520ms before the end of the current MP3 file) to eliminate
 * trailing silence padding with true overlap.
 */
export function shouldSmartCrossTrigger(
  currentTime: number,
  duration: number,
  leadSeconds: number = SMART_CROSS_TRIGGER_LEAD_SECONDS
): boolean {
  if (!Number.isFinite(currentTime) || !Number.isFinite(duration)) {
    return false;
  }
  if (duration <= 0.6) {
    return false;
  }
  // Scale lead time for shorter verses so it never exceeds 22% of total duration
  const effectiveLead = Math.min(leadSeconds, duration * 0.22);
  return currentTime >= duration - effectiveLead;
}

/**
 * Formats seconds as MM:SS or HH:MM:SS for continuous stream playback bars.
 */
export function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const totalSec = Math.floor(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const mStr = String(mins).padStart(2, "0");
  const sStr = String(secs).padStart(2, "0");
  if (hrs > 0) {
    return `${String(hrs).padStart(2, "0")}:${mStr}:${sStr}`;
  }
  return `${mStr}:${sStr}`;
}
