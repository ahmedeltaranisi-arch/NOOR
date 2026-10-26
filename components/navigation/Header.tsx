"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Calendar,
  Check,
  Compass,
  Clock,
  Heart,
  Home,
  MapPin,
  Play,
  ScrollText,
  Settings,
  Sparkles,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LocationSelectorModal } from "@/components/prayer/LocationSelectorModal";
import {
  ADHAN_AUDIO_STATE_EVENT,
  ADHAN_VOICES_META,
  getActiveAudioState,
  getAdhanVoiceMeta,
  getSavedLocation,
  getSavedPrayerNotifications,
  playApproachingPrayerAlert,
  playFullAdhanAudio,
  saveLocation,
  savePrayerNotifications,
  stopFullAdhanAudio,
  STORAGE_CHANGE_EVENT,
} from "@/lib/storage/local-storage";
import { DEFAULT_USER_LOCATION } from "@/data/egypt-governorates";
import { AdhanSoundId, UserLocation } from "@/types";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "الرئيسية", icon: Home },
  { href: "/prayer-times", label: "المواقيت", icon: Clock },
  { href: "/qibla", label: "القبلة", icon: Compass },
  { href: "/quran", label: "القرآن", icon: BookOpen },
  { href: "/hadith", label: "الأحاديث", icon: ScrollText },
  { href: "/adhkar", label: "الأذكار", icon: Heart },
  { href: "/tasbeeh", label: "المسبحة", icon: Sparkles },
  { href: "/calendar", label: "التقويم", icon: Calendar },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

