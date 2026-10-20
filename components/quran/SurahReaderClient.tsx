"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlignJustify,
  Bookmark,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  LayoutList,
  Pause,
  Play,
  Share2,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  AlertCircle,
} from "lucide-react";
import { QURAN_RECITERS } from "@/data/daily-content";
import { getAyahAudioUrl } from "@/lib/quran/audio";
import {
  DEFAULT_QURAN_PREFS,
  getLastReadPosition,
  getQuranBookmarks,
  getQuranPrefs,
  QuranReaderPrefs,
  saveLastReadPosition,
  saveQuranPrefs,
  toggleQuranBookmark,
} from "@/lib/storage/local-storage";
import { cacheSurahInIndexedDB } from "@/lib/storage/indexed-db";
import { toArabicDigits, cn } from "@/lib/utils";
import { LastReadPosition, QuranBookmark, SurahDetail, SurahMeta } from "@/types";

const FONT_SIZE_CLASSES: Record<1 | 2 | 3 | 4, string> = {
  1: "text-xl leading-[2.25]",
  2: "text-2xl leading-[2.35] sm:text-3xl sm:leading-[2.4]",
  3: "text-3xl leading-[2.45] sm:text-4xl sm:leading-[2.5]",
  4: "text-4xl leading-[2.55] sm:text-5xl sm:leading-[2.6]",
};

