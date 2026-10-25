/**
 * Default lead time (in seconds) before the end of an Ayah MP3 file
 * to trigger the next preloaded Ayah (120ms = 0.12s) so trailing MP3
 * padding silence is bypassed seamlessly.
 */
export const SMART_CROSS_TRIGGER_LEAD_SECONDS = 0.12;

/**
 * Number of upcoming verses to preload into memory concurrently.
 */
export const PRELOAD_AHEAD_COUNT = 2;

/**
 * HTMLMediaElement.HAVE_ENOUGH_DATA constant (readyState === 4).
 */
export const HAVE_ENOUGH_DATA_READY_STATE = 4;

/**
 * Builds the audio URL for a specific Surah and Ayah using EveryAyah CDN format:
 * e.g. https://everyayah.com/data/Husary_128kbps/001001.mp3
 */
export function getAyahAudioUrl(
  surahId: number,
  ayahNumber: number,
  everyAyahFolder = "Husary_128kbps"
): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_QURAN_AUDIO_CDN || "https://everyayah.com/data";
  const sPad = String(surahId).padStart(3, "0");
  const aPad = String(ayahNumber).padStart(3, "0");
  return `${baseUrl}/${everyAyahFolder}/${sPad}${aPad}.mp3`;
}

/**
 * Builds a full-Surah continuous stream MP3 URL from MP3Quran CDN:
 * e.g. https://server8.mp3quran.net/mustafa/001.mp3
 */
export function getSurahFallbackAudioUrl(
  surahId: number,
  surahAudioServerUrl?: string
): string | null {
  if (!surahAudioServerUrl) return null;
  const sPad = String(surahId).padStart(3, "0");
  return `${surahAudioServerUrl.replace(/\/$/, "")}/${sPad}.mp3`;
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
 * Determines whether the Smart Cross-Trigger should advance to the preloaded
 * next verse (~120ms before the end of the current MP3 file) to eliminate
 * trailing silence padding.
 */
export function shouldSmartCrossTrigger(
  currentTime: number,
  duration: number,
  leadSeconds: number = SMART_CROSS_TRIGGER_LEAD_SECONDS
): boolean {
  if (!Number.isFinite(currentTime) || !Number.isFinite(duration)) {
    return false;
  }
  // Ensure the file is long enough (> 0.6s) before applying early cross-trigger
  if (duration <= Math.max(0.6, leadSeconds * 3)) {
    return false;
  }
  return currentTime >= duration - leadSeconds;
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
