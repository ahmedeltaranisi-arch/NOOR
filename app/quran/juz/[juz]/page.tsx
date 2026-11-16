import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  QURAN_JUZ_META,
  getHizbsByJuzId,
  getJuzDetailById,
  getJuzMetaById,
} from "@/lib/quran";
import { JuzReaderClient } from "@/components/quran/JuzReaderClient";

export const dynamicParams = false;

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

  const juzHizbs = getHizbsByJuzId(juzId);
  const hizbNames = juzHizbs
    ? `مقسمًا إلى ${juzHizbs[0].nameAr} (${juzHizbs[0].startSurahName} ${juzHizbs[0].startAyah}) و${juzHizbs[1].nameAr} (${juzHizbs[1].startSurahName} ${juzHizbs[1].startAyah}) وأرباعهما الثمانية`
    : "";

  return {
    title: `${meta.nameAr} من القرآن الكريم (${meta.titleAr}) — أحزابه وأرباعه بالرسم العثماني`,
    description: `قراءة ${meta.nameAr} من المصحف الشريف بالرسم العثماني الكامل ${hizbNames} (من سورة ${meta.startSurahName} آية ${meta.startAyah} إلى سورة ${meta.endSurahName} آية ${meta.endAyah} — الصفحات ${meta.pageStart} إلى ${meta.pageEnd}) مع التلاوة بأصوات 11 قارئًا.`,
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
