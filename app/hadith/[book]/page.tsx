import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HadithBookReaderClient } from "@/components/hadith/HadithBookReaderClient";
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

  const currentIdx = HADITH_BOOKS_META.findIndex((b) => b.slug === meta.slug);
  const prevBook = currentIdx > 0 ? HADITH_BOOKS_META[currentIdx - 1] : undefined;
  const nextBook =
    currentIdx >= 0 && currentIdx < HADITH_BOOKS_META.length - 1
      ? HADITH_BOOKS_META[currentIdx + 1]
      : undefined;

  const initialPageData = queryHadiths({
    bookSlug: meta.slug,
    page: 1,
    pageSize: 20,
  });

  return (
    <div className="mx-auto max-w-7xl px-3.5 py-5 sm:px-6 sm:py-8 lg:px-8">
      <HadithBookReaderClient
        bookMeta={meta}
        initialPageData={initialPageData}
        prevBook={prevBook}
        nextBook={nextBook}
      />
    </div>
  );
}
