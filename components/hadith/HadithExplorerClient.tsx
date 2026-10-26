"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
  Loader2,
  ScrollText,
  Search,
  Share2,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  HADITH_BOOKS_META,
  HADITH_TOPIC_CHIPS,
  TOTAL_HADITH_BOOKS_COUNT,
  TOTAL_HADITH_CHAPTERS_COUNT,
  TOTAL_HADITHS_COUNT,
} from "@/lib/hadith/meta";
import {
  getSavedHadiths,
  toggleSavedHadith,
} from "@/lib/storage/local-storage";
import { cn, toArabicDigits } from "@/lib/utils";
import {
  HadithBookCategory,
  HadithBookMeta,
  HadithBookSlug,
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

const BOOK_CATEGORIES: HadithBookCategory[] = [
  "الكتب التسعة (الأمهات)",
  "جوامع السنة والأخلاق والأحكام",
  "متون الأربعينات الجامعة",
];

export function HadithExplorerClient({
  initialPageData,
  initialNawawiData,
  initialTab = "reader",
}: {
  initialPageData: HadithPageResult;
  initialNawawiData?: HadithPageResult;
  initialTab?: "reader" | "books" | "forties" | "saved";
}) {
  const [activeTab, setActiveTab] = useState<
    "reader" | "books" | "forties" | "saved"
  >(initialTab);

  // Reader & Search State
  const [selectedBook, setSelectedBook] = useState<HadithBookSlug | "all">(
    initialPageData.bookSlug
  );
  const [selectedChapter, setSelectedChapter] = useState<number | null>(
    initialPageData.selectedChapterId
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchScopeAllBooks, setSearchScopeAllBooks] =
    useState<boolean>(false);
  const [hadithNumberInput, setHadithNumberInput] = useState<string>("");
  const [pageData, setPageData] = useState<HadithPageResult>(initialPageData);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<1 | 2 | 3 | 4>(2);

  // Forties Quick Reader State
  const [selectedFortySlug, setSelectedFortySlug] = useState<
    "nawawi40" | "qudsi40" | "shahwaliullah40"
  >("nawawi40");
  const [fortyData, setFortyData] = useState<HadithPageResult | null>(
    initialNawawiData || null
  );
  const [isFortyLoading, setIsFortyLoading] = useState<boolean>(false);

  // Saved Hadiths & Toast State
  const [savedHadiths, setSavedHadiths] = useState<SavedHadithBookmark[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setSavedHadiths(getSavedHadiths());
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchHadiths = useCallback(
    async (params: {
      book: HadithBookSlug | "all";
      chapter?: number | null;
      hadithId?: number | null;
      q?: string;
      page?: number;
      pageSize?: number;
    }) => {
      setIsLoading(true);
      try {
        const sp = new URLSearchParams();
        sp.set("book", params.book);
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
        // keep current data on network error
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Load 40-Hadith collection when switching Forties tab or sub-book
  useEffect(() => {
    if (activeTab !== "forties") return;
    if (
      selectedFortySlug === "nawawi40" &&
      initialNawawiData &&
      fortyData?.bookSlug === "nawawi40"
    ) {
      return;
    }
    let cancelled = false;
    setIsFortyLoading(true);
    fetch(`/api/hadith?book=${selectedFortySlug}&page=1&pageSize=50`)
      .then((r) => r.json())
      .then((data: HadithPageResult) => {
        if (!cancelled) setFortyData(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsFortyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedFortySlug, initialNawawiData, fortyData?.bookSlug]);

  const handleSelectBook = (slug: HadithBookSlug) => {
    setSelectedBook(slug);
    setSelectedChapter(null);
    setHadithNumberInput("");
    setActiveTab("reader");
    fetchHadiths({
      book: slug,
      chapter: null,
      q: searchQuery,
      page: 1,
    });
  };

  const handleSelectChapter = (chapId: number | null) => {
    const targetBook = selectedBook === "all" ? "bukhari" : selectedBook;
    setSelectedChapter(chapId);
    setHadithNumberInput("");
    fetchHadiths({
      book: targetBook,
      chapter: chapId,
      q: searchQuery,
      page: 1,
    });
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetBook =
      searchScopeAllBooks && searchQuery.trim()
        ? "all"
        : selectedBook === "all"
        ? "bukhari"
        : selectedBook;
    const parsedNum =
      hadithNumberInput.trim() && /^\d+$/.test(hadithNumberInput.trim())
        ? parseInt(hadithNumberInput.trim(), 10)
        : null;

    setActiveTab("reader");
    fetchHadiths({
      book: targetBook,
      chapter: targetBook === "all" ? null : selectedChapter,
      hadithId: parsedNum,
      q: searchQuery,
      page: 1,
    });
  };

  const handleTopicChipClick = (topicQuery: string) => {
    setSearchQuery(topicQuery);
    setHadithNumberInput("");
    setActiveTab("reader");
    const targetBook = searchScopeAllBooks
      ? "all"
      : selectedBook === "all"
      ? "bukhari"
      : selectedBook;
    fetchHadiths({
      book: targetBook,
      chapter: null,
      q: topicQuery,
      page: 1,
    });
  };

  const handleClearFilters = () => {
    const fallbackBook = selectedBook === "all" ? "bukhari" : selectedBook;
    setSearchQuery("");
    setHadithNumberInput("");
    setSelectedChapter(null);
    setSelectedBook(fallbackBook);
    fetchHadiths({
      book: fallbackBook,
      chapter: null,
      q: "",
      page: 1,
    });
  };

  const handlePageChange = (newPage: number) => {
    const targetBook =
      searchScopeAllBooks && searchQuery.trim()
        ? "all"
        : selectedBook === "all"
        ? "bukhari"
        : selectedBook;
    const parsedNum =
      hadithNumberInput.trim() && /^\d+$/.test(hadithNumberInput.trim())
        ? parseInt(hadithNumberInput.trim(), 10)
        : null;
    fetchHadiths({
      book: targetBook,
      chapter: targetBook === "all" ? null : selectedChapter,
      hadithId: parsedNum,
      q: searchQuery,
      page: newPage,
    });
    if (typeof window !== "undefined") {
      const el = document.getElementById("hadith-results-top");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const isHadithSaved = (bookSlug: string, hadithId: number) =>
    savedHadiths.some((b) => b.key === `${bookSlug}:${hadithId}`);

  const handleToggleSave = (item: HadithItem) => {
    const bSlug = (item.bookSlug ||
      (selectedBook === "all" ? "bukhari" : selectedBook)) as HadithBookSlug;
    const bTitle =
      item.bookTitleAr ||
      HADITH_BOOKS_META.find((b) => b.slug === bSlug)?.shortTitleAr ||
      "صحيح البخاري";
    const res = toggleSavedHadith({
      bookSlug: bSlug,
      bookTitleAr: bTitle,
      hadithId: item.id,
      chapterTitle: item.chapterTitle || bTitle,
      text: item.text,
    });
    setSavedHadiths(res.bookmarks);
    showToast(
      res.added
        ? `تم حفظ الحديث رقم ${toArabicDigits(item.id)} (${bTitle}) في المفضلة`
        : "تمت إزالة الحديث من المفضلة"
    );
  };

  const handleCopyHadith = async (item: HadithItem) => {
    const bTitle =
      item.bookTitleAr || pageData.bookMeta?.shortTitleAr || "السنة النبوية";
    const cTitle = item.chapterTitle ? ` — ${item.chapterTitle}` : "";
    const formatted = `${item.text}\n\n[المصدر: ${bTitle}${cTitle} • حديث رقم ${toArabicDigits(
      item.id
    )}]`;
    const key = `${item.bookSlug || selectedBook}:${item.id}`;
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
    const bTitle =
      item.bookTitleAr || pageData.bookMeta?.shortTitleAr || "السنة النبوية";
    const formatted = `${item.text}\n\n[${bTitle} • حديث رقم ${toArabicDigits(
      item.id
    )}]`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `حديث نبوي شريف — ${bTitle} (${toArabicDigits(item.id)})`,
          text: formatted,
        });
        return;
      } catch {
        // fallback to copy
      }
    }
    await handleCopyHadith(item);
  };

  const currentBookMeta: HadithBookMeta =
    pageData.bookMeta ||
    HADITH_BOOKS_META.find((b) => b.slug === selectedBook) ||
    HADITH_BOOKS_META[0];

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

      {/* Encyclopedia Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-l from-emerald-950 via-emerald-900 to-emerald-950 p-5 text-white shadow-soft sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="space-y-2.5">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-gold/30 bg-white/10 px-3.5 py-1 text-xs font-bold text-gold">
              <ScrollText className="h-3.5 w-3.5" />
              <span>موسوعة السنة النبوية الشريفة الكاملة</span>
              <span>•</span>
              <span>{toArabicDigits(TOTAL_HADITHS_COUNT)} حديثًا نبويًا</span>
            </div>

            <h1 className="font-serif text-2xl font-bold leading-relaxed text-white sm:text-4xl">
              الأحاديث النبوية الشريفة عن رسول الله ﷺ
            </h1>

            <p className="max-w-3xl text-xs leading-relaxed text-emerald-100/90 sm:text-sm">
              موسوعة شاملة تضم جميع الأحاديث الواردة في أمهات كتب السنة النبوية المعتمدة:
              الكتب التسعة (صحيح البخاري، صحيح مسلم، سنن أبي داود، جامع الترمذي، سنن
              النسائي، سنن ابن ماجه، موطأ مالك، مسند أحمد، سنن الدارمي)، ورياض الصالحين،
              وبلوغ المرام، والأدب المفرد، ومشكاة المصابيح، والشمائل المحمدية، والأربعين
              النووية والقدسية.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 lg:shrink-0">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-center backdrop-blur-sm sm:px-4">
              <p className="text-lg font-extrabold text-gold sm:text-2xl">
                {toArabicDigits(TOTAL_HADITHS_COUNT)}
              </p>
              <p className="text-[11px] font-medium text-emerald-100">حديث نبوي</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-center backdrop-blur-sm sm:px-4">
              <p className="text-lg font-extrabold text-gold sm:text-2xl">
                {toArabicDigits(TOTAL_HADITH_BOOKS_COUNT)}
              </p>
              <p className="text-[11px] font-medium text-emerald-100">كتابًا ومصدرًا</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-center backdrop-blur-sm sm:px-4">
              <p className="text-lg font-extrabold text-gold sm:text-2xl">
                {toArabicDigits(TOTAL_HADITH_CHAPTERS_COUNT)}
              </p>
              <p className="text-[11px] font-medium text-emerald-100">بابًا وفصلًا</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Search & Quick Topic Filter Card */}
      <div className="rounded-3xl border border-border bg-card p-4 shadow-soft sm:p-6">
        <form onSubmit={handleSearchSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-12">
            {/* Search Text Input */}
            <div className="relative md:col-span-6">
              <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بأي كلمة أو جملة في متن الحديث أو اسم الصحابي الراوي..."
                className="w-full rounded-2xl border border-border bg-background py-2.5 pl-9 pr-10 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    handleClearFilters();
                  }}
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
                value={hadithNumberInput}
                onChange={(e) => setHadithNumberInput(e.target.value)}
                placeholder="رقم الحديث بالكتاب (مثال: 1)"
                className="w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:text-sm"
              />
            </div>

            {/* Search Submit & Scope Toggle */}
            <div className="flex items-center gap-2 md:col-span-3">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50 sm:text-sm"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span>بحث في الأحاديث</span>
              </button>
            </div>
          </div>

          {/* Search Scope Checkbox + Quick Topic Chips */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-muted-foreground">
                مواضيع سريعة:
              </span>
              {HADITH_TOPIC_CHIPS.map((chip) => {
                const active = searchQuery === chip.query;
                return (
                  <button
                    key={chip.labelAr}
                    type="button"
                    onClick={() => handleTopicChipClick(chip.query)}
                    className={cn(
                      "rounded-xl border px-2.5 py-1 text-[11px] font-bold transition",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted/40 text-foreground hover:border-primary/40 hover:text-primary"
                    )}
                  >
                    {chip.labelAr}
                  </button>
                );
              })}
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-1.5 text-xs font-bold text-foreground">
              <input
                type="checkbox"
                checked={searchScopeAllBooks}
                onChange={(e) => setSearchScopeAllBooks(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-primary"
              />
              <span>البحث الشامل في جميع الكتب الـ ١٧ ({toArabicDigits(TOTAL_HADITHS_COUNT)} حديث)</span>
            </label>
          </div>
        </form>
      </div>

      {/* Main Navigation Tabs */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-soft sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setActiveTab("reader")}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-extrabold transition sm:text-sm",
            activeTab === "reader"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          <span>تصفح الأحاديث والأبواب</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("books")}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-extrabold transition sm:text-sm",
            activeTab === "books"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <Library className="h-4 w-4 shrink-0" />
          <span>الكتب الـ ١٧ المعتمدة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("forties")}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-extrabold transition sm:text-sm",
            activeTab === "forties"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>الأربعون النووية والقدسية</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("saved")}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-extrabold transition sm:text-sm",
            activeTab === "saved"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <Bookmark className="h-4 w-4 shrink-0" />
          <span>المفضلة ({toArabicDigits(savedHadiths.length)})</span>
        </button>
      </div>

      {/* TAB 1: HADITH & CHAPTER READER */}
      {activeTab === "reader" && (
        <div id="hadith-results-top" className="space-y-5">
          {/* Quick Selector Pills for All 17 Hadith Books */}
          <div className="rounded-3xl border border-border bg-card p-4 shadow-soft sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-foreground sm:text-sm">
                <Library className="h-4 w-4 text-primary" />
                <span>اختر كتاب السنة النبوية للتصفح:</span>
              </div>
              <span className="text-xs font-bold text-primary">
                إجمالي النتائج الحالية: {toArabicDigits(pageData.totalItems)} حديث
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {HADITH_BOOKS_META.map((b) => {
                const isSelected =
                  selectedBook === b.slug && pageData.bookSlug !== "all";
                return (
                  <button
                    key={b.slug}
                    type="button"
                    onClick={() => handleSelectBook(b.slug)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition active:scale-95",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-muted/30 text-foreground hover:border-primary/40 hover:text-primary"
                    )}
                  >
                    <span>{b.shortTitleAr}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.2 text-[10px]",
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {toArabicDigits(b.totalHadiths)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Book Details & Chapter Selector Bar */}
            {pageData.bookSlug !== "all" && (
              <div className="mt-4 flex flex-col justify-between gap-3 border-t border-border pt-4 lg:flex-row lg:items-center">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-extrabold text-foreground sm:text-lg">
                      {currentBookMeta.titleAr}
                    </h2>
                    <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 dark:text-gold">
                      {currentBookMeta.gradeBadgeAr}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    المؤلف: {currentBookMeta.authorAr} • {currentBookMeta.descriptionAr}
                  </p>
                </div>

                {/* Chapter Filter & Font Size Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  {pageData.chapters.length > 1 && (
                    <div className="inline-flex flex-1 items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 sm:flex-initial">
                      <Filter className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <select
                        aria-label="تصفية حسب الباب أو الكتاب الفرعي"
                        value={
                          selectedChapter === null ? "all" : String(selectedChapter)
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          handleSelectChapter(val === "all" ? null : parseInt(val, 10));
                        }}
                        className="max-w-[230px] bg-transparent text-xs font-bold text-foreground focus:outline-none sm:max-w-[280px]"
                      >
                        <option value="all" className="bg-card text-foreground">
                          جميع الأبواب ({toArabicDigits(currentBookMeta.totalHadiths)} حديث)
                        </option>
                        {pageData.chapters.map((ch) => (
                          <option
                            key={ch.id}
                            value={ch.id}
                            className="bg-card text-foreground"
                          >
                            {toArabicDigits(ch.id)}. {ch.title} ({toArabicDigits(ch.count)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Font Size Controls */}
                  <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-2.5 py-1.5">
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
            )}
          </div>

          {/* Hadith Cards List */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-card py-16 text-center shadow-soft">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-bold text-muted-foreground">
                جاري تحميل الأحاديث النبوية الشريفة...
              </p>
            </div>
          ) : pageData.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-card py-14 text-center shadow-soft">
              <ScrollText className="h-10 w-10 text-muted-foreground" />
              <p className="text-base font-bold text-foreground">
                لم يتم العثور على أحاديث مطابقة لعبارة البحث الحالية
              </p>
              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
              >
                إعادة ضبط البحث وعرض جميع الأحاديث
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {pageData.items.map((item) => {
                const bSlug = item.bookSlug || currentBookMeta.slug;
                const bTitle = item.bookTitleAr || currentBookMeta.shortTitleAr;
                const saved = isHadithSaved(bSlug, item.id);
                const copyKey = `${bSlug}:${item.id}`;

                return (
                  <article
                    key={copyKey}
                    className="rounded-3xl border border-border bg-card p-5 shadow-soft transition hover:border-primary/40 sm:p-6"
                  >
                    {/* Top Metadata & Actions Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center justify-center rounded-xl bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground">
                          حديث رقم {toArabicDigits(item.id)}
                        </span>
                        <span className="rounded-xl bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                          {bTitle}
                        </span>
                        {item.chapterTitle && (
                          <span className="rounded-xl border border-border bg-muted/40 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                            {item.chapterTitle}
                          </span>
                        )}
                        {item.gradeBadgeAr && (
                          <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 dark:text-gold">
                            {item.gradeBadgeAr}
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

                    {/* Vocalized Prophetic Hadith Text */}
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

          {/* Pagination Footer */}
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
                <span>
                  صفحة {toArabicDigits(pageData.page)} من{" "}
                  {toArabicDigits(pageData.totalPages)}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  إجمالي الأحاديث: {toArabicDigits(pageData.totalItems)}
                </span>
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
      )}

      {/* TAB 2: ALL 17 AUTHENTIC HADITH BOOKS DIRECTORY */}
      {activeTab === "books" && (
        <div className="space-y-8">
          {BOOK_CATEGORIES.map((category) => {
            const categoryBooks = HADITH_BOOKS_META.filter(
              (b) => b.categoryAr === category
            );
            return (
              <section key={category} className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <h2 className="text-lg font-extrabold text-foreground sm:text-xl">
                    {category}
                  </h2>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    {toArabicDigits(categoryBooks.length)} كتب
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryBooks.map((book) => (
                    <article
                      key={book.slug}
                      className="flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-soft transition hover:border-primary/50"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-full bg-gold/20 px-3 py-0.5 text-[11px] font-bold text-amber-900 dark:text-gold">
                            {book.gradeBadgeAr}
                          </span>
                          <span className="text-xs font-extrabold text-primary">
                            {toArabicDigits(book.totalHadiths)} حديث
                          </span>
                        </div>

                        <h3 className="font-serif text-xl font-bold text-foreground">
                          {book.titleAr}
                        </h3>

                        <p className="text-xs font-bold text-primary/90">
                          {book.authorAr}
                        </p>

                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {book.descriptionAr}
                        </p>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3.5">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          عدد الأبواب والكتب: {toArabicDigits(book.totalChapters)}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectBook(book.slug)}
                            className="inline-flex items-center gap-1 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>تصفح الأحاديث</span>
                          </button>

                          <Link
                            href={`/hadith/${book.slug}`}
                            className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:border-primary hover:text-primary"
                          >
                            <span>صفحة الكتاب</span>
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* TAB 3: THE FORTY HADITH COLLECTIONS (NAWAWI 40, QUDSI 40, SHAH WALIULLAH 40) */}
      {activeTab === "forties" && (
        <div className="space-y-5">
          <div className="flex flex-col justify-between gap-3 rounded-3xl border border-gold/30 bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:p-5">
            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-foreground sm:text-lg">
                متون الأربعينات النبوية والقدسية الكاملة
              </h2>
              <p className="text-xs text-muted-foreground">
                اقرأ الأربعين النووية (٤٢ حديثًا)، والأربعين القدسية (٤٠ حديثًا)، وأربعون
                الإمام الدهلوي (٤٠ حديثًا) كاملةً في صفحة واحدة.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { slug: "nawawi40", label: "الأربعون النووية (٤٢)" },
                  { slug: "qudsi40", label: "الأربعون القدسية (٤٠)" },
                  { slug: "shahwaliullah40", label: "الأربعون الدهلوية (٤٠)" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.slug}
                  type="button"
                  onClick={() => setSelectedFortySlug(tab.slug)}
                  className={cn(
                    "rounded-xl border px-3.5 py-2 text-xs font-extrabold transition",
                    selectedFortySlug === tab.slug
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background text-foreground hover:border-primary/40"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {isFortyLoading || !fortyData ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-card py-14 text-center shadow-soft">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-xs font-bold text-muted-foreground">
                جاري تحميل متن الأربعين...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {fortyData.items.map((item) => {
                const bSlug = item.bookSlug || selectedFortySlug;
                const bTitle =
                  item.bookTitleAr ||
                  fortyData.bookMeta?.shortTitleAr ||
                  "الأربعون النووية";
                const saved = isHadithSaved(bSlug, item.id);
                const copyKey = `${bSlug}:${item.id}`;

                return (
                  <article
                    key={copyKey}
                    className="rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-xl bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground">
                          الحديث {toArabicDigits(item.id)}
                        </span>
                        <span className="rounded-xl bg-gold/20 px-3 py-1 text-xs font-bold text-amber-900 dark:text-gold">
                          {bTitle}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleSave(item)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-bold transition",
                            saved
                              ? "border-gold bg-gold-muted text-gold"
                              : "border-border bg-background text-muted-foreground hover:bg-muted"
                          )}
                        >
                          <Bookmark className="h-3.5 w-3.5" />
                          <span>{saved ? "محفوظ" : "حفظ"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyHadith(item)}
                          className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted"
                        >
                          {copiedKey === copyKey ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          <span>نسخ</span>
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
        </div>
      )}

      {/* TAB 4: SAVED FAVORITE HADITHS */}
      {activeTab === "saved" && (
        <div className="space-y-4">
          {savedHadiths.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-card py-14 text-center shadow-soft">
              <Bookmark className="h-10 w-10 text-muted-foreground" />
              <p className="text-base font-bold text-foreground">
                لم تقم بحفظ أي أحاديث في المفضلة بعد
              </p>
              <p className="max-w-md text-xs text-muted-foreground">
                يمكنك الضغط على زر «حفظ» بجانب أي حديث نبوي شريف في أي كتاب من الكتب الـ
                ١٧ للرجوع إليه هنا في أي وقت.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("reader")}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
              >
                تصفح الأحاديث الآن
              </button>
            </div>
          ) : (
            savedHadiths.map((fav) => (
              <article
                key={fav.key}
                className="rounded-3xl border border-gold/40 bg-card p-5 shadow-soft sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-xl bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground">
                      حديث رقم {toArabicDigits(fav.hadithId)}
                    </span>
                    <span className="rounded-xl bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                      {fav.bookTitleAr}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {fav.chapterTitle}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyHadith({
                          id: fav.hadithId,
                          cid: 0,
                          text: fav.text,
                          bookSlug: fav.bookSlug,
                          bookTitleAr: fav.bookTitleAr,
                          chapterTitle: fav.chapterTitle,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>نسخ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleToggleSave({
                          id: fav.hadithId,
                          cid: 0,
                          text: fav.text,
                          bookSlug: fav.bookSlug,
                          bookTitleAr: fav.bookTitleAr,
                          chapterTitle: fav.chapterTitle,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>إزالة</span>
                    </button>
                  </div>
                </div>

                <p
                  className={cn(
                    "quran-verse-text mt-4 whitespace-pre-line text-justify text-foreground",
                    FONT_SIZE_CLASSES[fontSizeLevel]
                  )}
                >
                  {fav.text}
                </p>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
}
