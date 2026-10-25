import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  QURAN_JUZ_META,
  getJuzDetailById,
  getJuzMetaById,
} from "@/lib/quran";
import { JuzReaderClient } from "@/components/quran/JuzReaderClient";

export function generateStaticParams() {
  return QURAN_JUZ_META.map((j) => ({
    juz: String(j.id),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ juz: string }>;
}): Promise<Metadata> {
  const { juz: juzParam } = await params;
  const juzId = parseInt(juzParam, 10);
  const meta = getJuzMetaById(juzId);

  if (!meta) {
    return {
      title: "الجزء غير موجود",
    };
  }

  return {
    title: `${meta.nameAr} من القرآن الكريم (${meta.titleAr}) — قراءة بالرسم العثماني`,
    description: `قراءة ${meta.nameAr} من المصحف الشريف بالرسم العثماني الكامل (من سورة ${meta.startSurahName} آية ${meta.startAyah} إلى سورة ${meta.endSurahName} آية ${meta.endAyah} — الصفحات ${meta.pageStart} إلى ${meta.pageEnd}).`,
  };
}

export default async function JuzReaderPage({
  params,
}: {
  params: Promise<{ juz: string }>;
}) {
  const { juz: juzParam } = await params;
  const juzId = parseInt(juzParam, 10);

  if (Number.isNaN(juzId) || juzId < 1 || juzId > 30) {
    notFound();
  }

  const juz = getJuzDetailById(juzId);
  if (!juz) {
    notFound();
  }

  const prevJuz = juzId > 1 ? getJuzMetaById(juzId - 1) : undefined;
  const nextJuz = juzId < 30 ? getJuzMetaById(juzId + 1) : undefined;

  return (
    <JuzReaderClient
      juz={juz}
      allJuzs={QURAN_JUZ_META}
      prevJuz={prevJuz}
      nextJuz={nextJuz}
    />
  );
}
