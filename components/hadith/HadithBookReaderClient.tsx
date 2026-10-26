"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Filter,
  Layers,
  Library,
  ListOrdered,
  Loader2,
  ScrollText,
  Search,
  Share2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { HADITH_BOOKS_META } from "@/lib/hadith/meta";
import {
  getSavedHadiths,
  toggleSavedHadith,
} from "@/lib/storage/local-storage";
import { cn, toArabicDigits } from "@/lib/utils";
import {
  HadithBookMeta,
  HadithItem,
  HadithPageResult,
  SavedHadithBookmark,
} from "@/types";

const FONT_SIZE_CLASSES: Record<1 | 2 | 3 | 4, string> = {
  1: "text-lg leading-[2.15] sm:text-xl sm:leading-[2.2]",
  2: "text-xl leading-[2.25] sm:text-2xl sm:leading-[2.35]",
  3: "text-2xl leading-[2.35] sm:text-3xl sm:leading-[2.45]",
  4: "text-3xl leading-[2.45] sm:text-4xl sm:leading-[2.55]",
};

export function HadithBookReaderClient({
  bookMeta,
  initialPageData,
  prevBook,
  nextBook,
}: {
  bookMeta: HadithBookMeta;
  initialPageData: HadithPageResult;
  prevBook?: HadithBookMeta;
  nextBook?: HadithBookMeta;
}) {
  const router = useRouter();

  const [pageData, setPageData] = useState<HadithPageResult>(initialPageData);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(
    initialPageData.selectedChapterId
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [hadithNumberInput, setHadithNumberInput] = useState<string>("");
  const [chapterFilterText, setChapterFilterText] = useState<string>("");
  const [showMobileChapters, setShowMobileChapters] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<1 | 2 | 3 | 4>(2);

  const [savedHadiths, setSavedHadiths] = useState<SavedHadithBookmark[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync state when navigating between different /hadith/[book] routes
  useEffect(() => {
    setPageData(initialPageData);
    setSelectedChapter(initialPageData.selectedChapterId);
    setSearchQuery("");
    setHadithNumberInput("");
    setChapterFilterText("");
    setShowMobileChapters(false);
  }, [initialPageData]);

  useEffect(() => {
    setSavedHadiths(getSavedHadiths());
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchBookHadiths = useCallback(
    async (params: {
      chapter?: number | null;
      hadithId?: number | null;
      q?: string;
      page?: number;
      pageSize?: number;
    }) => {
      setIsLoading(true);
      try {
        const sp = new URLSearchParams();
        sp.set("book", bookMeta.slug);
        if (params.chapter !== undefined && params.chapter !== null) {
          sp.set("chapter", String(params.chapter));
        }
        if (params.hadithId) {
          sp.set("hadithId", String(params.hadithId));
        }
        if (params.q && params.q.trim()) {
          sp.set("q", params.q.trim());
        }
        sp.set("page", String(params.page || 1));
        sp.set("pageSize", String(params.pageSize || 20));

        const res = await fetch(`/api/hadith?${sp.toString()}`);
        if (res.ok) {
          const data = (await res.json()) as HadithPageResult;
          setPageData(data);
        }
      } catch {
        // preserve current data on error
      } finally {
        setIsLoading(false);
      }
    },
    [bookMeta.slug]
  );

  const filteredChapters = useMemo(() => {
    const q = chapterFilterText.trim();
    if (!q) return pageData.chapters;
    return pageData.chapters.filter(
      (c) => c.title.includes(q) || String(c.id).includes(q)
    );
  }, [pageData.chapters, chapterFilterText]);

  const activeChapterObj = useMemo(() => {
    if (selectedChapter === null) return null;
    return pageData.chapters.find((c) => c.id === selectedChapter) || null;
  }, [pageData.chapters, selectedChapter]);

  const activeChapterIndex = useMemo(() => {
    if (selectedChapter === null) return -1;
    return pageData.chapters.findIndex((c) => c.id === selectedChapter);
  }, [pageData.chapters, selectedChapter]);

  const prevChapterObj =
    activeChapterIndex > 0 ? pageData.chapters[activeChapterIndex - 1] : null;
  const nextChapterObj =
    activeChapterIndex >= 0 && activeChapterIndex < pageData.chapters.length - 1
      ? pageData.chapters[activeChapterIndex + 1]
      : activeChapterIndex === -1 && pageData.chapters.length > 1
      ? pageData.chapters[0]
      : null;

  const handleSelectChapter = (chapId: number | null) => {
    setSelectedChapter(chapId);
    setHadithNumberInput("");
    setShowMobileChapters(false);
    fetchBookHadiths({
      chapter: chapId,
      q: searchQuery,
      page: 1,
    });
    if (typeof window !== "undefined") {
      const el = document.getElementById("book-hadiths-reader-top");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsedNum =
      hadithNumberInput.trim() && /^\d+$/.test(hadithNumberInput.trim())
        ? parseInt(hadithNumberInput.trim(), 10)
        : null;
    fetchBookHadiths({
      chapter: selectedChapter,
      hadithId: parsedNum,
      q: searchQuery,
      page: 1,
    });
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setHadithNumberInput("");
    setSelectedChapter(null);
    fetchBookHadiths({
      chapter: null,
      hadithId: null,
      q: "",
      page: 1,
    });
  };

  const handlePageChange = (newPage: number) => {
    const parsedNum =
      hadithNumberInput.trim() && /^\d+$/.test(hadithNumberInput.trim())
        ? parseInt(hadithNumberInput.trim(), 10)
        : null;
    fetchBookHadiths({
      chapter: selectedChapter,
      hadithId: parsedNum,
      q: searchQuery,
      page: newPage,
    });
    if (typeof window !== "undefined") {
      const el = document.getElementById("book-hadiths-reader-top");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const isHadithSaved = (hadithId: number) =>
    savedHadiths.some((b) => b.key === `${bookMeta.slug}:${hadithId}`);

  const handleToggleSave = (item: HadithItem) => {
    const res = toggleSavedHadith({
      bookSlug: bookMeta.slug,
      bookTitleAr: bookMeta.shortTitleAr,
      hadithId: item.id,
      chapterTitle: item.chapterTitle || bookMeta.shortTitleAr,
      text: item.text,
    });
    setSavedHadiths(res.bookmarks);
    showToast(
      res.added
        ? `تم حفظ الحديث رقم ${toArabicDigits(item.id)} (${bookMeta.shortTitleAr}) في المفضلة`
        : "تمت إزالة الحديث من المفضلة"
    );
  };

  const handleCopyHadith = async (item: HadithItem) => {
    const cTitle = item.chapterTitle ? ` — ${item.chapterTitle}` : "";
    const formatted = `${item.text}\n\n[المصدر: ${bookMeta.shortTitleAr}${cTitle} • حديث رقم ${toArabicDigits(
      item.id
    )}]`;
    const key = `${bookMeta.slug}:${item.id}`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedKey(key);
      showToast("تم نسخ الحديث النبوي الشريف مع تخريجه ومصدره");
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleShareHadith = async (item: HadithItem) => {
    const formatted = `${item.text}\n\n[${bookMeta.shortTitleAr} • حديث رقم ${toArabicDigits(
      item.id
    )}]`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${bookMeta.shortTitleAr} — حديث رقم ${toArabicDigits(item.id)}`,
          text: formatted,
        });
        return;
      } catch {
        // fallback to copy
      }
    }
    await handleCopyHadith(item);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-gold/40 bg-emerald-950 px-4 py-3 text-center text-xs font-bold text-white shadow-gold md:bottom-8"
        >
          {toastMessage}
        </div>
      )}

      {/* Top Breadcrumb & Book Header Card */}
      <div className="rounded-3xl border border-border bg-card p-4 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border pb-3.5 sm:gap-3 sm:pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/hadith"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:border-primary hover:text-primary sm:px-3.5"
            >
              <ChevronRight className="h-4 w-4" />
              <span>موسوعة كتب السنة الـ ١٧</span>
            </Link>

            {/* Quick Jump to Any of the 17 Hadith Books */}
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-2.5 py-1.5">
              <Library className="h-3.5 w-3.5 shrink-0 text-primary" />
              <select
                aria-label="الانتقال إلى كتاب آخر من كتب السنة"
                value={bookMeta.slug}
                onChange={(e) => router.push(`/hadith/${e.target.value}`)}
                className="bg-transparent text-xs font-bold text-foreground focus:outline-none"
              >
                {HADITH_BOOKS_META.map((item) => (
                  <option
                    key={item.slug}
                    value={item.slug}
                    className="bg-card text-foreground"
                  >
                    {item.shortTitleAr} ({toArabicDigits(item.totalHadiths)} حديث)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground sm:gap-2 sm:text-xs">
            <span>{bookMeta.categoryAr}</span>
            <span>•</span>
            <span>{toArabicDigits(bookMeta.totalHadiths)} حديث</span>
            <span>•</span>
            <span>{toArabicDigits(bookMeta.totalChapters)} بابًا</span>
          </div>
        </div>

        {/* Ornate Book Cover Banner */}
        <div className="my-4 flex flex-col items-center justify-center gap-3 rounded-2xl border border-gold/30 bg-gradient-to-l from-primary via-emerald-900 to-primary px-4 py-6 text-center text-white shadow-inner sm:my-5 sm:gap-3.5 sm:px-6 sm:py-8">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-gold/30 bg-black/20 px-3.5 py-1 text-xs font-bold text-gold">
            <ScrollText className="h-3.5 w-3.5" />
            <span>{bookMeta.categoryAr}</span>
            <span>•</span>
            <span>{bookMeta.gradeBadgeAr}</span>
          </div>

          <h1 className="font-sans py-1 text-2xl font-extrabold leading-[1.6] text-white sm:text-4xl sm:leading-[1.6]">
            {bookMeta.titleAr}
          </h1>

          <p className="text-xs font-bold text-gold sm:text-sm">
            تأليف: {bookMeta.authorAr}
          </p>

          <p className="max-w-2xl text-xs leading-relaxed text-emerald-50/90 sm:text-sm">
            {bookMeta.descriptionAr}
          </p>

          <div className="mt-1 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-emerald-50">
            <span>
              إجمالي أحاديث الكتاب: {toArabicDigits(bookMeta.totalHadiths)} حديثًا نبويًا
            </span>
            <span>•</span>
            <span>
              عدد الكتب والأبواب الفرعية: {toArabicDigits(bookMeta.totalChapters)} بابًا
            </span>
          </div>
        </div>

        {/* Search & Controls Toolbar inside Book */}
        <form onSubmit={handleSearchSubmit} className="space-y-3 pt-1">
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-12">
            {/* Search Text inside this Book */}
            <div className="relative md:col-span-5">
              <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`ابحث في أحاديث ${bookMeta.shortTitleAr}...`}
                className="w-full rounded-2xl border border-border bg-background py-2.5 pl-9 pr-10 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  aria-label="مسح البحث"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Hadith Number Jump Input */}
            <div className="md:col-span-3">
              <input
                type="number"
                min={1}
                max={bookMeta.totalHadiths}
                value={hadithNumberInput}
                onChange={(e) => setHadithNumberInput(e.target.value)}
                placeholder={`رقم الحديث (١ - ${toArabicDigits(bookMeta.totalHadiths)})`}
                className="w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:text-sm"
              />
            </div>

            {/* Submit & Font Size Controls */}
            <div className="flex flex-wrap items-center gap-2 md:col-span-4">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span>بحث بالكتاب</span>
              </button>

              {/* Font Size Controls */}
              <div className="inline-flex items-center gap-1 rounded-2xl border border-border bg-background px-2.5 py-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  الخط:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFontSizeLevel(
                      Math.max(1, fontSizeLevel - 1) as 1 | 2 | 3 | 4
                    )
                  }
                  disabled={fontSizeLevel <= 1}
                  aria-label="تصغير خط الحديث"
                  className="rounded-lg p-1 text-foreground hover:bg-muted disabled:opacity-40"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="min-w-[18px] text-center text-xs font-bold text-primary">
                  {toArabicDigits(fontSizeLevel)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFontSizeLevel(
                      Math.min(4, fontSizeLevel + 1) as 1 | 2 | 3 | 4
                    )
                  }
                  disabled={fontSizeLevel >= 4}
                  aria-label="تكبير خط الحديث"
                  className="rounded-lg p-1 text-foreground hover:bg-muted disabled:opacity-40"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Interactive Book Chapters Sidebar + Hadiths Reader Layout */}
      <div
        id="book-hadiths-reader-top"
        className="grid grid-cols-1 gap-6 lg:grid-cols-12"
      >
        {/* Chapters Index Column (if book has multiple chapters) */}
        {pageData.chapters.length > 1 && (
          <aside className="lg:col-span-4">
            <div className="sticky top-[78px] rounded-3xl border border-border bg-card p-4 shadow-soft sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ListOrdered className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-extrabold text-foreground sm:text-base">
                    فهرس أبواب {bookMeta.shortTitleAr} ({toArabicDigits(pageData.chapters.length)})
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMobileChapters((prev) => !prev)}
                  className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-2.5 py-1 text-xs font-bold text-primary lg:hidden"
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span>{showMobileChapters ? "إخفاء الأبواب" : "عرض الأبواب"}</span>
                </button>
              </div>

              <div
                className={cn(
                  "mt-3.5 space-y-3",
                  showMobileChapters ? "block" : "hidden lg:block"
                )}
              >
                {/* Chapter Filter Search Box */}
                <div className="relative">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={chapterFilterText}
                    onChange={(e) => setChapterFilterText(e.target.value)}
                    placeholder="ابحث في أسماء الأبواب والكتب..."
                    className="w-full rounded-xl border border-border bg-background py-2 pl-3 pr-8 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Chapters Scrollable List */}
                <div className="max-h-[460px] space-y-1.5 overflow-y-auto pl-1">
                  <button
                    type="button"
                    onClick={() => handleSelectChapter(null)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-right text-xs font-bold transition",
                      selectedChapter === null
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-background text-foreground hover:border-primary/40 hover:text-primary"
                    )}
                  >
                    <span>جميع أبواب {bookMeta.shortTitleAr}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px]",
                        selectedChapter === null
                          ? "bg-white/20 text-white"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {toArabicDigits(bookMeta.totalHadiths)}
                    </span>
                  </button>

                  {filteredChapters.map((chap) => {
                    const isSelected = selectedChapter === chap.id;
                    return (
                      <button
                        key={chap.id}
                        type="button"
                        onClick={() => handleSelectChapter(chap.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-right text-xs font-bold transition",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-background/70 text-foreground hover:border-primary/40 hover:bg-card hover:text-primary"
                        )}
                      >
                        <span className="line-clamp-2 flex-1 leading-relaxed">
                          {toArabicDigits(chap.id)}. {chap.title}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px]",
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {toArabicDigits(chap.count)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Main Hadiths Column */}
        <div
          className={cn(
            "space-y-4",
            pageData.chapters.length > 1 ? "lg:col-span-8" : "lg:col-span-12"
          )}
        >
          {/* Active Chapter Header & Prev/Next Chapter Buttons */}
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-gold/35 bg-gradient-to-l from-primary/10 via-gold/10 to-primary/10 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-primary px-2.5 py-0.5 text-[11px] font-extrabold text-primary-foreground">
                  {activeChapterObj
                    ? `الباب رقم ${toArabicDigits(activeChapterObj.id)}`
                    : "عرض كامل الكتاب"}
                </span>
                <h2 className="font-sans text-lg font-extrabold text-foreground sm:text-xl">
                  {activeChapterObj
                    ? activeChapterObj.title
                    : `جميع أحاديث ${bookMeta.shortTitleAr}`}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                عدد الأحاديث المعروضة في هذا القسم:{" "}
                <strong className="text-foreground">
                  {toArabicDigits(pageData.totalItems)}
                </strong>{" "}
                حديث • صفحة {toArabicDigits(pageData.page)} من{" "}
                {toArabicDigits(pageData.totalPages)}
              </p>
            </div>

            {pageData.chapters.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {prevChapterObj && (
                  <button
                    type="button"
                    onClick={() => handleSelectChapter(prevChapterObj.id)}
                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:border-primary hover:text-primary"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span>الباب السابق</span>
                  </button>
                )}
                {nextChapterObj && (
                  <button
                    type="button"
                    onClick={() => handleSelectChapter(nextChapterObj.id)}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                  >
                    <span>
                      {selectedChapter === null ? "تصفح الباب الأول" : "الباب التالي"}
                    </span>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Hadith Cards List */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-card py-16 text-center shadow-soft">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-bold text-muted-foreground">
                جاري تحميل أحاديث {bookMeta.shortTitleAr}...
              </p>
            </div>
          ) : pageData.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-card py-14 text-center shadow-soft">
              <ScrollText className="h-10 w-10 text-muted-foreground" />
              <p className="text-base font-bold text-foreground">
                لا توجد أحاديث مطابقة للبحث الحالي في {bookMeta.shortTitleAr}
              </p>
              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
              >
                عرض جميع أحاديث الكتاب
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {pageData.items.map((item) => {
                const saved = isHadithSaved(item.id);
                const copyKey = `${bookMeta.slug}:${item.id}`;

                return (
                  <article
                    key={copyKey}
                    className="rounded-3xl border border-border bg-card p-5 shadow-soft transition hover:border-primary/40 sm:p-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center justify-center rounded-xl bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground">
                          حديث رقم {toArabicDigits(item.id)}
                        </span>
                        <span className="rounded-xl bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                          {bookMeta.shortTitleAr}
                        </span>
                        {item.chapterTitle && (
                          <span className="rounded-xl border border-border bg-muted/40 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                            {item.chapterTitle}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleSave(item)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-bold transition",
                            saved
                              ? "border-gold bg-gold-muted text-gold"
                              : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <Bookmark className="h-3.5 w-3.5" />
                          <span>{saved ? "محفوظ بالمفضلة" : "حفظ"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyHadith(item)}
                          className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          {copiedKey === copyKey ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          <span>نسخ</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShareHadith(item)}
                          className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          <span>مشاركة</span>
                        </button>
                      </div>
                    </div>

                    <p
                      className={cn(
                        "quran-verse-text mt-4 whitespace-pre-line text-justify text-foreground",
                        FONT_SIZE_CLASSES[fontSizeLevel]
                      )}
                    >
                      {item.text}
                    </p>
                  </article>
                );
              })}
            </div>
          )}

          {/* Pagination Bar */}
          {pageData.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft sm:px-6">
              <button
                type="button"
                disabled={pageData.page <= 1 || isLoading}
                onClick={() => handlePageChange(pageData.page - 1)}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-border bg-background px-4 py-2.5 text-xs font-bold text-foreground transition hover:border-primary hover:text-primary disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
                <span>الصفحة السابقة</span>
              </button>

              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-foreground">
                <span>انتقال لصفحة:</span>
                <select
                  aria-label="اختيار رقم الصفحة"
                  value={pageData.page}
                  onChange={(e) => handlePageChange(Number(e.target.value))}
                  className="rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-primary focus:outline-none"
                >
                  {Array.from(
                    { length: Math.min(pageData.totalPages, 400) },
                    (_, idx) => idx + 1
                  ).map((pNum) => (
                    <option key={pNum} value={pNum}>
                      صفحة {toArabicDigits(pNum)} من {toArabicDigits(pageData.totalPages)}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                disabled={pageData.page >= pageData.totalPages || isLoading}
                onClick={() => handlePageChange(pageData.page + 1)}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
              >
                <span>الصفحة التالية</span>
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Previous & Next Hadith Book Footer Navigation */}
      <div className="flex flex-col items-center justify-between gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:p-5">
        {prevBook ? (
          <Link
            href={`/hadith/${prevBook.slug}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-5 py-3 text-xs font-bold text-foreground transition hover:border-primary hover:text-primary sm:w-auto sm:text-sm"
          >
            <ChevronRight className="h-4 w-4" />
            <span>الكتاب السابق: {prevBook.shortTitleAr}</span>
          </Link>
        ) : (
          <div className="hidden sm:block" />
        )}

        <Link
          href="/hadith"
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary/10 px-5 py-3 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground sm:w-auto"
        >
          <Library className="h-4 w-4" />
          <span>العودة إلى فهرس كتب السنة الـ ١٧</span>
        </Link>

        {nextBook ? (
          <Link
            href={`/hadith/${nextBook.slug}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 sm:w-auto sm:text-sm"
          >
            <span>الكتاب التالي: {nextBook.shortTitleAr}</span>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <Link
            href="/hadith/bukhari"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-bold text-primary-foreground sm:w-auto sm:text-sm"
          >
            <span>العودة إلى صحيح البخاري</span>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
