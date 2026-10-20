import type { MetadataRoute } from "next";
import { SURAHS_META } from "@/lib/quran/metadata";
import { getSiteUrl } from "@/lib/utils";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/prayer-times`, lastModified: now, changeFrequency: "daily", priority: 0.95 },
    { url: `${baseUrl}/qibla`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/quran`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
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

  return [...staticRoutes, ...surahRoutes];
}
