"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Calendar,
  Compass,
  Clock,
  Heart,
  Home,
  MapPin,
  Settings,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LocationSelectorModal } from "@/components/prayer/LocationSelectorModal";
import {
  getSavedLocation,
  saveLocation,
  STORAGE_CHANGE_EVENT,
} from "@/lib/storage/local-storage";
import { DEFAULT_USER_LOCATION } from "@/data/egypt-governorates";
import { UserLocation } from "@/types";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "الرئيسية", icon: Home },
  { href: "/prayer-times", label: "مواقيت الصلاة", icon: Clock },
  { href: "/qibla", label: "القبلة", icon: Compass },
  { href: "/quran", label: "القرآن الكريم", icon: BookOpen },
  { href: "/adhkar", label: "الأذكار", icon: Heart },
  { href: "/tasbeeh", label: "المسبحة", icon: Sparkles },
  { href: "/calendar", label: "التقويم", icon: Calendar },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

export function Header() {
  const pathname = usePathname();
  const [location, setLocation] = useState<UserLocation>(DEFAULT_USER_LOCATION);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  useEffect(() => {
    setLocation(getSavedLocation());

    const handleStorageChange = () => {
      setLocation(getSavedLocation());
    };

    window.addEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
  }, []);

  const handleSelectLocation = (newLoc: UserLocation) => {
    saveLocation(newLoc);
    setLocation(newLoc);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:h-[70px] sm:px-6 lg:px-8">
          {/* Official Brand Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 rounded-xl py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <img
              src="/logo-mark.png"
              alt="شعار منصة نور الإسلامية"
              width={44}
              height={44}
              className="h-10 w-10 shrink-0 object-contain drop-shadow-sm sm:h-11 sm:w-11"
            />
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-lg font-extrabold leading-none tracking-tight text-foreground sm:text-xl">
                  نور
                </span>
                <span className="rounded-md bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-gold">
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

          {/* Left Actions: Location Selector & Theme Toggle */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              aria-label="تغيير المحافظة أو المدينة"
              className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-card/90 px-2.5 text-xs font-bold text-foreground shadow-sm transition hover:border-primary/50 hover:bg-secondary sm:px-3.5"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4" />
              <span className="max-w-[135px] truncate sm:max-w-[175px]">
                {location.governorateNameAr} - {location.cityNameAr}
              </span>
            </button>

            <ThemeToggle />
          </div>
        </div>
      </header>

      <LocationSelectorModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={location}
        onSelectLocation={handleSelectLocation}
      />
    </>
  );
}