export function SurahReaderClient({
  surah,
  prevSurah,
  nextSurah,
}: {
  surah: SurahDetail;
  prevSurah?: SurahMeta;
  nextSurah?: SurahMeta;
}) {
  const [prefs, setPrefs] = useState<QuranReaderPrefs>(DEFAULT_QURAN_PREFS);
  const [selectedAyah, setSelectedAyah] = useState<number>(1);
  const [bookmarks, setBookmarks] = useState<QuranBookmark[]>([]);
  const [lastRead, setLastRead] = useState<LastReadPosition | null>(null);
  const [copiedAyah, setCopiedAyah] = useState<number | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingAyah, setPlayingAyah] = useState<number>(1);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  useEffect(() => {
    setPrefs(getQuranPrefs());
    setBookmarks(getQuranBookmarks());
    const savedPos = getLastReadPosition();
    setLastRead(savedPos);

    // Cache surah in IndexedDB for offline access
    cacheSurahInIndexedDB(surah);

    // Check URL hash #ayah-N
    if (typeof window !== "undefined" && window.location.hash.startsWith("#ayah-")) {
      const num = parseInt(window.location.hash.replace("#ayah-", ""), 10);
      if (!Number.isNaN(num) && num >= 1 && num <= surah.totalVerses) {
        setSelectedAyah(num);
        setPlayingAyah(num);
      }
    } else if (savedPos && savedPos.surahId === surah.id) {
      setSelectedAyah(savedPos.ayahNumber);
      setPlayingAyah(savedPos.ayahNumber);
    }
  }, [surah]);

  const currentReciter =
    QURAN_RECITERS.find((r) => r.id === prefs.reciterId) || QURAN_RECITERS[0];

  const updatePrefs = (partial: Partial<QuranReaderPrefs>) => {
    const updated = { ...prefs, ...partial };
    setPrefs(updated);
    saveQuranPrefs(updated);
  };

  // Handle Audio Playback
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = playbackRate;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [playbackRate, volume, isMuted]);

  const playSpecificAyah = async (ayahNum: number) => {
    setAudioError(null);
    setPlayingAyah(ayahNum);
    setSelectedAyah(ayahNum);

    if (!audioRef.current) return;
    const url = getAyahAudioUrl(surah.id, ayahNum, currentReciter.everyAyahFolder);
    audioRef.current.src = url;
    audioRef.current.playbackRate = playbackRate;
    audioRef.current.volume = isMuted ? 0 : volume;

    try {
      await audioRef.current.play();
      setIsPlaying(true);

      // Scroll ayah into view smoothly
      const el = document.getElementById(`ayah-${ayahNum}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } catch {
      setIsPlaying(false);
      setAudioError(
        "تعذر تشغيل التلاوة الصوتية حالياً (تأكد من الاتصال بالإنترنت للوصول إلى خادم الصوتيات). النص القرآني متاح بالكامل دون إنترنت."
      );
    }
  };

  const togglePlayPause = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      await playSpecificAyah(playingAyah || selectedAyah || 1);
    }
  };

  const handleAudioEnded = () => {
    if (playingAyah < surah.totalVerses) {
      playSpecificAyah(playingAyah + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const handleSaveLastRead = (ayahNum: number) => {
    const pos: LastReadPosition = {
      surahId: surah.id,
      surahName: surah.name,
      ayahNumber: ayahNum,
      updatedAt: new Date().toISOString(),
    };
    saveLastReadPosition(pos);
    setLastRead(pos);
    setSavedToast(`تم حفظ موضع القراءة: سورة ${surah.name} - الآية ${toArabicDigits(ayahNum)}`);
    setTimeout(() => setSavedToast(null), 3000);
  };

  const handleToggleBookmark = (ayahNum: number, ayahText: string) => {
    const res = toggleQuranBookmark({
      surahId: surah.id,
      surahName: surah.name,
      ayahNumber: ayahNum,
      ayahSnippet: ayahText,
    });
    setBookmarks(res.bookmarks);
    setSavedToast(
      res.added
        ? `تمت إضافة الآية ${toArabicDigits(ayahNum)} إلى العلامات المرجعية`
        : `تمت إزالة الآية ${toArabicDigits(ayahNum)} من العلامات المرجعية`
    );
    setTimeout(() => setSavedToast(null), 3000);
  };

  const handleCopyAyah = async (ayahNum: number, ayahText: string) => {
    const formatted = `﴿${ayahText}﴾ [سورة ${surah.name}: ${ayahNum}]`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedAyah(ayahNum);
      setTimeout(() => setCopiedAyah(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleShareAyah = async (ayahNum: number, ayahText: string) => {
    const formatted = `﴿${ayahText}﴾ [سورة ${surah.name}: ${ayahNum}]`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `سورة ${surah.name} - الآية ${ayahNum}`,
          text: formatted,
        });
        return;
      } catch {
        // fallback to copy
      }
    }
    await handleCopyAyah(ayahNum, ayahText);
  };

  const isBookmarked = (ayahNum: number) =>
    bookmarks.some((b) => b.id === `${surah.id}:${ayahNum}`);

  const selectedVerseObj =
    surah.verses.find((v) => v.id === selectedAyah) || surah.verses[0];

  return (
    <div className="space-y-6">
      {/* Hidden HTML5 Audio Element */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onError={() => {
          setIsPlaying(false);
          setAudioError(
            "تعذر تحميل الملف الصوتي للآية. يرجى التحقق من اتصال الإنترنت."
          );
        }}
        preload="none"
      />

      {/* Toast Notification */}
      {savedToast && (
        <div
          role="status"
          className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-gold/40 bg-emerald-950 px-4 py-3 text-center text-xs font-bold text-white shadow-gold md:bottom-8"
        >
          {savedToast}
        </div>
      )}

      {/* Top Breadcrumb & Surah Header Card */}
      <div className="rounded-3xl border border-border bg-card p-4 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border pb-3.5 sm:gap-3 sm:pb-4">
          <Link
            href="/quran"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:border-primary hover:text-primary sm:px-3.5"
          >
            <ChevronRight className="h-4 w-4" />
            <span>فهرس سور القرآن الكريم</span>
          </Link>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground sm:gap-2 sm:text-xs">
            <span>ترتيب المصحف: {toArabicDigits(surah.id)}</span>
            <span>•</span>
            <span>{surah.typeAr}</span>
            <span>•</span>
            <span>{toArabicDigits(surah.totalVerses)} آية</span>
            <span>•</span>
            <span>الجزء {toArabicDigits(surah.juzStart)}</span>
          </div>
        </div>

        {/* Ornate Surah Banner */}
        <div className="my-4 flex flex-col items-center justify-center gap-3 rounded-2xl border border-gold/30 bg-gradient-to-l from-primary via-emerald-900 to-primary px-4 py-6 text-center text-white shadow-inner sm:my-5 sm:gap-3.5 sm:px-6 sm:py-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-black/20 px-3.5 py-1 text-xs font-bold text-gold">
            <span>سورة رقم {toArabicDigits(surah.id)}</span>
            <span>•</span>
            <span>الصفحة {toArabicDigits(surah.pageStart)}</span>
          </div>
          <h1 className="font-serif py-1.5 text-3xl font-bold leading-[1.75] text-white sm:text-5xl sm:leading-[1.75]">
            سُورَةُ {surah.name}
          </h1>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-emerald-50">
            <span>{surah.typeAr}</span>
            <span>•</span>
            <span>عدد آياتها {toArabicDigits(surah.totalVerses)} آية</span>
          </div>
        </div>

        {/* Reader Controls Toolbar: View Mode, Font Size, Reciter */}
        <div className="flex flex-col justify-between gap-3.5 pt-1 lg:flex-row lg:items-center">
          {/* View Mode & Font Size */}
          <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-start sm:gap-3">
            <div className="inline-flex rounded-xl border border-border bg-muted/50 p-1">
              <button
                type="button"
                onClick={() => updatePrefs({ viewMode: "mushaf" })}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-bold transition sm:px-3",
                  prefs.viewMode === "mushaf"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <AlignJustify className="h-3.5 w-3.5" />
                <span>المصحف المتصل</span>
              </button>
              <button
                type="button"
                onClick={() => updatePrefs({ viewMode: "cards" })}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-bold transition sm:px-3",
                  prefs.viewMode === "cards"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span>آية بآية</span>
              </button>
            </div>

            {/* Font Size Controls */}
            <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-2.5 py-1.5 sm:gap-1.5 sm:px-3">
              <span className="text-xs font-semibold text-muted-foreground">الخط:</span>
              <button
                type="button"
                onClick={() =>
                  updatePrefs({
                    fontSizeLevel: Math.max(1, prefs.fontSizeLevel - 1) as 1 | 2 | 3 | 4,
                  })
                }
                disabled={prefs.fontSizeLevel <= 1}
                aria-label="تصغير الخط القرآني"
                className="rounded-lg p-1 text-foreground hover:bg-muted disabled:opacity-40"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="min-w-[20px] text-center text-xs font-bold text-primary">
                {toArabicDigits(prefs.fontSizeLevel)}
              </span>
              <button
                type="button"
                onClick={() =>
                  updatePrefs({
                    fontSizeLevel: Math.min(4, prefs.fontSizeLevel + 1) as 1 | 2 | 3 | 4,
                  })
                }
                disabled={prefs.fontSizeLevel >= 4}
                aria-label="تكبير الخط القرآني"
                className="rounded-lg p-1 text-foreground hover:bg-muted disabled:opacity-40"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Audio Player Bar */}
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-muted/40 p-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
            <select
              aria-label="اختيار القارئ"
              value={prefs.reciterId}
              onChange={(e) => {
                updatePrefs({ reciterId: e.target.value });
                if (isPlaying) {
                  setIsPlaying(false);
                  audioRef.current?.pause();
                }
              }}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground sm:w-auto sm:py-1.5"
            >
              {QURAN_RECITERS.map((rec) => (
                <option key={rec.id} value={rec.id}>
                  {rec.nameAr}
                </option>
              ))}
            </select>

            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
              <div className="flex items-center gap-1" dir="ltr">
                <button
                  type="button"
                  onClick={() => playSpecificAyah(Math.max(1, playingAyah - 1))}
                  disabled={playingAyah <= 1}
                  aria-label="الآية السابقة"
                  className="rounded-lg p-1.5 text-foreground hover:bg-card disabled:opacity-40"
                >
                  <SkipBack className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={togglePlayPause}
                  aria-label={isPlaying ? "إيقاف التلاوة" : "تشغيل التلاوة"}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-95"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    playSpecificAyah(Math.min(surah.totalVerses, playingAyah + 1))
                  }
                  disabled={playingAyah >= surah.totalVerses}
                  aria-label="الآية التالية"
                  className="rounded-lg p-1.5 text-foreground hover:bg-card disabled:opacity-40"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Playback Speed */}
                <select
                  aria-label="سرعة التلاوة"
                  value={playbackRate}
                  onChange={(e) => setPlaybackRate(Number(e.target.value))}
                  className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-bold text-foreground"
                >
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                </select>

                {/* Mute / Volume */}
                <button
                  type="button"
                  onClick={() => setIsMuted((prev) => !prev)}
                  aria-label={isMuted ? "إلغاء كتم الصوت" : "كتم الصوت"}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setIsMuted(false);
                    setVolume(Number(e.target.value));
                  }}
                  aria-label="مستوى الصوت"
                  className="hidden w-16 accent-primary sm:block"
                />
              </div>
            </div>
          </div>
        </div>

        {audioError && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{audioError}</span>
          </div>
        )}
      </div>

      {/* Selected Ayah Quick Action Bar (in Mushaf continuous mode) */}
      {prefs.viewMode === "mushaf" && selectedVerseObj && (
        <div className="sticky top-[58px] z-30 flex flex-col gap-2.5 rounded-2xl border border-gold/40 bg-card/95 p-3 shadow-md backdrop-blur-md sm:top-[72px] sm:px-4 sm:py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
            <span className="shrink-0 rounded-xl bg-primary/15 px-3 py-1.5 text-xs font-extrabold text-primary">
              الآية المحددة: {toArabicDigits(selectedVerseObj.id)}
            </span>
            <p className="quran-verse-text min-w-0 flex-1 py-0.5 text-base leading-[2.15] text-foreground sm:text-lg">
              ﴿
              {selectedVerseObj.text.split(/\s+/).length > 10
                ? `${selectedVerseObj.text.split(/\s+/).slice(0, 10).join(" ")} ...`
                : selectedVerseObj.text}
              ﴾
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (isPlaying && playingAyah === selectedVerseObj.id) {
                  setIsPlaying(false);
                  audioRef.current?.pause();
                } else {
                  playSpecificAyah(selectedVerseObj.id);
                }
              }}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold transition",
                isPlaying && playingAyah === selectedVerseObj.id
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {isPlaying && playingAyah === selectedVerseObj.id ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  <span>إيقاف التلاوة</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>استماع للآية</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSaveLastRead(selectedVerseObj.id)}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:border-primary hover:text-primary"
            >
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span>حفظ كموضع قراءة</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleToggleBookmark(selectedVerseObj.id, selectedVerseObj.text)
              }
              className={cn(
                "inline-flex items-center gap-1 whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-bold transition",
                isBookmarked(selectedVerseObj.id)
                  ? "border-gold bg-gold-muted text-gold"
                  : "border-border bg-background text-foreground hover:bg-muted"
              )}
            >
              <Bookmark className="h-3.5 w-3.5" />
              <span>
                {isBookmarked(selectedVerseObj.id) ? "محفوظة بالمرجعية" : "علامة مرجعية"}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleCopyAyah(selectedVerseObj.id, selectedVerseObj.text)
              }
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              {copiedAyah === selectedVerseObj.id ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>نسخ</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleShareAyah(selectedVerseObj.id, selectedVerseObj.text)
              }
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>مشاركة</span>
            </button>
          </div>
        </div>
      )}

      {/* Bismillah Banner (for all Surahs except 1 Al-Fatihah and 9 At-Tawbah) */}
      {surah.id !== 1 && surah.id !== 9 && (
        <div className="rounded-2xl border border-gold/25 bg-card py-5 text-center shadow-sm">
          <p className="font-quran text-2xl font-bold text-primary sm:text-3xl">
            بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
          </p>
        </div>
      )}

      {/* READING MODE 1: Continuous Mushaf View */}
      {prefs.viewMode === "mushaf" ? (
        <article
          aria-label={`نص سورة ${surah.name}`}
          className="rounded-3xl border-2 border-gold/30 bg-card p-6 shadow-soft sm:p-10 md:p-12"
        >
          <div
            className={cn(
              "quran-verse-text text-justify text-foreground",
              FONT_SIZE_CLASSES[prefs.fontSizeLevel]
            )}
          >
            {surah.verses.map((verse) => {
              const isSelected = selectedAyah === verse.id;
              const isCurrentlyPlaying = isPlaying && playingAyah === verse.id;
              const isSavedPos =
                lastRead?.surahId === surah.id && lastRead?.ayahNumber === verse.id;

              return (
                <span
                  key={verse.id}
                  id={`ayah-${verse.id}`}
                  onClick={() => setSelectedAyah(verse.id)}
                  className={cn(
                    "inline cursor-pointer rounded-xl px-1.5 py-0.5 transition-colors",
                    isCurrentlyPlaying
                      ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                      : isSelected
                      ? "bg-gold-muted/70 text-foreground"
                      : isSavedPos
                      ? "underline decoration-gold decoration-2 underline-offset-8"
                      : "hover:bg-muted/70"
                  )}
                >
                  <span>{verse.text} </span>
                  <span
                    className="mx-1 inline-flex select-none items-center justify-center font-quran text-[0.75em] font-bold text-gold"
                    title={`الآية ${verse.id}`}
                  >
                    ﴿{toArabicDigits(verse.id)}﴾
                  </span>{" "}
                </span>
              );
            })}
          </div>
        </article>
      ) : (
        /* READING MODE 2: Verse-by-Verse Cards */
        <div className="space-y-4">
          {surah.verses.map((verse) => {
            const isCurrentlyPlaying = isPlaying && playingAyah === verse.id;
            const isSavedPos =
              lastRead?.surahId === surah.id && lastRead?.ayahNumber === verse.id;
            const bookmarked = isBookmarked(verse.id);

            return (
              <article
                key={verse.id}
                id={`ayah-${verse.id}`}
                className={cn(
                  "scroll-mt-28 rounded-3xl border p-5 transition-all sm:p-6",
                  isCurrentlyPlaying
                    ? "border-primary bg-primary/5 shadow-md"
                    : isSavedPos
                    ? "border-gold bg-gold-muted/20"
                    : "border-border bg-card shadow-soft"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-xs font-extrabold text-primary">
                      {toArabicDigits(verse.id)}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      سورة {surah.name} • الآية {toArabicDigits(verse.id)}
                    </span>
                    {isSavedPos && (
                      <span className="rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold text-emerald-950">
                        آخر موضع قراءة
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => playSpecificAyah(verse.id)}
                      className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>استماع</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveLastRead(verse.id)}
                      className="inline-flex items-center gap-1 rounded-xl border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>حفظ الموضع</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleBookmark(verse.id, verse.text)}
                      aria-label="علامة مرجعية"
                      className={cn(
                        "inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-medium",
                        bookmarked
                          ? "border-gold bg-gold-muted text-gold"
                          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                      <span>{bookmarked ? "محفوظة" : "مرجعية"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyAyah(verse.id, verse.text)}
                      className="inline-flex items-center gap-1 rounded-xl border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {copiedAyah === verse.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>نسخ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareAyah(verse.id, verse.text)}
                      className="inline-flex items-center gap-1 rounded-xl border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>مشاركة</span>
                    </button>
                  </div>
                </div>

                <p
                  className={cn(
                    "quran-verse-text mt-4 text-right text-foreground",
                    FONT_SIZE_CLASSES[prefs.fontSizeLevel]
                  )}
                >
                  {verse.text}{" "}
                  <span className="font-quran text-[0.75em] text-gold">
                    ﴿{toArabicDigits(verse.id)}﴾
                  </span>
                </p>
              </article>
            );
          })}
        </div>
      )}

      {/* Previous & Next Surah Footer Navigation */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-border bg-card p-5 shadow-soft sm:flex-row">
        {prevSurah ? (
          <Link
            href={`/quran/${prevSurah.id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-5 py-3 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary sm:w-auto"
          >
            <ChevronRight className="h-4 w-4" />
            <span>السورة السابقة: سورة {prevSurah.name}</span>
          </Link>
        ) : (
          <div />
        )}

        <button
          type="button"
          onClick={() => handleSaveLastRead(surah.totalVerses)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary/10 px-5 py-3 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground sm:w-auto"
        >
          <BookOpen className="h-4 w-4" />
          <span>حفظ ختام سورة {surah.name} كآخر موضع قراءة</span>
        </button>

        {nextSurah ? (
          <Link
            href={`/quran/${nextSurah.id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 sm:w-auto"
          >
            <span>السورة التالية: سورة {nextSurah.name}</span>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <Link
            href="/quran/1"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gold px-5 py-3 text-sm font-bold text-emerald-950 sm:w-auto"
          >
            <span>العودة إلى سورة الفاتحة</span>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
