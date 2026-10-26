import fs from "fs";
import path from "path";
import {
  HadithBookMeta,
  HadithBookSlug,
  HadithChapterItem,
  HadithItem,
  HadithPageResult,
} from "@/types";
import {
  getHadithBookMeta,
  HADITH_BOOKS_META,
  TOTAL_HADITH_BOOKS_COUNT,
  TOTAL_HADITH_CHAPTERS_COUNT,
  TOTAL_HADITHS_COUNT,
} from "./meta";

export {
  getHadithBookMeta,
  HADITH_BOOKS_META,
  TOTAL_HADITH_BOOKS_COUNT,
  TOTAL_HADITH_CHAPTERS_COUNT,
  TOTAL_HADITHS_COUNT,
};

interface RawHadithBookFile {
  slug: HadithBookSlug;
  chapters: HadithChapterItem[];
  hadiths: { id: number; cid: number; text: string; normText?: string }[];
  chapterTitleMap?: Map<number, string>;
}

const bookCache = new Map<HadithBookSlug, RawHadithBookFile>();

/**
 * Strips Arabic diacritics (tashkeel) and normalizes Alef/Ta-Marbuta/Ya
 * so users can search Hadiths with or without tashkeel effortlessly.
 */
export function normalizeArabicHadithText(input: string): string {
  return input
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

export function loadHadithBookFile(slug: HadithBookSlug): RawHadithBookFile {
  const cached = bookCache.get(slug);
  if (cached) return cached;

  const filePath = path.join(
    process.cwd(),
    "data",
    "hadith-books",
    `${slug}.json`
  );
  const rawJson = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(rawJson) as RawHadithBookFile;

  const chapterTitleMap = new Map<number, string>();
  for (const ch of parsed.chapters) {
    chapterTitleMap.set(ch.id, ch.title);
  }
  parsed.chapterTitleMap = chapterTitleMap;

  bookCache.set(slug, parsed);
  return parsed;
}

export function queryHadiths(options: {
  bookSlug?: HadithBookSlug | "all";
  chapterId?: number | null;
  hadithId?: number | null;
  query?: string;
  page?: number;
  pageSize?: number;
}): HadithPageResult {
  const bookSlug = options.bookSlug || "bukhari";
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(50, Math.max(5, options.pageSize || 20));
  const rawQuery = (options.query || "").trim();
  const normQuery = rawQuery ? normalizeArabicHadithText(rawQuery) : "";
  const numericQuery =
    rawQuery && /^\d+$/.test(rawQuery) ? parseInt(rawQuery, 10) : null;

  // Case 1: Global search across ALL 17 Hadith books (50,759 Hadiths)
  if (bookSlug === "all") {
    const matchedItems: HadithItem[] = [];
    for (const meta of HADITH_BOOKS_META) {
      const bookData = loadHadithBookFile(meta.slug);
      for (const h of bookData.hadiths) {
        if (options.hadithId && h.id !== options.hadithId) continue;
        if (normQuery) {
          if (numericQuery !== null && h.id === numericQuery) {
            // direct hadith number match
          } else {
            if (!h.normText) {
              h.normText = normalizeArabicHadithText(h.text);
            }
            if (!h.normText.includes(normQuery)) continue;
          }
        }
        matchedItems.push({
          id: h.id,
          cid: h.cid,
          text: h.text,
          chapterTitle: bookData.chapterTitleMap?.get(h.cid) || meta.shortTitleAr,
          bookSlug: meta.slug,
          bookTitleAr: meta.shortTitleAr,
          gradeBadgeAr: meta.gradeBadgeAr,
        });
      }
    }

    const totalItems = matchedItems.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);
    const startIdx = (safePage - 1) * pageSize;

    return {
      bookSlug: "all",
      chapters: [],
      selectedChapterId: null,
      page: safePage,
      pageSize,
      totalItems,
      totalPages,
      items: matchedItems.slice(startIdx, startIdx + pageSize),
    };
  }

  // Case 2: Specific Hadith Book (e.g. bukhari, muslim, riyad_assalihin, nawawi40...)
  const meta: HadithBookMeta =
    getHadithBookMeta(bookSlug) || HADITH_BOOKS_META[0];
  const bookData = loadHadithBookFile(meta.slug);

  const selectedChapterId =
    options.chapterId !== undefined && options.chapterId !== null
      ? options.chapterId
      : null;

  const filtered = bookData.hadiths.filter((h) => {
    if (selectedChapterId !== null && h.cid !== selectedChapterId) {
      return false;
    }
    if (options.hadithId && h.id !== options.hadithId) {
      return false;
    }
    if (normQuery) {
      if (numericQuery !== null && h.id === numericQuery) {
        return true;
      }
      if (!h.normText) {
        h.normText = normalizeArabicHadithText(h.text);
      }
      return h.normText.includes(normQuery);
    }
    return true;
  });

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;

  const items: HadithItem[] = filtered
    .slice(startIdx, startIdx + pageSize)
    .map((h) => ({
      id: h.id,
      cid: h.cid,
      text: h.text,
      chapterTitle:
        bookData.chapterTitleMap?.get(h.cid) || meta.shortTitleAr,
      bookSlug: meta.slug,
      bookTitleAr: meta.shortTitleAr,
      gradeBadgeAr: meta.gradeBadgeAr,
    }));

  return {
    bookSlug: meta.slug,
    bookMeta: meta,
    chapters: bookData.chapters,
    selectedChapterId,
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
    items,
  };
}
