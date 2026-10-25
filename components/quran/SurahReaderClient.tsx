"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlignJustify,
  Bookmark,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
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
  AUDIO_OVERLAP_HOLD_MS,
  DEEP_OVERLAP_LEAD_SECONDS,
  DEEP_START_SILENCE_SKIP_SECONDS,
  formatAudioTime,
  getAyahAudioUrl,
  getEffectiveStartSkipSeconds,
  getPreloadWindowIndices,
  getSurahFallbackAudioUrl,
  HAVE_ENOUGH_DATA_READY_STATE,
  PRELOAD_AHEAD_COUNT,
  shouldSmartCrossTrigger,
  SMART_CROSS_TRIGGER_LEAD_SECONDS,
  START_SILENCE_SKIP_SECONDS,
} from "@/lib/quran/audio";
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
import {
  LastReadPosition,
  QuranAudioMode,
  QuranBookmark,
  SurahDetail,
  SurahMeta,
} from "@/types";

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingAyah, setPlayingAyah] = useState<number>(1);
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
  const crossTriggeredAyahRef = useRef<number | null>(null);
  const overlapTimeoutRef = useRef<number | null>(null);
  const playingAyahRef = useRef<number>(1);
  const [preloadedReadyCount, setPreloadedReadyCount] = useState<number>(0);

  // Continuous Stream Progress State
  const [streamCurrentTime, setStreamCurrentTime] = useState<number>(0);
  const [streamDuration, setStreamDuration] = useState<number>(0);

  const audioMode: QuranAudioMode = prefs.audioMode || "gapless-ayah";
  const smartCrossTriggerEnabled = prefs.smartCrossTriggerEnabled !== false;
  const gaplessTightness = prefs.gaplessTightness || "deep-overlap";
  const activeLeadSeconds =
    gaplessTightness === "deep-overlap"
      ? DEEP_OVERLAP_LEAD_SECONDS
      : SMART_CROSS_TRIGGER_LEAD_SECONDS;
  const activeStartSkipSeconds =
    gaplessTightness === "deep-overlap"
      ? DEEP_START_SILENCE_SKIP_SECONDS
      : START_SILENCE_SKIP_SECONDS;

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
    if (overlapTimeoutRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(overlapTimeoutRef.current);
      overlapTimeoutRef.current = null;
    }
    if (audioSlotARef.current) {
      audioSlotARef.current.pause();
    }
    if (audioSlotBRef.current) {
      audioSlotBRef.current.pause();
    }
  }, []);

  useEffect(() => {
    playingAyahRef.current = playingAyah;
  }, [playingAyah]);

  useEffect(() => {
    setPrefs(getQuranPrefs());
    setBookmarks(getQuranBookmarks());
    const savedPos = getLastReadPosition();
    setLastRead(savedPos);
    setIsPlaying(false);
    setAudioError(null);
    setUsingSurahFallback(false);
    setPreloadedReadyCount(0);
    setStreamCurrentTime(0);
    setStreamDuration(0);
    crossTriggeredAyahRef.current = null;
    stopAllAudio();
    preloadCacheRef.current.clear();

    // Cache surah in IndexedDB for offline access
    cacheSurahInIndexedDB(surah);

    // Check URL hash #ayah-N
    if (typeof window !== "undefined" && window.location.hash.startsWith("#ayah-")) {
      const num = parseInt(window.location.hash.replace("#ayah-", ""), 10);
      if (!Number.isNaN(num) && num >= 1 && num <= surah.totalVerses) {
        setSelectedAyah(num);
        setPlayingAyah(num);
        playingAyahRef.current = num;
      }
    } else if (savedPos && savedPos.surahId === surah.id) {
      setSelectedAyah(savedPos.ayahNumber);
      setPlayingAyah(savedPos.ayahNumber);
      playingAyahRef.current = savedPos.ayahNumber;
    } else {
      setSelectedAyah(1);
      setPlayingAyah(1);
      playingAyahRef.current = 1;
    }
  }, [surah, stopAllAudio]);

  const currentReciter =
    QURAN_RECITERS.find((r) => r.id === prefs.reciterId) || QURAN_RECITERS[0];

  const updatePrefs = (partial: Partial<QuranReaderPrefs>) => {
    const updated = { ...prefs, ...partial };
    setPrefs(updated);
    saveQuranPrefs(updated);
  };

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

  /**
   * 1. Dual-Audio Gapless Preloader:
   * Preloads the next 2 upcoming verses (ayahNum + 1 and ayahNum + 2) completely into memory
   * aiming for readyState = 4 (HAVE_ENOUGH_DATA), and primes the standby <audio> slot
   * with ayahNum + 1 so transition happens in 0.00s without waiting for network.
   */
  const syncPreloadWindow = useCallback(
    (
      currentAyahNum: number,
      reciter: (typeof QURAN_RECITERS)[number],
      modeOverride?: QuranAudioMode
    ) => {
      if (typeof window === "undefined") return;
      const effectiveMode = modeOverride || audioMode;

      if (effectiveMode === "continuous-surah") {
        setPreloadedReadyCount(1);
        return;
      }

      // 0-based index for getPreloadWindowIndices
      const baseZeroIdx = Math.max(0, currentAyahNum - 1);
      const upcomingZeroIndices = getPreloadWindowIndices(
        baseZeroIdx,
        surah.totalVerses,
        PRELOAD_AHEAD_COUNT
      );
      if (upcomingZeroIndices.length === 0) {
        setPreloadedReadyCount(0);
        return;
      }

      const activeUrls = new Set<string>();
      const recomputeReadyCount = () => {
        let ready = 0;
        for (const zIdx of upcomingZeroIndices) {
          const nextAyahNum = zIdx + 1;
          const u = getAyahAudioUrl(
            surah.id,
            nextAyahNum,
            reciter.everyAyahFolder
          );
          const cached = preloadCacheRef.current.get(u);
          if (cached && cached.readyState >= HAVE_ENOUGH_DATA_READY_STATE) {
            ready++;
          }
        }
        setPreloadedReadyCount(ready);
      };

      upcomingZeroIndices.forEach((zIdx, offsetIdx) => {
        const nextAyahNum = zIdx + 1;
        const url = getAyahAudioUrl(
          surah.id,
          nextAyahNum,
          reciter.everyAyahFolder
        );
        activeUrls.add(url);

        // Prime standby DOM <audio> slot with the immediate next verse (ayahNum + 1)
        // and pre-seek past leading MP3 silence while paused so play() starts in 0ms!
        if (offsetIdx === 0) {
          const standby = getStandbyAudio();
          if (standby) {
            const preSeekStandby = () => {
              if (!standby.paused || !smartCrossTriggerEnabled) return;
              const skipSec = getEffectiveStartSkipSeconds(
                standby.duration,
                activeStartSkipSeconds
              );
              if (skipSec > 0 && Math.abs(standby.currentTime - skipSec) > 0.02) {
                try {
                  standby.currentTime = skipSec;
                } catch {
                  // ignore if not seekable yet
                }
              }
            };

            if (standby.src !== url) {
              standby.preload = "auto";
              standby.src = url;
              standby.playbackRate = playbackRate;
              standby.volume = isMuted ? 0 : volume;
              standby.addEventListener("loadedmetadata", preSeekStandby, {
                once: true,
              });
              standby.addEventListener("canplay", preSeekStandby, {
                once: true,
              });
              standby.load();
            } else if (standby.readyState >= 1) {
              preSeekStandby();
            }
          }
        }

        // Buffer both ayahNum + 1 and ayahNum + 2 in our memory Preload Cache (readyState = 4)
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

      // Keep current ayah URL in activeUrls so it isn't evicted prematurely
      activeUrls.add(
        getAyahAudioUrl(surah.id, currentAyahNum, reciter.everyAyahFolder)
      );
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
      activeStartSkipSeconds,
      audioMode,
      getStandbyAudio,
      isMuted,
      playbackRate,
      smartCrossTriggerEnabled,
      surah.id,
      surah.totalVerses,
      volume,
    ]
  );

  // Preload initial 2 verses on mount or reciter change (while not actively mid-transition)
  useEffect(() => {
    if (!isPlaying) {
      syncPreloadWindow(playingAyahRef.current, currentReciter);
    }
  }, [surah.id, currentReciter, isPlaying, syncPreloadWindow]);

  const playSpecificAyah = useCallback(
    async (
      ayahNum: number,
      options?: {
        reciterOverride?: (typeof QURAN_RECITERS)[number];
        modeOverride?: QuranAudioMode;
        usePreloadedStandby?: boolean;
      }
    ) => {
      const activeReciter = options?.reciterOverride || currentReciter;
      const effectiveMode = options?.modeOverride || audioMode;

      if (overlapTimeoutRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(overlapTimeoutRef.current);
        overlapTimeoutRef.current = null;
      }

      setAudioError(null);
      setPlayingAyah(ayahNum);
      playingAyahRef.current = ayahNum;
      setSelectedAyah(ayahNum);
      crossTriggeredAyahRef.current = null;

      // MODE 2: Continuous Radio/Surah Stream (mp3quran.net)
      if (effectiveMode === "continuous-surah") {
        const streamUrl = getSurahFallbackAudioUrl(
          surah.id,
          activeReciter.surahAudioServerUrl
        );
        const player = getActiveAudio();
        if (streamUrl && player) {
          setUsingSurahFallback(true);
          if (player.src !== streamUrl) {
            player.src = streamUrl;
          }
          player.playbackRate = playbackRate;
          player.volume = isMuted ? 0 : volume;
          try {
            await player.play();
            setIsPlaying(true);
            syncPreloadWindow(ayahNum, activeReciter, "continuous-surah");
            return;
          } catch {
            // fall through to ayah-by-ayah
          }
        }
      }

      // MODE 1: Gapless Ayah-by-Ayah with True Audio Overlap & Pre-Seeked Standby Swap
      setUsingSurahFallback(false);
      const targetUrl = getAyahAudioUrl(
        surah.id,
        ayahNum,
        activeReciter.everyAyahFolder
      );

      const outgoingPlayer = getActiveAudio();
      const standby = getStandbyAudio();
      const effVol = isMuted ? 0 : volume;

      // Case A: Seamless Overlap Transition using preloaded & pre-seeked standby slot!
      if (
        standby &&
        standby.src === targetUrl &&
        (options?.usePreloadedStandby || standby.readyState >= 2)
      ) {
        activeSlotRef.current = activeSlotRef.current === "A" ? "B" : "A";
        standby.playbackRate = playbackRate;
        standby.volume = effVol;

        try {
          // Do NOT reset standby.currentTime = 0 here — it is already pre-seeked past leading silence!
          await standby.play();
          setIsPlaying(true);

          if (outgoingPlayer && !outgoingPlayer.paused) {
            outgoingPlayer.volume = effVol * 0.4;
            overlapTimeoutRef.current = window.setTimeout(() => {
              overlapTimeoutRef.current = null;
              outgoingPlayer.pause();
              outgoingPlayer.volume = effVol;
              syncPreloadWindow(ayahNum, activeReciter, "gapless-ayah");
            }, AUDIO_OVERLAP_HOLD_MS);
          } else {
            if (outgoingPlayer) {
              outgoingPlayer.pause();
            }
            syncPreloadWindow(ayahNum, activeReciter, "gapless-ayah");
          }

          const el = document.getElementById(`ayah-${ayahNum}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          return;
        } catch {
          // Fall through to standard direct play
        }
      }

      // Case B: Fresh start or manual jump to a verse
      if (standby) {
        standby.pause();
      }
      const player = getActiveAudio();
      if (!player) return;

      if (player.src !== targetUrl) {
        player.src = targetUrl;
      }
      player.playbackRate = playbackRate;
      player.volume = effVol;

      try {
        player.currentTime = 0;
        await player.play();
        setIsPlaying(true);

        // Immediately preload the next 2 verses (ayahNum + 1 and ayahNum + 2) in memory (readyState = 4)
        syncPreloadWindow(ayahNum, activeReciter, "gapless-ayah");

        const el = document.getElementById(`ayah-${ayahNum}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } catch {
        const fallbackUrl = getSurahFallbackAudioUrl(
          surah.id,
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
          "تعذر تشغيل التلاوة الصوتية حاليًا (تأكد من الاتصال بالإنترنت للوصول إلى خادم الصوتيات). النص القرآني متاح بالكامل دون إنترنت."
        );
      }
    },
    [
      audioMode,
      currentReciter,
      getActiveAudio,
      getStandbyAudio,
      isMuted,
      playbackRate,
      surah.id,
      syncPreloadWindow,
      volume,
    ]
  );

  /**
   * 2. Smart Cross-Trigger with True Overlap (~380ms–520ms before the end of the MP3):
   * High-frequency monitor (every 25ms) that checks if the current verse has entered
   * its trailing silence tail so it immediately starts the pre-seeked standby audio slot
   * with a 180ms true audio overlap — eliminating 100% of any gap between verses.
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

      const curAyah = playingAyahRef.current;
      if (
        curAyah < surah.totalVerses &&
        crossTriggeredAyahRef.current !== curAyah &&
        shouldSmartCrossTrigger(
          player.currentTime,
          player.duration,
          activeLeadSeconds
        )
      ) {
        const standby = getStandbyAudio();
        if (standby && standby.readyState >= 2) {
          crossTriggeredAyahRef.current = curAyah;
          playSpecificAyah(curAyah + 1, { usePreloadedStandby: true });
        }
      }
    }, 25);

    return () => window.clearInterval(timer);
  }, [
    isPlaying,
    audioMode,
    usingSurahFallback,
    smartCrossTriggerEnabled,
    activeLeadSeconds,
    surah.totalVerses,
    getActiveAudio,
    getStandbyAudio,
    playSpecificAyah,
  ]);

  const togglePlayPause = async () => {
    const player = getActiveAudio();
    if (!player) return;
    if (isPlaying) {
      stopAllAudio();
      setIsPlaying(false);
    } else {
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
      await playSpecificAyah(playingAyah || selectedAyah || 1);
    }
  };

  const handleSlotEnded = (slot: "A" | "B") => {
    if (activeSlotRef.current !== slot) return;

    const curAyah = playingAyahRef.current;
    if (crossTriggeredAyahRef.current === curAyah) return;

    if (usingSurahFallback || audioMode === "continuous-surah") {
      setIsPlaying(false);
      return;
    }

    if (curAyah < surah.totalVerses) {
      playSpecificAyah(curAyah + 1, { usePreloadedStandby: true });
    } else {
      setIsPlaying(false);
    }
  };

  const handleSlotError = async (slot: "A" | "B") => {
    if (activeSlotRef.current !== slot) return;
    const player = getActiveAudio();
    if (!usingSurahFallback && player) {
      const fallbackUrl = getSurahFallbackAudioUrl(
        surah.id,
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
      playSpecificAyah(playingAyah, { modeOverride: newMode });
    } else {
      setUsingSurahFallback(newMode === "continuous-surah");
      syncPreloadWindow(playingAyah, currentReciter, newMode);
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
    setSavedToast(
      `تم حفظ موضع القراءة: سورة ${surah.name} - الآية ${toArabicDigits(ayahNum)}`
    );
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

        {/* 11 Sheikhs Quick Selector Pills */}
        <div className="mb-4 rounded-2xl border border-gold/30 bg-muted/30 p-3.5 sm:p-4">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-foreground sm:text-sm">
              <Mic className="h-4 w-4 text-primary" />
              <span>اختر صوت القارئ لتلاوة سورة {surah.name} (١١ قارئًا معتمدًا):</span>
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
                      playSpecificAyah(playingAyah, { reciterOverride: rec });
                    } else {
                      syncPreloadWindow(playingAyah, rec);
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
                  ? "يقوم المشغّل بتحميل الآيتين القادمتين في الذاكرة وتخطي صمت بداية ونهاية كل آية مع تداخل صوتي مباشر (180ms Overlap) لإلغاء أي فاصل تمامًا."
                  : `يتم تشغيل التسجيل الكامل المتصل لسورة ${surah.name} من خادم mp3quran.net كملف واحد متصل تمامًا.`}
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
                <>
                  <button
                    type="button"
                    onClick={() =>
                      updatePrefs({
                        gaplessTightness:
                          gaplessTightness === "deep-overlap"
                            ? "standard-overlap"
                            : "deep-overlap",
                      })
                    }
                    title="التبديل بين الدمج العميق (٠٪ فاصل) والدمج القياسي"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-bold transition",
                      gaplessTightness === "deep-overlap"
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-card text-foreground"
                    )}
                  >
                    <Zap className="h-3 w-3" />
                    <span>
                      {gaplessTightness === "deep-overlap"
                        ? "دمج عميق (٠٪ فاصل - 520ms)"
                        : "دمج قياسي (380ms)"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updatePrefs({
                        smartCrossTriggerEnabled: !smartCrossTriggerEnabled,
                      })
                    }
                    title="تفعيل أو إيقاف تخطي صمت بداية ونهاية الآيات"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-bold transition",
                      smartCrossTriggerEnabled
                        ? "border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300"
                        : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    <span>
                      تخطي الصمت:{" "}
                      {smartCrossTriggerEnabled ? "مفعّل" : "متوقف"}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Continuous Stream Timeline Scrubber (when in Continuous Stream mode) */}
          {(audioMode === "continuous-surah" || usingSurahFallback) && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5">
              <span className="text-xs font-extrabold text-primary">
                البث المتصل: سورة {surah.name}
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
                const newRecId = e.target.value;
                updatePrefs({ reciterId: newRecId });
                const found = QURAN_RECITERS.find((r) => r.id === newRecId);
                if (isPlaying && found) {
                  playSpecificAyah(playingAyah, { reciterOverride: found });
                } else if (found) {
                  syncPreloadWindow(playingAyah, found);
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
                    playSpecificAyah(Math.min(surah.totalVerses, playingAyah + 1), {
                      usePreloadedStandby: true,
                    })
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
                  stopAllAudio();
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
