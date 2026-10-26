import type { Metadata } from "next";
import { TafsirExplorerClient } from "@/components/tafsir/TafsirExplorerClient";
import { getAyahAllTafsirs, getSurahTafsirData } from "@/lib/tafsir";
import { getTafsirBookMeta } from "@/lib/tafsir/meta";
import { TafsirBookSlug } from "@/types";

export const metadata: Metadata = {
  title:
    "تفسير القرآن الكريم — ٧ تفاسير معتمدة لـ ١١٤ سورة و٦,٢٣٦ آية | نور NOOR",
  description:
    "موسوعة تفسير القرآن الكريم الكاملة: التفسير الميسر، تفسير السعدي، تفسير ابن كثير، تفسير القرطبي، تفسير البغوي، معاني كلمات القرآن، وإعراب القرآن الكريم لجميع السور الـ ١١٤ والآيات الـ ٦,٢٣٦ مع إمكانية مقارنة التفاسير السبعة.",
};

interface TafsirPageProps {
  searchParams?: Promise<{
    book?: string;
    surah?: string;
    ayah?: string;
    tab?: string;
  }>;
}

export default async function TafsirPage({ searchParams }: TafsirPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const validMeta = resolvedParams.book
    ? getTafsirBookMeta(resolvedParams.book)
    : undefined;
  const bookSlug: TafsirBookSlug = validMeta ? validMeta.slug : "muyassar";

  const parsedSurah = resolvedParams.surah
    ? parseInt(resolvedParams.surah, 10)
    : 1;
  const surahId =
    Number.isFinite(parsedSurah) && parsedSurah >= 1 && parsedSurah <= 114
      ? parsedSurah
      : 1;

  const parsedAyah = resolvedParams.ayah
    ? parseInt(resolvedParams.ayah, 10)
    : undefined;

  const initialSurahTafsir = getSurahTafsirData({
    tafsirSlug: bookSlug,
    surahId,
    ayahNumber: parsedAyah,
  });

  const initialCompareData = getAyahAllTafsirs(surahId, parsedAyah || 1);

  const initialTab =
    resolvedParams.tab === "compare"
      ? "compare"
      : resolvedParams.tab === "books"
      ? "books"
      : "reader";

  return (
    <div className="mx-auto max-w-7xl px-3.5 py-5 sm:px-6 sm:py-8 lg:px-8">
      <TafsirExplorerClient
        initialSurahTafsir={initialSurahTafsir}
        initialCompareData={initialCompareData}
        initialTab={initialTab}
      />
    </div>
  );
}
