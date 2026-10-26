import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen } from "lucide-react";
import { TafsirExplorerClient } from "@/components/tafsir/TafsirExplorerClient";
import { getAyahAllTafsirs, getSurahTafsirData } from "@/lib/tafsir";
import { getTafsirBookMeta, TAFSIR_BOOKS_META } from "@/lib/tafsir/meta";

interface TafsirBookPageProps {
  params: Promise<{ book: string }>;
}

export function generateStaticParams() {
  return TAFSIR_BOOKS_META.map((b) => ({ book: b.slug }));
}

export async function generateMetadata({
  params,
}: TafsirBookPageProps): Promise<Metadata> {
  const { book } = await params;
  const meta = getTafsirBookMeta(book);
  if (!meta) {
    return { title: "كتاب التفسير غير موجود | نور NOOR" };
  }
  return {
    title: `${meta.titleAr} (${meta.authorAr}) — تفسير ١١٤ سورة كاملة | نور NOOR`,
    description: `${meta.descriptionAr} تصفح ${meta.shortTitleAr} كاملًا لجميع سور القرآن الكريم الـ ١١٤ والآيات الـ ٦,٢٣٦.`,
  };
}

export default async function TafsirBookPage({ params }: TafsirBookPageProps) {
  const { book } = await params;
  const meta = getTafsirBookMeta(book);
  if (!meta) {
    notFound();
  }

  const initialSurahTafsir = getSurahTafsirData({
    tafsirSlug: meta.slug,
    surahId: 1,
  });

  const initialCompareData = getAyahAllTafsirs(1, 1);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-3.5 py-5 sm:px-6 sm:py-8 lg:px-8">
      {/* Breadcrumb & Book Info Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
        <div className="flex items-center gap-2 text-xs font-extrabold text-foreground sm:text-sm">
          <BookOpen className="h-4 w-4 text-primary" />
          <span>{meta.titleAr}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-primary">{meta.authorAr}</span>
        </div>

        <Link
          href="/tafsir"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground transition hover:border-primary hover:text-primary"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          <span>جميع كتب التفسير (٧ تفاسير)</span>
        </Link>
      </div>

      <TafsirExplorerClient
        initialSurahTafsir={initialSurahTafsir}
        initialCompareData={initialCompareData}
        initialTab="reader"
      />
    </div>
  );
}
