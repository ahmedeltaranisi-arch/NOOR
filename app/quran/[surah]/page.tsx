import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSurahDetailById, getSurahMetaById } from "@/lib/quran";
import { SurahReaderClient } from "@/components/quran/SurahReaderClient";

interface SurahPageProps {
  params: Promise<{ surah: string }>;
}

export async function generateMetadata({ params }: SurahPageProps): Promise<Metadata> {
  const { surah } = await params;
  const surahId = parseInt(surah, 10);
  const meta = getSurahMetaById(surahId);

  if (!meta) {
    return {
      title: "سورة غير موجودة",
    };
  }

  return {
    title: `سورة ${meta.name} كاملة بالرسم العثماني والتلاوة الصوتية`,
    description: `قراءة واستماع سورة ${meta.name} (${meta.typeAr} - ${meta.totalVerses} آية) بالرسم العثماني الكامل مع التشكيل وتلاوات كبار قراء مصر والعالم الإسلامي.`,
  };
}

export default async function SurahPage({ params }: SurahPageProps) {
  const { surah } = await params;
  const surahId = parseInt(surah, 10);

  if (Number.isNaN(surahId) || surahId < 1 || surahId > 114) {
    notFound();
  }

  const surahDetail = getSurahDetailById(surahId);
  if (!surahDetail) {
    notFound();
  }

  const prevSurah = surahId > 1 ? getSurahMetaById(surahId - 1) : undefined;
  const nextSurah = surahId < 114 ? getSurahMetaById(surahId + 1) : undefined;

  return (
    <SurahReaderClient
      surah={surahDetail}
      prevSurah={prevSurah}
      nextSurah={nextSurah}
    />
  );
}
