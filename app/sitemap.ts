import type { MetadataRoute } from "next";
import { SURAHS_META } from "@/lib/quran/metadata";
import { QURAN_JUZ_META } from "@/lib/quran/juz";
import { HADITH_BOOKS_META } from "@/lib/hadith/meta";
import { TAFSIR_BOOKS_META } from "@/lib/tafsir/meta";
import { getSiteUrl } from "@/lib/utils";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/prayer-times`, lastModified: now, changeFrequency: "daily", priority: 0.95 },
    { url: `${baseUrl}/qibla`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/quran`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${baseUrl}/hadith`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${baseUrl}/tafsir`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${baseUrl}/ramadan`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/adhkar`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/adhkar/morning`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/adhkar/evening`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/tasbeeh`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${baseUrl}/calendar`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: `${baseUrl}/settings`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];

  const surahRoutes: MetadataRoute.Sitemap = SURAHS_META.map((surah) => ({
    url: `${baseUrl}/quran/${surah.id}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  // All 30 Juzs (each Juz is divided into 2 Ahzab and 8 Quarters)
  const juzRoutes: MetadataRoute.Sitemap = QURAN_JUZ_META.map((juz) => ({
    url: `${baseUrl}/quran/juz/${juz.id}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const hadithBookRoutes: MetadataRoute.Sitemap = HADITH_BOOKS_META.map(
    (book) => ({
      url: `${baseUrl}/hadith/${book.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.75,
    })
  );

  const tafsirBookRoutes: MetadataRoute.Sitemap = TAFSIR_BOOKS_META.map(
    (book) => ({
      url: `${baseUrl}/tafsir/${book.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.75,
    })
  );

  return [
    ...staticRoutes,
    ...juzRoutes,
    ...surahRoutes,
    ...hadithBookRoutes,
    ...tafsirBookRoutes,
  ];
}
