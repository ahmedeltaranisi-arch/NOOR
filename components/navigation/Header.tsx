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
  { href: "/qibla", label: "القبلة والمساجد", icon: Compass },
  { href: "/quran", label: "القرآن الكريم", icon: BookOpen },
  { href: "/adhkar", label: "الأذكار", icon: Heart },
  { href: "/tasbeeh", label: "المسبحة", icon: Sparkles },
  { href: "/calendar", label: "التقويم والأدوات", icon: Calendar },
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
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-emerald-800 text-primary-foreground shadow-sm">
              <span className="font-quran text-xl font-bold text-gold">ن</span>
              <span className="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-gold" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-extrabold tracking-tight text-foreground">
                  نور
                </span>
                <span className="text-xs font-semibold tracking-widest text-gold">
                  NOOR
                </span>
              </div>
              <p className="hidden text-[11px] text-muted-foreground sm:block">
                المنصة الإسلامية المتكاملة لمصر
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav
            aria-label="التنقل الرئيسي"
            className="hidden items-center gap-1 lg:flex"
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
                    "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Actions: Location Selector & Theme Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              aria-label="تغيير المحافظة أو المدينة"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/90 px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:bg-secondary sm:text-sm"
            >
              <MapPin className="h-4 w-4 text-primary" />
              <span className="max-w-[130px] truncate sm:max-w-[180px]">
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
