import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HadithExplorerClient } from "@/components/hadith/HadithExplorerClient";
import {
  getHadithBookMeta,
  HADITH_BOOKS_META,
  queryHadiths,
} from "@/lib/hadith";

export function generateStaticParams() {
  return HADITH_BOOKS_META.map((b) => ({ book: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ book: string }>;
}): Promise<Metadata> {
  const { book } = await params;
  const meta = getHadithBookMeta(book);
  if (!meta) {
    return {
      title: "الأحاديث النبوية الشريفة | نور NOOR",
    };
  }
  return {
    title: `${meta.titleAr} (${meta.totalHadiths} حديث) | نور NOOR`,
    description: `${meta.descriptionAr} — المؤلف: ${meta.authorAr}. تصفح جميع الأبواب والأحاديث مع البحث الفوري.`,
  };
}

export default async function HadithBookPage({
  params,
}: {
  params: Promise<{ book: string }>;
}) {
  const { book } = await params;
  const meta = getHadithBookMeta(book);
  if (!meta) {
    notFound();
  }

  const initialPageData = queryHadiths({
    bookSlug: meta.slug,
    page: 1,
    pageSize: 20,
  });

  return (
    <div className="mx-auto max-w-7xl px-3.5 py-5 sm:px-6 sm:py-8 lg:px-8">
      <HadithExplorerClient initialPageData={initialPageData} />
    </div>
  );
}
