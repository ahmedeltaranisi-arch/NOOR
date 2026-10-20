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
