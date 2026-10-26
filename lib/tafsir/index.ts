import fs from "fs";
import path from "path";
import { getSurahDetailById, SURAHS_META } from "@/lib/quran";
import { normalizeArabicText } from "@/lib/utils";
import {
  AyahCompareTafsirResult,
  AyahTafsirEntry,
  SurahTafsirResult,
  TafsirBookMeta,
  TafsirBookSlug,
} from "@/types";
import {
  getTafsirBookMeta,
  TAFSIR_BOOKS_META,
  TOTAL_QURAN_SURAHS_COUNT,
  TOTAL_QURAN_VERSES_COUNT,
  TOTAL_TAFSIR_BOOKS_COUNT,
} from "./meta";

export {
  getTafsirBookMeta,
  SURAHS_META,
  TAFSIR_BOOKS_META,
  TOTAL_QURAN_SURAHS_COUNT,
  TOTAL_QURAN_VERSES_COUNT,
  TOTAL_TAFSIR_BOOKS_COUNT,
};

interface RawTafsirBookFile {
  slug: TafsirBookSlug;
  surahs: Record<string, string[]>;
}

const tafsirCache = new Map<TafsirBookSlug, RawTafsirBookFile>();

export function loadTafsirBookFile(slug: TafsirBookSlug): RawTafsirBookFile {
  const cached = tafsirCache.get(slug);
  if (cached) return cached;

  const filePath = path.join(
    process.cwd(),
    "data",
    "tafsir-books",
    `${slug}.json`
  );
  const rawJson = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(rawJson) as RawTafsirBookFile;
  tafsirCache.set(slug, parsed);
  return parsed;
}

export function getSurahTafsirData(options: {
  tafsirSlug?: TafsirBookSlug;
  surahId?: number;
  ayahNumber?: number | null;
  query?: string;
}): SurahTafsirResult {
  const tafsirMeta: TafsirBookMeta =
    getTafsirBookMeta(options.tafsirSlug || "muyassar") || TAFSIR_BOOKS_META[0];
  const safeSurahId = Math.min(114, Math.max(1, options.surahId || 1));
  const surahDetail = getSurahDetailById(safeSurahId) || getSurahDetailById(1)!;

  const mainBook = loadTafsirBookFile(tafsirMeta.slug);
  const ma3anyBook =
    tafsirMeta.slug !== "ma3any" ? loadTafsirBookFile("ma3any") : null;

  const surahTafsirs = mainBook.surahs[String(safeSurahId)] || [];
  const surahMa3any = ma3anyBook?.surahs[String(safeSurahId)] || [];

  const cleanQuery = options.query ? normalizeArabicText(options.query) : "";

  const entries: AyahTafsirEntry[] = [];
  for (const verse of surahDetail.verses) {
    if (options.ayahNumber && verse.id !== options.ayahNumber) {
      continue;
    }
    const tText = surahTafsirs[verse.id - 1] || "";
    const mText = surahMa3any[verse.id - 1] || "";

    if (cleanQuery) {
      const normVerse = normalizeArabicText(verse.text);
      const normTafsir = normalizeArabicText(tText);
      if (!normVerse.includes(cleanQuery) && !normTafsir.includes(cleanQuery)) {
        continue;
      }
    }

    entries.push({
      ayahNumber: verse.id,
      ayahText: verse.text,
      tafsirText: tText,
      wordMeaningsText: mText || undefined,
    });
  }

  return {
    tafsirMeta,
    surahId: surahDetail.id,
    surahName: surahDetail.name,
    surahTypeAr: surahDetail.typeAr,
    totalVerses: surahDetail.totalVerses,
    juzStart: surahDetail.juzStart,
    pageStart: surahDetail.pageStart,
    entries,
  };
}

export function getAyahAllTafsirs(
  surahId: number,
  ayahNumber: number
): AyahCompareTafsirResult {
  const safeSurahId = Math.min(114, Math.max(1, surahId || 1));
  const surahDetail = getSurahDetailById(safeSurahId) || getSurahDetailById(1)!;
  const safeAyahNum = Math.min(
    surahDetail.totalVerses,
    Math.max(1, ayahNumber || 1)
  );
  const verseObj =
    surahDetail.verses.find((v) => v.id === safeAyahNum) ||
    surahDetail.verses[0];

  const comparisons = TAFSIR_BOOKS_META.map((bookMeta) => {
    const bookFile = loadTafsirBookFile(bookMeta.slug);
    const surahArr = bookFile.surahs[String(safeSurahId)] || [];
    const text = surahArr[safeAyahNum - 1] || "";
    return {
      bookMeta,
      text,
    };
  });

  return {
    surahId: surahDetail.id,
    surahName: surahDetail.name,
    ayahNumber: safeAyahNum,
    ayahText: verseObj.text,
    totalVerses: surahDetail.totalVerses,
    comparisons,
  };
}
