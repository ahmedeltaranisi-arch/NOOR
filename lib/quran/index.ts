import quranRawData from "@/data/quran-uthmani.json";
import { Ayah, QuranSearchResult, SurahDetail } from "@/types";
import { SURAHS_META, getSurahMetaById } from "@/lib/quran/metadata";
import {
  QURAN_JUZ_META,
  getJuzMetaById,
  getJuzDetailById,
} from "@/lib/quran/juz";
import { normalizeArabicText } from "@/lib/utils";

interface RawSurah {
  id: number;
  name: string;
  transliteration: string;
  type: "meccan" | "medinan";
  total_verses: number;
  verses: Ayah[];
}

const QURAN_DATA = quranRawData as RawSurah[];

export {
  SURAHS_META,
  getSurahMetaById,
  QURAN_JUZ_META,
  getJuzMetaById,
  getJuzDetailById,
};

export function getSurahDetailById(surahId: number): SurahDetail | undefined {
  const raw = QURAN_DATA.find((s) => s.id === surahId);
  const meta = getSurahMetaById(surahId);
  if (!raw || !meta) return undefined;

  return {
    ...meta,
    verses: raw.verses,
  };
}

/**
 * Expands Uthmani Dagger Alif (U+0670) into standard Alif (ا) when not on Alif Maqsurah/Waw,
 * so users searching in standard Imlai spelling (e.g. "الصراط", "الكتاب", "العالمين", "غشاوة", "إبراهيم")
 * match Uthmani verses alongside direct Uthmani searches (e.g. "الرحمن", "ذلك").
 */
function normalizeArabicWithExpandedDaggerAlef(text: string): string {
  const expanded = text
    .replace(/[\u0640\u202F\u00A0]?\u0670(?![\u0649\u06CC\u064A\u0627])/g, "ا");
  return normalizeArabicText(expanded);
}

/**
 * Full-text diacritic-insensitive search across all 6,236 Quranic verses.
 */
export function searchQuranVerses(query: string, limit = 40): QuranSearchResult[] {
  const cleanQuery = normalizeArabicText(query);
  if (!cleanQuery || cleanQuery.length < 2) return [];

  // Also strip leading "ال" or "ايه " for root matching (e.g. "الكرسي" -> "كرسي" matches "كرسيه")
  const strippedAl = cleanQuery
    .replace(/^ايه\s+/, "")
    .replace(/^ال/, "")
    .trim();

  const results: QuranSearchResult[] = [];

  for (const surah of QURAN_DATA) {
    for (const verse of surah.verses) {
      const normalizedVerse = normalizeArabicText(verse.text);
      const expandedVerse = normalizeArabicWithExpandedDaggerAlef(verse.text);
      if (
        normalizedVerse.includes(cleanQuery) ||
        expandedVerse.includes(cleanQuery) ||
        (strippedAl.length >= 3 &&
          (normalizedVerse.includes(strippedAl) ||
            expandedVerse.includes(strippedAl)))
      ) {
        results.push({
          surahId: surah.id,
          surahName: surah.name,
          ayahNumber: verse.id,
          text: verse.text,
        });
        if (results.length >= limit) {
          return results;
        }
      }
    }
  }

  return results;
}

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
