"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlignJustify,
  Bookmark,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Layers,
  LayoutList,
  Mic,
  Pause,
  Play,
  Radio,
  Share2,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { QURAN_RECITERS } from "@/data/daily-content";
import {
  formatAudioTime,
  getAyahAudioUrl,
  getPreloadWindowIndices,
  getSurahFallbackAudioUrl,
  HAVE_ENOUGH_DATA_READY_STATE,
  PRELOAD_AHEAD_COUNT,
  shouldSmartCrossTrigger,
  SMART_CROSS_TRIGGER_LEAD_SECONDS,
} from "@/lib/quran/audio";
import {
  DEFAULT_QURAN_PREFS,
  getDailyWird,
  getLastReadPosition,
  getQuranBookmarks,
  getQuranPrefs,
  QuranReaderPrefs,
  saveDailyWird,
  saveLastReadPosition,
  saveQuranPrefs,
  toggleQuranBookmark,
} from "@/lib/storage/local-storage";
import { logSpiritualActivity } from "@/lib/storage/indexed-db";
import { getLocalDateKey, toArabicDigits, cn } from "@/lib/utils";
import {
  JuzDetail,
  JuzMeta,
  LastReadPosition,
  QuranAudioMode,
  QuranBookmark,
} from "@/types";

const FONT_SIZE_CLASSES: Record<1 | 2 | 3 | 4, string> = {
  1: "text-xl leading-[2.25]",
  2: "text-2xl leading-[2.35] sm:text-3xl sm:leading-[2.4]",
  3: "text-3xl leading-[2.45] sm:text-4xl sm:leading-[2.5]",
  4: "text-4xl leading-[2.55] sm:text-5xl sm:leading-[2.6]",
};

interface JuzVerseItem {
  index: number;
  surahId: number;
  surahName: string;
  ayahNumber: number;
  text: string;
}