export function Header() {
  const pathname = usePathname();
  const [location, setLocation] = useState<UserLocation>(DEFAULT_USER_LOCATION);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Adhan Quick Modal & Audio State
  const [isAdhanMenuOpen, setIsAdhanMenuOpen] = useState(false);
  const [selectedAdhanId, setSelectedAdhanId] = useState<AdhanSoundId>("abdulbasit");
  const [sheikhTab, setSheikhTab] = useState<"egypt" | "arab">("egypt");
  const [audioState, setAudioState] = useState<{
    playing: boolean;
    labelAr: string | null;
    adhanId: AdhanSoundId | null;
  }>({ playing: false, labelAr: null, adhanId: null });

  useEffect(() => {
    setLocation(getSavedLocation());
    const notif = getSavedPrayerNotifications();
    setSelectedAdhanId(notif.selectedAdhanSound || "abdulbasit");
    setAudioState(getActiveAudioState());

    const handleStorageChange = () => {
      setLocation(getSavedLocation());
      const updatedNotif = getSavedPrayerNotifications();
      setSelectedAdhanId(updatedNotif.selectedAdhanSound || "abdulbasit");
    };

    const handleAudioStateChange = (e: Event) => {
      const custom = e as CustomEvent<{
        playing: boolean;
        labelAr: string | null;
        adhanId: AdhanSoundId | null;
      }>;
      if (custom.detail) {
        setAudioState(custom.detail);
      } else {
        setAudioState(getActiveAudioState());
      }
    };

    window.addEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
    window.addEventListener(ADHAN_AUDIO_STATE_EVENT, handleAudioStateChange);
    return () => {
      window.removeEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
      window.removeEventListener(ADHAN_AUDIO_STATE_EVENT, handleAudioStateChange);
    };
  }, []);

  const handleSelectLocation = (newLoc: UserLocation) => {
    saveLocation(newLoc);
    setLocation(newLoc);
  };

  const handleChooseAndPlaySheikh = async (adhanId: AdhanSoundId) => {
    const notif = getSavedPrayerNotifications();
    const updatedPrayers = { ...notif.prayers };
    (["fajr", "dhuhr", "asr", "maghrib", "isha"] as const).forEach((pId) => {
      updatedPrayers[pId] = {
        ...updatedPrayers[pId],
        adhanSound: adhanId,
      };
    });
    savePrayerNotifications({
      ...notif,
      selectedAdhanSound: adhanId,
      prayers: updatedPrayers,
    });
    setSelectedAdhanId(adhanId);

    if (audioState.playing && audioState.adhanId === adhanId) {
      stopFullAdhanAudio();
    } else {
      await playFullAdhanAudio(adhanId, "الظهر");
    }
  };

  const currentSheikhMeta = getAdhanVoiceMeta(selectedAdhanId);
  const filteredSheikhs = ADHAN_VOICES_META.filter(
    (v) => v.category === sheikhTab && v.id !== "takbeer-only"
  );

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-1.5 px-3 sm:h-[70px] sm:gap-2 sm:px-6 lg:px-8">
          {/* Official Brand Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-1.5 rounded-xl py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-2.5"
          >
            <img
              src="/logo-mark.png"
              alt="شعار منصة نور الإسلامية"
              width={44}
              height={44}
              className="h-8 w-8 shrink-0 object-contain drop-shadow-sm sm:h-11 sm:w-11"
            />
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1 whitespace-nowrap sm:gap-1.5">
                <span className="text-base font-extrabold leading-none tracking-tight text-foreground sm:text-xl">
                  نور
                </span>
                <span className="hidden rounded-md bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-gold min-[360px]:inline-block">
                  NOOR
                </span>
              </div>
              <span className="mt-1 hidden whitespace-nowrap text-[10px] font-medium text-muted-foreground 2xl:block">
                مواقيت الصلاة • القبلة • القرآن • الأذكار
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Bar — Single Line Harmonious Pill */}
          <nav
            aria-label="التنقل الرئيسي"
            className="hidden items-center gap-0.5 rounded-2xl border border-border/80 bg-card/75 p-1 shadow-sm lg:flex"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 text-xs font-bold transition-all xl:px-3 xl:text-[13px]",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      isActive ? "text-gold" : "text-primary/80"
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Left Actions: Adhan Quick Button + Location Selector + Theme Toggle */}
          <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
            {/* Navbar Adhan Button */}
            <button
              type="button"
              onClick={() => setIsAdhanMenuOpen((prev) => !prev)}
              aria-expanded={isAdhanMenuOpen}
              aria-label="مشغل الأذان وأصوات الشيوخ"
              className={cn(
                "inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-xl border px-2 text-[11px] font-extrabold shadow-sm transition active:scale-95 sm:h-10 sm:gap-1.5 sm:px-3.5 sm:text-xs",
                audioState.playing
                  ? "border-red-500 bg-red-600 text-white hover:bg-red-700"
                  : isAdhanMenuOpen
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-gold/50 bg-gold/15 text-foreground hover:border-primary/60 hover:bg-primary/10"
              )}
            >
              {audioState.playing ? (
                <>
                  <Square className="h-3 w-3 shrink-0 fill-current sm:h-3.5 sm:w-3.5" />
                  <span>الأذان يعمل</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4" />
                  <span>الأذان</span>
                </>
              )}
            </button>

            {/* Location Selector Pill */}
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              aria-label="تغيير المحافظة أو المدينة"
              className="inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-xl border border-border bg-card/90 px-2 text-[11px] font-bold text-foreground shadow-sm transition hover:border-primary/50 hover:bg-secondary active:scale-95 sm:h-10 sm:gap-1.5 sm:px-3.5 sm:text-xs"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4" />
              <span className="max-w-[85px] truncate min-[380px]:max-w-[115px] sm:max-w-[155px]">
                {location.governorateNameAr} - {location.cityNameAr}
              </span>
            </button>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Centered Responsive Adhan & Sheikhs Modal (rendered outside Header to prevent any edge clipping) */}
      {isAdhanMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="قائمة تشغيل الأذان وأصوات الشيوخ"
          onClick={() => setIsAdhanMenuOpen(false)}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-3 pt-16 backdrop-blur-sm sm:items-center sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[84vh] w-full max-w-md overflow-y-auto rounded-3xl border border-border bg-card p-4 shadow-2xl sm:p-5"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Volume2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-extrabold text-foreground sm:text-base">
                    الأذان وأصوات الشيوخ المعتمدة
                  </h3>
                  <p className="truncate text-[11px] text-muted-foreground">
                    المؤذن المختار: {currentSheikhMeta.nameAr}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdhanMenuOpen(false)}
                aria-label="إغلاق نافذة الأذان"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Primary Play / Stop Button */}
            <div className="mt-3.5">
              <button
                type="button"
                onClick={async () => {
                  if (audioState.playing) {
                    stopFullAdhanAudio();
                  } else {
                    await playFullAdhanAudio(selectedAdhanId, "الظهر");
                  }
                }}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-extrabold shadow-sm transition sm:text-sm",
                  audioState.playing
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {audioState.playing ? (
                  <>
                    <Square className="h-3.5 w-3.5 shrink-0 fill-current" />
                    <span className="truncate">
                      إيقاف الصوت ({audioState.labelAr || "الأذان"})
                    </span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 shrink-0 fill-current" />
                    <span className="truncate">
                      تشغيل الأذان الآن ({currentSheikhMeta.nameAr})
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Category Tabs: Egyptian Sheikhs vs Haramain & Arab World */}
            <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-muted/50 p-1">
              <button
                type="button"
                onClick={() => setSheikhTab("egypt")}
                className={cn(
                  "rounded-lg py-1.5 text-xs font-extrabold transition",
                  sheikhTab === "egypt"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                شيوخ مصر (١١ شيخًا)
              </button>
              <button
                type="button"
                onClick={() => setSheikhTab("arab")}
                className={cn(
                  "rounded-lg py-1.5 text-xs font-extrabold transition",
                  sheikhTab === "arab"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                الحرمان والعرب (٥)
              </button>
            </div>

            {/* Scrollable Sheikhs List */}
            <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto pl-1">
              {filteredSheikhs.map((voice) => {
                const isSelected = selectedAdhanId === voice.id;
                const isPlayingThis =
                  audioState.playing && audioState.adhanId === voice.id;

                return (
                  <div
                    key={voice.id}
                    className={cn(
                      "flex items-center justify-between gap-2.5 rounded-xl border p-2.5 transition",
                      isSelected
                        ? "border-primary/60 bg-primary/10"
                        : "border-border/70 bg-background/70 hover:border-primary/40"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleChooseAndPlaySheikh(voice.id)}
                      className="flex min-w-0 flex-1 flex-col text-right"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-extrabold text-foreground">
                          {voice.nameAr}
                        </span>
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                        )}
                      </div>
                      <span className="truncate text-[10px] text-muted-foreground">
                        {voice.titleAr} • {voice.countryAr}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChooseAndPlaySheikh(voice.id)}
                      className={cn(
                        "inline-flex h-8 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-3 text-[11px] font-bold transition",
                        isPlayingThis
                          ? "bg-red-600 text-white"
                          : "bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground"
                      )}
                    >
                      {isPlayingThis ? (
                        <>
                          <Square className="h-3 w-3 shrink-0 fill-current" />
                          <span>إيقاف</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 shrink-0 fill-current" />
                          <span>استماع</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Quick Approaching Prayer Voice Alert Preview — Clean 3/5-Column Grid */}
            <div className="mt-3.5 border-t border-border/70 pt-3">
              <div className="mb-2 text-[11px] font-bold text-muted-foreground">
                تجربة صوت اقتراب الصلاة («اقتربت صلاة ...» فقط بدون تكبير):
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                {(["الفجر", "الظهر", "العصر", "المغرب", "العشاء"] as const).map(
                  (pName) => (
                    <button
                      key={pName}
                      type="button"
                      onClick={() =>
                        playApproachingPrayerAlert(
                          pName,
                          10,
                          "approaching-only"
                        )
                      }
                      className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-xl border border-border bg-background px-2 py-1.5 text-[11px] font-bold text-foreground transition hover:border-primary hover:bg-primary/10 hover:text-primary"
                    >
                      <Volume2 className="h-3 w-3 shrink-0 text-primary" />
                      <span>{pName}</span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <LocationSelectorModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={location}
        onSelectLocation={handleSelectLocation}
      />
    </>
  );
}