export function JuzReaderClient({
  juz,
  allJuzs,
  prevJuz,
  nextJuz,
}: {
  juz: JuzDetail;
  allJuzs: JuzMeta[];
  prevJuz?: JuzMeta;
  nextJuz?: JuzMeta;
}) {
  const router = useRouter();
  const [prefs, setPrefs] = useState<QuranReaderPrefs>(DEFAULT_QURAN_PREFS);
  const [bookmarks, setBookmarks] = useState<QuranBookmark[]>([]);
  const [lastRead, setLastRead] = useState<LastReadPosition | null>(null);

  // Build flat ordered playlist of all verses in this Juz across its Surahs
  const juzPlaylist: JuzVerseItem[] = useMemo(() => {
    const list: JuzVerseItem[] = [];
    let idx = 0;
    for (const seg of juz.segments) {
      for (const verse of seg.verses) {
        list.push({
          index: idx++,
          surahId: seg.surahId,
          surahName: seg.surahName,
          ayahNumber: verse.id,
          text: verse.text,
        });
      }
    }
    return list;
  }, [juz]);

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [playingIndex, setPlayingIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [usingSurahFallback, setUsingSurahFallback] = useState<boolean>(false);

  // Dual-Audio Gapless Preloader State & Refs
  const audioSlotARef = useRef<HTMLAudioElement | null>(null);
  const audioSlotBRef = useRef<HTMLAudioElement | null>(null);
  const activeSlotRef = useRef<"A" | "B">("A");
  const preloadCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const crossTriggeredIndexRef = useRef<number | null>(null);
  const playingIndexRef = useRef<number>(0);
  const [preloadedReadyCount, setPreloadedReadyCount] = useState<number>(0);

  // Continuous Stream Progress State
  const [streamCurrentTime, setStreamCurrentTime] = useState<number>(0);
  const [streamDuration, setStreamDuration] = useState<number>(0);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [juzCompletedToday, setJuzCompletedToday] = useState(false);

  const audioMode: QuranAudioMode = prefs.audioMode || "gapless-ayah";
  const smartCrossTriggerEnabled = prefs.smartCrossTriggerEnabled !== false;

  const getActiveAudio = useCallback((): HTMLAudioElement | null => {
    return activeSlotRef.current === "A"
      ? audioSlotARef.current
      : audioSlotBRef.current;
  }, []);

  const getStandbyAudio = useCallback((): HTMLAudioElement | null => {
    return activeSlotRef.current === "A"
      ? audioSlotBRef.current
      : audioSlotARef.current;
  }, []);

  const stopAllAudio = useCallback(() => {
    if (audioSlotARef.current) {
      audioSlotARef.current.pause();
    }
    if (audioSlotBRef.current) {
      audioSlotBRef.current.pause();
    }
  }, []);

  useEffect(() => {
    playingIndexRef.current = playingIndex;
  }, [playingIndex]);

  useEffect(() => {
    setPrefs(getQuranPrefs());
    setBookmarks(getQuranBookmarks());
    setLastRead(getLastReadPosition());
    setSelectedIndex(0);
    setPlayingIndex(0);
    playingIndexRef.current = 0;
    setIsPlaying(false);
    setAudioError(null);
    setUsingSurahFallback(false);
    setPreloadedReadyCount(0);
    setStreamCurrentTime(0);
    setStreamDuration(0);
    crossTriggeredIndexRef.current = null;
    stopAllAudio();
    preloadCacheRef.current.clear();
  }, [juz.id, stopAllAudio]);

  const currentReciter =
    QURAN_RECITERS.find((r) => r.id === prefs.reciterId) || QURAN_RECITERS[0];

  const selectedRef = juzPlaylist[selectedIndex] || juzPlaylist[0];
  const playingRef = juzPlaylist[playingIndex] || juzPlaylist[0];

  useEffect(() => {
    const effVol = isMuted ? 0 : volume;
    if (audioSlotARef.current) {
      audioSlotARef.current.playbackRate = playbackRate;
      audioSlotARef.current.volume = effVol;
    }
    if (audioSlotBRef.current) {
      audioSlotBRef.current.playbackRate = playbackRate;
      audioSlotBRef.current.volume = effVol;
    }
  }, [playbackRate, volume, isMuted]);

  const updatePrefs = (partial: Partial<QuranReaderPrefs>) => {
    const updated = { ...prefs, ...partial };
    setPrefs(updated);
    saveQuranPrefs(updated);
  };

  const showToast = (msg: string) => {
    setSavedToast(msg);
    setTimeout(() => setSavedToast(null), 3200);
  };

  /**
   * 1. Dual-Audio Gapless Preloader:
   * Preloads the next 2 upcoming verses (idx + 1 and idx + 2) completely into memory
   * aiming for readyState = 4 (HAVE_ENOUGH_DATA), and primes the standby <audio> slot
   * with idx + 1 so transition happens in 0.00s without waiting for network.
   */
  const syncPreloadWindow = useCallback(
    (
      baseIdx: number,
      reciter: (typeof QURAN_RECITERS)[number],
      modeOverride?: QuranAudioMode
    ) => {
      if (typeof window === "undefined") return;
      const effectiveMode = modeOverride || audioMode;

      // In Continuous Stream mode, preload the next Surah's stream in standby slot
      if (effectiveMode === "continuous-surah") {
        const curItem = juzPlaylist[baseIdx];
        if (!curItem) return;
        const nextSurahItem = juzPlaylist.find(
          (item, i) => i > baseIdx && item.surahId !== curItem.surahId
        );
        const standby = getStandbyAudio();
        if (nextSurahItem && standby && reciter.surahAudioServerUrl) {
          const nextStreamUrl = getSurahFallbackAudioUrl(
            nextSurahItem.surahId,
            reciter.surahAudioServerUrl
          );
          if (nextStreamUrl && standby.src !== nextStreamUrl) {
            standby.preload = "auto";
            standby.src = nextStreamUrl;
            standby.load();
          }
        }
        setPreloadedReadyCount(1);
        return;
      }

      const upcomingIndices = getPreloadWindowIndices(
        baseIdx,
        juzPlaylist.length,
        PRELOAD_AHEAD_COUNT
      );
      if (upcomingIndices.length === 0) {
        setPreloadedReadyCount(0);
        return;
      }

      const activeUrls = new Set<string>();
      const recomputeReadyCount = () => {
        let ready = 0;
        for (const uIdx of upcomingIndices) {
          const item = juzPlaylist[uIdx];
          if (!item) continue;
          const u = getAyahAudioUrl(
            item.surahId,
            item.ayahNumber,
            reciter.everyAyahFolder
          );
          const cached = preloadCacheRef.current.get(u);
          if (cached && cached.readyState >= HAVE_ENOUGH_DATA_READY_STATE) {
            ready++;
          }
        }
        setPreloadedReadyCount(ready);
      };

      upcomingIndices.forEach((uIdx, offsetIdx) => {
        const item = juzPlaylist[uIdx];
        if (!item) return;
        const url = getAyahAudioUrl(
          item.surahId,
          item.ayahNumber,
          reciter.everyAyahFolder
        );
        activeUrls.add(url);

        // Prime standby DOM <audio> slot with the immediate next verse (idx + 1)
        if (offsetIdx === 0) {
          const standby = getStandbyAudio();
          if (standby && standby.src !== url) {
            standby.preload = "auto";
            standby.src = url;
            standby.playbackRate = playbackRate;
            standby.volume = isMuted ? 0 : volume;
            standby.load();
          }
        }

        // Also buffer both idx + 1 and idx + 2 in our memory Preload Cache (readyState = 4)
        let memAudio = preloadCacheRef.current.get(url);
        if (!memAudio) {
          memAudio = new Audio();
          memAudio.preload = "auto";
          memAudio.src = url;
          memAudio.addEventListener("canplaythrough", recomputeReadyCount, {
            once: true,
          });
          memAudio.addEventListener("loadeddata", recomputeReadyCount, {
            once: true,
          });
          memAudio.load();
          preloadCacheRef.current.set(url, memAudio);
        }
      });

      // Evict stale preloaded audio objects outside the current window
      const curItem = juzPlaylist[baseIdx];
      if (curItem) {
        activeUrls.add(
          getAyahAudioUrl(
            curItem.surahId,
            curItem.ayahNumber,
            reciter.everyAyahFolder
          )
        );
      }
      for (const [keyUrl, audioObj] of preloadCacheRef.current.entries()) {
        if (!activeUrls.has(keyUrl)) {
          audioObj.pause();
          audioObj.src = "";
          preloadCacheRef.current.delete(keyUrl);
        }
      }

      recomputeReadyCount();
    },
    [
      audioMode,
      getStandbyAudio,
      isMuted,
      juzPlaylist,
      playbackRate,
      volume,
    ]
  );

  // Keep upcoming 2 verses preloaded even before pressing play or when changing selection
  useEffect(() => {
    syncPreloadWindow(playingIndex, currentReciter);
  }, [playingIndex, currentReciter, syncPreloadWindow]);

  /**
   * Plays a specific verse index (in Gapless Ayah-by-Ayah mode) OR starts the
   * full uninterrupted Surah broadcast (in Continuous Stream mode).
   */
  const playVerseAtIndex = useCallback(
    async (
      idx: number,
      options?: {
        reciterOverride?: (typeof QURAN_RECITERS)[number];
        modeOverride?: QuranAudioMode;
        usePreloadedStandby?: boolean;
      }
    ) => {
      const targetItem = juzPlaylist[idx];
      if (!targetItem) return;

      const activeReciter = options?.reciterOverride || currentReciter;
      const effectiveMode = options?.modeOverride || audioMode;

      setAudioError(null);
      setPlayingIndex(idx);
      playingIndexRef.current = idx;
      setSelectedIndex(idx);
      crossTriggeredIndexRef.current = null;

      // MODE 2: Continuous Radio/Surah Stream (mp3quran.net)
      if (effectiveMode === "continuous-surah") {
        const streamUrl = getSurahFallbackAudioUrl(
          targetItem.surahId,
          activeReciter.surahAudioServerUrl
        );
        const activeAudio = getActiveAudio();
        const standbyAudio = getStandbyAudio();

        if (streamUrl && activeAudio) {
          setUsingSurahFallback(true);
          if (standbyAudio && standbyAudio.src === streamUrl && options?.usePreloadedStandby) {
            activeAudio.pause();
            activeSlotRef.current = activeSlotRef.current === "A" ? "B" : "A";
          }
          const player = getActiveAudio()!;
          if (player.src !== streamUrl) {
            player.src = streamUrl;
          }
          player.playbackRate = playbackRate;
          player.volume = isMuted ? 0 : volume;
          try {
            await player.play();
            setIsPlaying(true);
            syncPreloadWindow(idx, activeReciter, "continuous-surah");
            const el = document.getElementById(
              `surah-${targetItem.surahId}-ayah-${targetItem.ayahNumber}`
            );
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            return;
          } catch {
            // Fall through to ayah-by-ayah if stream fails
          }
        }
      }

      // MODE 1: Gapless Ayah-by-Ayah with Dual-Slot Instant Swap
      setUsingSurahFallback(false);
      const targetUrl = getAyahAudioUrl(
        targetItem.surahId,
        targetItem.ayahNumber,
        activeReciter.everyAyahFolder
      );

      let player = getActiveAudio();
      const standby = getStandbyAudio();

      // If standby slot already has targetUrl preloaded, swap slots for 0ms gapless playback!
      if (
        standby &&
        standby.src === targetUrl &&
        (options?.usePreloadedStandby || standby.readyState >= 2)
      ) {
        if (player) {
          player.pause();
          player.currentTime = 0;
        }
        activeSlotRef.current = activeSlotRef.current === "A" ? "B" : "A";
        player = standby;
      } else if (player) {
        if (standby) {
          standby.pause();
        }
        if (player.src !== targetUrl) {
          player.src = targetUrl;
        }
      }

      if (!player) return;
      player.playbackRate = playbackRate;
      player.volume = isMuted ? 0 : volume;

      try {
        player.currentTime = 0;
        await player.play();
        setIsPlaying(true);

        // Immediately preload the next 2 verses (idx + 1 and idx + 2) in memory (readyState = 4)
        syncPreloadWindow(idx, activeReciter, "gapless-ayah");

        const el = document.getElementById(
          `surah-${targetItem.surahId}-ayah-${targetItem.ayahNumber}`
        );
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } catch {
        // Automatic fallback to Continuous Surah Stream if an individual ayah file is missing
        const fallbackUrl = getSurahFallbackAudioUrl(
          targetItem.surahId,
          activeReciter.surahAudioServerUrl
        );
        if (fallbackUrl && player) {
          try {
            setUsingSurahFallback(true);
            player.src = fallbackUrl;
            await player.play();
            setIsPlaying(true);
            return;
          } catch {
            // fall through
          }
        }
        setIsPlaying(false);
        setAudioError(
          "تعذر تشغيل التلاوة الصوتية حاليًا (تأكد من الاتصال بالإنترنت). النص القرآني للجزء متاح بالكامل."
        );
      }
    },
    [
      audioMode,
      currentReciter,
      getActiveAudio,
      getStandbyAudio,
      isMuted,
      juzPlaylist,
      playbackRate,
      syncPreloadWindow,
      volume,
    ]
  );

  /**
   * 2. Smart Cross-Trigger (~120ms before the end of the current MP3 file):
   * High-frequency monitor (every 35ms) that checks if the current verse is within
   * 120ms of completion so it swaps to the preloaded standby audio slot BEFORE
   * trailing MP3 silence padding occurs.
   */
  useEffect(() => {
    if (!isPlaying) return;

    const timer = window.setInterval(() => {
      const player = getActiveAudio();
      if (!player || player.paused) return;

      if (usingSurahFallback || audioMode === "continuous-surah") {
        setStreamCurrentTime(player.currentTime || 0);
        setStreamDuration(Number.isFinite(player.duration) ? player.duration : 0);
        return;
      }

      if (!smartCrossTriggerEnabled) return;

      const curIdx = playingIndexRef.current;
      if (
        curIdx < juzPlaylist.length - 1 &&
        crossTriggeredIndexRef.current !== curIdx &&
        shouldSmartCrossTrigger(
          player.currentTime,
          player.duration,
          SMART_CROSS_TRIGGER_LEAD_SECONDS
        )
      ) {
        const standby = getStandbyAudio();
        // Trigger instant swap if standby slot has buffered data
        if (standby && standby.readyState >= 3) {
          crossTriggeredIndexRef.current = curIdx;
          playVerseAtIndex(curIdx + 1, { usePreloadedStandby: true });
        }
      }
    }, 35);

    return () => window.clearInterval(timer);
  }, [
    isPlaying,
    audioMode,
    usingSurahFallback,
    smartCrossTriggerEnabled,
    juzPlaylist.length,
    getActiveAudio,
    getStandbyAudio,
    playVerseAtIndex,
  ]);

  const togglePlayPause = async () => {
    const player = getActiveAudio();
    if (!player) return;
    if (isPlaying) {
      stopAllAudio();
      setIsPlaying(false);
    } else {
      // If paused mid-stream in continuous mode, resume from current position
      if (
        (audioMode === "continuous-surah" || usingSurahFallback) &&
        player.src &&
        player.currentTime > 0
      ) {
        try {
          await player.play();
          setIsPlaying(true);
          return;
        } catch {
          // fallback to fresh start
        }
      }
      await playVerseAtIndex(playingIndex ?? selectedIndex ?? 0);
    }
  };

  const handleSlotEnded = (slot: "A" | "B") => {
    // Ignore ended events from the inactive slot
    if (activeSlotRef.current !== slot) return;

    const curIdx = playingIndexRef.current;
    // If Smart Cross-Trigger already transitioned from curIdx, ignore duplicate onEnded
    if (crossTriggeredIndexRef.current === curIdx) return;

    if (usingSurahFallback || audioMode === "continuous-surah") {
      const currentSurahId = juzPlaylist[curIdx]?.surahId;
      const nextSurahVerseIdx = juzPlaylist.findIndex(
        (item, idx) => idx > curIdx && item.surahId !== currentSurahId
      );
      if (nextSurahVerseIdx !== -1) {
        playVerseAtIndex(nextSurahVerseIdx, { usePreloadedStandby: true });
      } else {
        setIsPlaying(false);
      }
      return;
    }

    if (curIdx < juzPlaylist.length - 1) {
      playVerseAtIndex(curIdx + 1, { usePreloadedStandby: true });
    } else {
      setIsPlaying(false);
    }
  };

  const handleSlotError = async (slot: "A" | "B") => {
    if (activeSlotRef.current !== slot) return;
    const player = getActiveAudio();
    if (!usingSurahFallback && playingRef && player) {
      const fallbackUrl = getSurahFallbackAudioUrl(
        playingRef.surahId,
        currentReciter.surahAudioServerUrl
      );
      if (fallbackUrl) {
        try {
          setUsingSurahFallback(true);
          player.src = fallbackUrl;
          await player.play();
          setIsPlaying(true);
          return;
        } catch {
          // fall through
        }
      }
    }
    setIsPlaying(false);
    setAudioError(
      "تعذر تحميل الملف الصوتي للآية. يرجى التحقق من اتصال الإنترنت."
    );
  };

  const handleSwitchAudioMode = (newMode: QuranAudioMode) => {
    updatePrefs({ audioMode: newMode });
    if (isPlaying) {
      playVerseAtIndex(playingIndex, { modeOverride: newMode });
    } else {
      setUsingSurahFallback(newMode === "continuous-surah");
      syncPreloadWindow(playingIndex, currentReciter, newMode);
    }
  };

  const findPlaylistIndex = (surahId: number, ayahNum: number): number => {
    const found = juzPlaylist.findIndex(
      (item) => item.surahId === surahId && item.ayahNumber === ayahNum
    );
    return found >= 0 ? found : 0;
  };

  const handleSaveLastRead = (
    surahId: number,
    surahName: string,
    ayahNum: number
  ) => {
    const pos: LastReadPosition = {
      surahId,
      surahName,
      ayahNumber: ayahNum,
      updatedAt: new Date().toISOString(),
    };
    saveLastReadPosition(pos);
    setLastRead(pos);
    showToast(
      `تم حفظ موضع القراءة: ${juz.nameAr} (سورة ${surahName} - الآية ${toArabicDigits(
        ayahNum
      )})`
    );
  };

  const handleToggleBookmark = (
    surahId: number,
    surahName: string,
    ayahNum: number,
    ayahText: string
  ) => {
    const res = toggleQuranBookmark({
      surahId,
      surahName,
      ayahNumber: ayahNum,
      ayahSnippet: ayahText,
    });
    setBookmarks(res.bookmarks);
    showToast(
      res.added
        ? `تمت إضافة الآية ${toArabicDigits(ayahNum)} من سورة ${surahName} إلى العلامات المرجعية`
        : `تمت إزالة الآية من العلامات المرجعية`
    );
  };

  const handleCopyAyah = async (
    surahId: number,
    surahName: string,
    ayahNum: number,
    ayahText: string
  ) => {
    const formatted = `﴿${ayahText}﴾ [سورة ${surahName}: ${ayahNum}]`;
    const key = `${surahId}:${ayahNum}`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleShareAyah = async (
    surahId: number,
    surahName: string,
    ayahNum: number,
    ayahText: string
  ) => {
    const formatted = `﴿${ayahText}﴾ [سورة ${surahName}: ${ayahNum}]`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${juz.nameAr} — سورة ${surahName} (${ayahNum})`,
          text: formatted,
        });
        return;
      } catch {
        // fallback to copy
      }
    }
    await handleCopyAyah(surahId, surahName, ayahNum, ayahText);
  };

  const handleCompleteJuzReading = async () => {
    const lastSeg = juz.segments[juz.segments.length - 1];
    if (lastSeg) {
      handleSaveLastRead(lastSeg.surahId, lastSeg.surahName, lastSeg.endAyah);
    }

    const wird = getDailyWird();
    const todayKey = getLocalDateKey();
    const addAmount =
      wird.unit === "juz" ? 1 : wird.unit === "pages" ? 20 : juz.totalVersesInJuz;
    const nextProgress = wird.currentProgressToday + addAmount;
    const completed = nextProgress >= wird.dailyTarget;

    saveDailyWird({
      ...wird,
      currentProgressToday: nextProgress,
      lastUpdatedDate: todayKey,
      completedDates: completed
        ? Array.from(new Set([...wird.completedDates, todayKey]))
        : wird.completedDates,
      history: {
        ...wird.history,
        [todayKey]: {
          target: wird.dailyTarget,
          unit: wird.unit,
          completedAmount: nextProgress,
          completed,
        },
      },
    });

    setJuzCompletedToday(true);
    await logSpiritualActivity({
      dateKey: todayKey,
      type: "quran-wird",
      titleAr: `إتمام قراءة ${juz.nameAr}`,
      detailsAr: `تمت قراءة ${juz.nameAr} (${juz.titleAr}) كاملًا بحمد الله`,
    });
    showToast(`تقبل الله منك! تم تسجيل قراءة ${juz.nameAr} في وردك اليومي.`);
  };

  const isBookmarked = (surahId: number, ayahNum: number) =>
    bookmarks.some((b) => b.id === `${surahId}:${ayahNum}`);

  return (
    <div className="space-y-6">
      {/* Dual-Audio Gapless Preloader Elements (Slot A & Slot B) */}
      <audio
        ref={audioSlotARef}
        onEnded={() => handleSlotEnded("A")}
        onError={() => handleSlotError("A")}
        preload="auto"
      />
      <audio
        ref={audioSlotBRef}
        onEnded={() => handleSlotEnded("B")}
        onError={() => handleSlotError("B")}
        preload="auto"
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

      {/* Top Breadcrumb & Juz Header Card */}
      <div className="rounded-3xl border border-border bg-card p-4 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border pb-3.5 sm:gap-3 sm:pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/quran?tab=juz"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:border-primary hover:text-primary sm:px-3.5"
            >
              <ChevronRight className="h-4 w-4" />
              <span>فهرس أجزاء القرآن (٣٠ جزءًا)</span>
            </Link>

            {/* Quick Jump to Any of the 30 Juzs */}
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-2.5 py-1.5">
              <Layers className="h-3.5 w-3.5 shrink-0 text-primary" />
              <select
                aria-label="الانتقال إلى جزء آخر"
                value={juz.id}
                onChange={(e) => router.push(`/quran/juz/${e.target.value}`)}
                className="bg-transparent text-xs font-bold text-foreground focus:outline-none"
              >
                {allJuzs.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                    className="bg-card text-foreground"
                  >
                    {toArabicDigits(item.id)}. {item.nameAr} ({item.titleAr})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground sm:gap-2 sm:text-xs">
            <span>
              من ص {toArabicDigits(juz.pageStart)} إلى ص {toArabicDigits(juz.pageEnd)}
            </span>
            <span>•</span>
            <span>{toArabicDigits(juz.totalVersesInJuz)} آية</span>
            <span>•</span>
            <span>{toArabicDigits(juz.segments.length)} سور</span>
          </div>
        </div>

        {/* Ornate Juz Banner */}
        <div className="my-4 flex flex-col items-center justify-center gap-3 rounded-2xl border border-gold/30 bg-gradient-to-l from-primary via-emerald-900 to-primary px-4 py-6 text-center text-white shadow-inner sm:my-5 sm:gap-3.5 sm:px-6 sm:py-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-black/20 px-3.5 py-1 text-xs font-bold text-gold">
            <span>الجزء رقم {toArabicDigits(juz.id)} من ٣٠</span>
            <span>•</span>
            <span>مطلع الجزء: «{juz.titleAr}»</span>
          </div>

          <h1 className="font-serif py-1 text-3xl font-bold leading-[1.7] text-white sm:text-5xl sm:leading-[1.7]">
            {juz.nameAr}
          </h1>

          <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-emerald-50">
            <span>
              يبدأ من سورة {juz.startSurahName} (آية {toArabicDigits(juz.startAyah)})
            </span>
            <span>←</span>
            <span>
              ينتهي عند سورة {juz.endSurahName} (آية {toArabicDigits(juz.endAyah)})
            </span>
          </div>
        </div>

        {/* 11 Sheikhs Quick Selector Pills for Juz Recitation */}
        <div className="mb-4 rounded-2xl border border-gold/30 bg-muted/30 p-3.5 sm:p-4">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-foreground sm:text-sm">
              <Mic className="h-4 w-4 text-primary" />
              <span>اختر صوت القارئ لتلاوة {juz.nameAr} (١١ قارئًا معتمدًا):</span>
            </div>
            <span className="text-[11px] font-bold text-primary">
              القارئ الحالي: {currentReciter.nameAr}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QURAN_RECITERS.map((rec) => {
              const active = prefs.reciterId === rec.id;
              return (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => {
                    updatePrefs({ reciterId: rec.id });
                    if (isPlaying) {
                      playVerseAtIndex(playingIndex, { reciterOverride: rec });
                    } else {
                      syncPreloadWindow(playingIndex, rec);
                    }
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all active:scale-95",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-foreground hover:border-primary/40 hover:text-primary"
                  )}
                >
                  <Volume2
                    className={cn(
                      "h-3 w-3 shrink-0",
                      active ? "text-gold" : "text-primary"
                    )}
                  />
                  <span>{rec.nameAr}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Two Listening Modes Selector + Gapless Preloader & Smart Cross-Trigger Status */}
        <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-3.5 sm:p-4">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-foreground sm:text-sm">
                  نظام التلاوة الصوتية لمنع التقطيع:
                </span>
                {audioMode === "gapless-ayah" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    <Zap className="h-3 w-3" />
                    <span>
                      التحميل المسبق المزدوج نشط (جاهز في الذاكرة:{" "}
                      {toArabicDigits(preloadedReadyCount)} من{" "}
                      {toArabicDigits(PRELOAD_AHEAD_COUNT)} آية • readyState=4)
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 dark:text-gold">
                    <Radio className="h-3 w-3" />
                    <span>بث إذاعي متصل ١٠٠٪ للسورة كاملة دون أي فواصل</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {audioMode === "gapless-ayah"
                  ? "يقوم المشغّل بتحميل الآيتين القادمتين في الذاكرة مسبقًا والانتقال الذكي قبل آخر 120ms لتلافي صمت نهاية ملف الـ MP3."
                  : `يتم تشغيل التسجيل الكامل المتصل لسورة ${playingRef?.surahName || juz.startSurahName} من خادم mp3quran.net كملف واحد متصل تمامًا.`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => handleSwitchAudioMode("gapless-ayah")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                    audioMode === "gapless-ayah"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>وضع الآية بآية السلس (Gapless)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchAudioMode("continuous-surah")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                    audioMode === "continuous-surah"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Radio className="h-3.5 w-3.5" />
                  <span>وضع التلاوة الإذاعية المتصلة</span>
                </button>
              </div>

              {audioMode === "gapless-ayah" && (
                <button
                  type="button"
                  onClick={() =>
                    updatePrefs({
                      smartCrossTriggerEnabled: !smartCrossTriggerEnabled,
                    })
                  }
                  title="الانتقال للآية المحمّلة مسبقًا قبل آخر 120ms لتفادي صمت نهاية الملف"
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-bold transition",
                    smartCrossTriggerEnabled
                      ? "border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300"
                      : "border-border bg-card text-muted-foreground"
                  )}
                >
                  <Zap className="h-3 w-3" />
                  <span>
                    الانتقال الذكي (120ms):{" "}
                    {smartCrossTriggerEnabled ? "مفعّل" : "متوقف"}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Continuous Stream Timeline Scrubber (when in Continuous Stream mode) */}
          {(audioMode === "continuous-surah" || usingSurahFallback) && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5">
              <span className="text-xs font-extrabold text-primary">
                البث المتصل: سورة {playingRef?.surahName}
              </span>
              <div className="flex min-w-[180px] flex-1 items-center gap-2" dir="ltr">
                <span className="w-11 text-right font-mono text-[11px] font-semibold text-muted-foreground">
                  {formatAudioTime(streamCurrentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={streamDuration > 0 ? streamDuration : 100}
                  step={1}
                  value={streamCurrentTime}
                  onChange={(e) => {
                    const nextSec = Number(e.target.value);
                    setStreamCurrentTime(nextSec);
                    const player = getActiveAudio();
                    if (player && Number.isFinite(player.duration)) {
                      player.currentTime = nextSec;
                    }
                  }}
                  aria-label="شريط تقدم التلاوة المتصلة"
                  className="h-1.5 flex-1 cursor-pointer accent-primary"
                />
                <span className="w-11 font-mono text-[11px] font-semibold text-muted-foreground">
                  {formatAudioTime(streamDuration)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Reader & Audio Controls Toolbar */}
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
                const newRecId = e.target.value;
                updatePrefs({ reciterId: newRecId });
                const found = QURAN_RECITERS.find((r) => r.id === newRecId);
                if (isPlaying && found) {
                  playVerseAtIndex(playingIndex, { reciterOverride: found });
                } else if (found) {
                  syncPreloadWindow(playingIndex, found);
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
                  onClick={() => playVerseAtIndex(Math.max(0, playingIndex - 1))}
                  disabled={playingIndex <= 0}
                  aria-label="الآية السابقة"
                  className="rounded-lg p-1.5 text-foreground hover:bg-card disabled:opacity-40"
                >
                  <SkipBack className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={togglePlayPause}
                  aria-label={isPlaying ? "إيقاف التلاوة" : "تشغيل تلاوة الجزء"}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-95"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    playVerseAtIndex(
                      Math.min(juzPlaylist.length - 1, playingIndex + 1),
                      { usePreloadedStandby: true }
                    )
                  }
                  disabled={playingIndex >= juzPlaylist.length - 1}
                  aria-label="الآية التالية"
                  className="rounded-lg p-1.5 text-foreground hover:bg-card disabled:opacity-40"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
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
      {prefs.viewMode === "mushaf" && selectedRef && (
        <div className="sticky top-[58px] z-30 flex flex-col gap-2.5 rounded-2xl border border-gold/40 bg-card/95 p-3 shadow-md backdrop-blur-md sm:top-[72px] sm:px-4 sm:py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <span className="shrink-0 rounded-xl bg-primary/15 px-3 py-1.5 text-xs font-extrabold text-primary">
              سورة {selectedRef.surahName} • آية {toArabicDigits(selectedRef.ayahNumber)}
            </span>
            <p className="quran-verse-text min-w-0 flex-1 py-0.5 text-base leading-[2.15] text-foreground sm:text-lg">
              ﴿
              {selectedRef.text.split(/\s+/).length > 10
                ? `${selectedRef.text.split(/\s+/).slice(0, 10).join(" ")} ...`
                : selectedRef.text}
              ﴾
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (isPlaying && playingIndex === selectedRef.index) {
                  setIsPlaying(false);
                  stopAllAudio();
                } else {
                  playVerseAtIndex(selectedRef.index);
                }
              }}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold transition",
                isPlaying && playingIndex === selectedRef.index
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {isPlaying && playingIndex === selectedRef.index ? (
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
              onClick={() =>
                handleSaveLastRead(
                  selectedRef.surahId,
                  selectedRef.surahName,
                  selectedRef.ayahNumber
                )
              }
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:border-primary hover:text-primary"
            >
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span>حفظ موضع القراءة</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleToggleBookmark(
                  selectedRef.surahId,
                  selectedRef.surahName,
                  selectedRef.ayahNumber,
                  selectedRef.text
                )
              }
              className={cn(
                "inline-flex items-center gap-1 whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-bold transition",
                isBookmarked(selectedRef.surahId, selectedRef.ayahNumber)
                  ? "border-gold bg-gold-muted text-gold"
                  : "border-border bg-background text-foreground hover:bg-muted"
              )}
            >
              <Bookmark className="h-3.5 w-3.5" />
              <span>
                {isBookmarked(selectedRef.surahId, selectedRef.ayahNumber)
                  ? "محفوظة بالمرجعية"
                  : "علامة مرجعية"}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleCopyAyah(
                  selectedRef.surahId,
                  selectedRef.surahName,
                  selectedRef.ayahNumber,
                  selectedRef.text
                )
              }
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              {copiedKey === `${selectedRef.surahId}:${selectedRef.ayahNumber}` ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>نسخ</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleShareAyah(
                  selectedRef.surahId,
                  selectedRef.surahName,
                  selectedRef.ayahNumber,
                  selectedRef.text
                )
              }
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>مشاركة</span>
            </button>
          </div>
        </div>
      )}

      {/* JUZ SEGMENTS (Surahs within this Juz) */}
      <div className="space-y-6">
        {juz.segments.map((seg) => (
          <section
            key={`${juz.id}-surah-${seg.surahId}`}
            aria-label={`سورة ${seg.surahName} في ${juz.nameAr}`}
            className="space-y-4"
          >
            {/* Surah Segment Header Banner */}
            <div className="flex flex-col items-center justify-between gap-2 rounded-2xl border border-gold/35 bg-gradient-to-l from-primary/10 via-gold/10 to-primary/10 px-4 py-3.5 sm:flex-row sm:px-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-extrabold text-primary-foreground">
                  {toArabicDigits(seg.surahId)}
                </span>
                <div>
                  <h2 className="font-quran text-xl font-bold text-foreground sm:text-2xl">
                    سُورَةُ {seg.surahName}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {seg.surahTypeAr} • الآيات في هذا الجزء: من{" "}
                    {toArabicDigits(seg.startAyah)} إلى {toArabicDigits(seg.endAyah)} (من أصل{" "}
                    {toArabicDigits(seg.totalSurahVerses)} آية)
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    playVerseAtIndex(findPlaylistIndex(seg.surahId, seg.startAyah))
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
                >
                  <Play className="h-3 w-3 fill-current" />
                  <span>تلاوة من بداية السورة بالجزء</span>
                </button>

                <Link
                  href={`/quran/${seg.surahId}`}
                  className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-primary transition hover:border-primary"
                >
                  <span>السورة كاملة</span>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Bismillah Banner if Surah starts at verse 1 (except Al-Fatihah & At-Tawbah) */}
            {seg.showBismillah && (
              <div className="rounded-2xl border border-gold/25 bg-card py-4 text-center shadow-sm">
                <p className="font-quran text-2xl font-bold text-primary sm:text-3xl">
                  بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
                </p>
              </div>
            )}

            {/* MODE 1: Continuous Mushaf View */}
            {prefs.viewMode === "mushaf" ? (
              <article className="rounded-3xl border-2 border-gold/30 bg-card p-5 shadow-soft sm:p-8 md:p-10">
                <div
                  className={cn(
                    "quran-verse-text text-justify text-foreground",
                    FONT_SIZE_CLASSES[prefs.fontSizeLevel]
                  )}
                >
                  {seg.verses.map((verse) => {
                    const pIdx = findPlaylistIndex(seg.surahId, verse.id);
                    const isSelected = selectedIndex === pIdx;
                    const isCurrentlyPlaying = isPlaying && playingIndex === pIdx;
                    const isSavedPos =
                      lastRead?.surahId === seg.surahId &&
                      lastRead?.ayahNumber === verse.id;

                    return (
                      <span
                        key={`${seg.surahId}:${verse.id}`}
                        id={`surah-${seg.surahId}-ayah-${verse.id}`}
                        onClick={() => setSelectedIndex(pIdx)}
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
                          title={`سورة ${seg.surahName} - الآية ${verse.id}`}
                        >
                          ﴿{toArabicDigits(verse.id)}﴾
                        </span>{" "}
                      </span>
                    );
                  })}
                </div>
              </article>
            ) : (
              /* MODE 2: Verse-by-Verse Cards */
              <div className="space-y-3.5">
                {seg.verses.map((verse) => {
                  const pIdx = findPlaylistIndex(seg.surahId, verse.id);
                  const isCurrentlyPlaying = isPlaying && playingIndex === pIdx;
                  const isSavedPos =
                    lastRead?.surahId === seg.surahId &&
                    lastRead?.ayahNumber === verse.id;
                  const bookmarked = isBookmarked(seg.surahId, verse.id);
                  const copyKey = `${seg.surahId}:${verse.id}`;

                  return (
                    <article
                      key={copyKey}
                      id={`surah-${seg.surahId}-ayah-${verse.id}`}
                      className={cn(
                        "scroll-mt-28 rounded-3xl border p-4 transition-all sm:p-6",
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
                            سورة {seg.surahName} • الآية {toArabicDigits(verse.id)}
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
                            onClick={() => playVerseAtIndex(pIdx)}
                            className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground"
                          >
                            <Play className="h-3.5 w-3.5" />
                            <span>استماع</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleSaveLastRead(
                                seg.surahId,
                                seg.surahName,
                                verse.id
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-xl border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>حفظ الموضع</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleToggleBookmark(
                                seg.surahId,
                                seg.surahName,
                                verse.id,
                                verse.text
                              )
                            }
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
                            onClick={() =>
                              handleCopyAyah(
                                seg.surahId,
                                seg.surahName,
                                verse.id,
                                verse.text
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-xl border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
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
          </section>
        ))}
      </div>

      {/* Previous & Next Juz Navigation + Complete Juz Button */}
      <div className="flex flex-col items-center justify-between gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:p-5">
        {prevJuz ? (
          <Link
            href={`/quran/juz/${prevJuz.id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-5 py-3 text-xs font-bold text-foreground transition hover:border-primary hover:text-primary sm:w-auto sm:text-sm"
          >
            <ChevronRight className="h-4 w-4" />
            <span>الجزء السابق: {prevJuz.nameAr}</span>
          </Link>
        ) : (
          <div className="hidden sm:block" />
        )}

        <button
          type="button"
          onClick={handleCompleteJuzReading}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-xs font-extrabold transition sm:w-auto sm:text-sm",
            juzCompletedToday
              ? "bg-emerald-600 text-white"
              : "bg-gold text-emerald-950 shadow-gold hover:bg-gold/90"
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>
            {juzCompletedToday
              ? `تم تسجيل قراءة ${juz.nameAr} بحمد الله`
              : `إتمام قراءة ${juz.nameAr} وتسجيله بالورد`}
          </span>
        </button>

        {nextJuz ? (
          <Link
            href={`/quran/juz/${nextJuz.id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 sm:w-auto sm:text-sm"
          >
            <span>الجزء التالي: {nextJuz.nameAr}</span>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <Link
            href="/quran/juz/1"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-bold text-primary-foreground sm:w-auto sm:text-sm"
          >
            <span>العودة إلى الجزء الأول (ختمة جديدة)</span>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
