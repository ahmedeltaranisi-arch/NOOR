"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  Check,
  ChevronLeft,
  Home,
  Loader2,
  MapPin,
  Navigation,
  Search,
  X,
} from "lucide-react";
import {
  EGYPT_GOVERNORATES,
  TOTAL_EGYPT_MARKAZES_COUNT,
  TOTAL_EGYPT_VILLAGES_COUNT,
} from "@/data/egypt-governorates";
import { requestBrowserLocation } from "@/lib/location";
import { cn, normalizeArabicText, toArabicDigits } from "@/lib/utils";
import { CityLocation, Governorate, UserLocation, VillageLocation } from "@/types";

interface LocationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: UserLocation;
  onSelectLocation: (loc: UserLocation) => void;
}

interface SearchMatchItem {
  governorate: Governorate;
  city: CityLocation;
  village?: VillageLocation;
  kind: "city" | "village";
}

export function LocationSelectorModal({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation,
}: LocationSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGovId, setSelectedGovId] = useState<string>(
    currentLocation.governorateId || "cairo"
  );
  const [selectedCityId, setSelectedCityId] = useState<string>(
    currentLocation.cityId || "cairo-center"
  );
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const activeGovernorate = useMemo(() => {
    return (
      EGYPT_GOVERNORATES.find((g) => g.id === selectedGovId) ||
      EGYPT_GOVERNORATES[0]
    );
  }, [selectedGovId]);

  const activeCity = useMemo(() => {
    return (
      activeGovernorate.cities.find((c) => c.id === selectedCityId) ||
      activeGovernorate.cities[0]
    );
  }, [activeGovernorate, selectedCityId]);

  const activeVillages = useMemo(() => {
    return activeCity?.villages || [];
  }, [activeCity]);

  // Global search across all 27 Governorates, 456 Markazes/Cities, and 5,893 Villages
  const searchResults = useMemo<SearchMatchItem[]>(() => {
    const q = normalizeArabicText(searchQuery);
    if (!q || q.length < 2) return [];

    const qLower = searchQuery.trim().toLowerCase();
    const matches: SearchMatchItem[] = [];

    for (const gov of EGYPT_GOVERNORATES) {
      const govNorm = normalizeArabicText(gov.nameAr);
      for (const city of gov.cities) {
        const cityNorm = normalizeArabicText(city.nameAr);
        if (
          cityNorm.includes(q) ||
          govNorm.includes(q) ||
          city.nameEn.toLowerCase().includes(qLower)
        ) {
          matches.push({
            governorate: gov,
            city,
            kind: "city",
          });
        }

        if (city.villages) {
          for (const village of city.villages) {
            const vNorm = normalizeArabicText(village.nameAr);
            if (
              vNorm.includes(q) ||
              village.nameEn.toLowerCase().includes(qLower)
            ) {
              matches.push({
                governorate: gov,
                city,
                village,
                kind: "village",
              });
            }
            if (matches.length >= 80) break;
          }
        }
        if (matches.length >= 80) break;
      }
      if (matches.length >= 80) break;
    }

    return matches;
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleGpsDetect = async () => {
    setGpsLoading(true);
    setGpsError(null);
    const result = await requestBrowserLocation();
    setGpsLoading(false);

    if (result.success && result.location) {
      onSelectLocation(result.location);
      onClose();
    } else {
      setGpsError(result.errorAr || "تعذر تحديد الموقع الجغرافي.");
    }
  };

  const handleConfirmCityOnly = (gov: Governorate, city: CityLocation) => {
    onSelectLocation({
      governorateId: gov.id,
      cityId: city.id,
      villageId: undefined,
      governorateNameAr: gov.nameAr,
      cityNameAr: city.nameAr,
      villageNameAr: undefined,
      latitude: city.latitude,
      longitude: city.longitude,
      isCustomGps: false,
    });
    onClose();
  };

  const handleConfirmVillage = (
    gov: Governorate,
    city: CityLocation,
    village: VillageLocation
  ) => {
    const sameName =
      normalizeArabicText(village.nameAr) === normalizeArabicText(city.nameAr);
    const displayCity = sameName
      ? city.nameAr
      : `${city.nameAr} — ${village.nameAr}`;

    onSelectLocation({
      governorateId: gov.id,
      cityId: city.id,
      villageId: village.id,
      governorateNameAr: gov.nameAr,
      cityNameAr: displayCity,
      villageNameAr: village.nameAr,
      latitude: village.latitude,
      longitude: village.longitude,
      isCustomGps: false,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2.5 backdrop-blur-sm sm:p-4"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-10 sm:w-10">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="location-modal-title"
                className="truncate text-sm font-extrabold text-foreground sm:text-base"
              >
                اختيار المحافظة والمركز والقرية (٢٧ محافظة •{" "}
                {toArabicDigits(TOTAL_EGYPT_MARKAZES_COUNT)} مركزًا •{" "}
                {toArabicDigits(TOTAL_EGYPT_VILLAGES_COUNT)} قرية)
              </h2>
              <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                اختر المحافظة ثم المركز/المدينة ثم القرية التابعة لحساب مواقيت الصلاة
                والقبلة بدقة فلكية
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة اختيار الموقع"
            className="shrink-0 rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & GPS Bar */}
        <div className="space-y-2.5 border-b border-border bg-muted/30 px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم أي قرية أو مركز أو محافظة (مثال: الشعراء، البصارطة، فارسكور، شربين، دكرنس...)"
                className="w-full rounded-xl border border-border bg-card py-2 pl-8 pr-10 text-xs font-bold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="مسح البحث"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleGpsDetect}
              disabled={gpsLoading}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60 sm:text-sm"
            >
              {gpsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              <span>تحديد موقعي الحالي</span>
            </button>
          </div>

          {gpsError && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{gpsError}</span>
            </div>
          )}
        </div>

        {/* If Search Query is Active: Show Instant Global Search Results */}
        {searchQuery.trim().length >= 2 ? (
          <div className="max-h-[62vh] flex-1 overflow-y-auto p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-extrabold text-muted-foreground">
                نتائج البحث في المحافظات والمراكز والقرى (
                {toArabicDigits(searchResults.length)})
              </span>
            </div>

            {searchResults.length === 0 ? (
              <p className="py-12 text-center text-sm font-bold text-muted-foreground">
                لا توجد قرية أو مركز أو محافظة مطابقة لعبارة البحث
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {searchResults.map((item, idx) => {
                  const key = `${item.governorate.id}-${item.city.id}-${
                    item.village?.id || "city"
                  }-${idx}`;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        item.village
                          ? handleConfirmVillage(
                              item.governorate,
                              item.city,
                              item.village
                            )
                          : handleConfirmCityOnly(item.governorate, item.city)
                      }
                      className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-background/70 p-3 text-right transition hover:border-primary/50 hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                            {item.governorate.nameAr}
                          </span>
                          <span className="text-[11px] font-bold text-muted-foreground">
                            {item.city.nameAr}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs font-extrabold text-foreground sm:text-sm">
                          {item.village ? item.village.nameAr : item.city.nameAr}
                        </p>
                      </div>
                      <ChevronLeft className="h-4 w-4 shrink-0 text-primary" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* 3-Column Hierarchy: 1. Governorate -> 2. Markaz/City -> 3. Village */
          <div className="grid min-h-[380px] flex-1 grid-cols-1 overflow-hidden md:grid-cols-12">
            {/* Column 1: 27 Governorates */}
            <div className="max-h-44 overflow-y-auto border-b border-border p-2.5 md:col-span-3 md:max-h-[460px] md:border-b-0 md:border-l">
              <div className="mb-2 flex items-center justify-between px-2 text-[11px] font-extrabold text-muted-foreground">
                <span>١. المحافظة ({toArabicDigits(EGYPT_GOVERNORATES.length)})</span>
              </div>
              <div className="space-y-1">
                {EGYPT_GOVERNORATES.map((gov) => {
                  const isSelected = activeGovernorate.id === gov.id;
                  return (
                    <button
                      key={gov.id}
                      type="button"
                      onClick={() => {
                        setSelectedGovId(gov.id);
                        if (gov.cities[0]) {
                          setSelectedCityId(gov.cities[0].id);
                        }
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-right text-xs font-bold transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <span className="truncate">{gov.nameAr}</span>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px]",
                          isSelected
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {toArabicDigits(gov.cities.length)} مركز
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column 2: Markazes / Cities of Selected Governorate */}
            <div className="max-h-52 overflow-y-auto border-b border-border p-2.5 md:col-span-4 md:max-h-[460px] md:border-b-0 md:border-l">
              <div className="mb-2 flex items-center justify-between px-2 text-[11px] font-extrabold text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span>
                    ٢. مراكز ومدن {activeGovernorate.nameAr} (
                    {toArabicDigits(activeGovernorate.cities.length)})
                  </span>
                </span>
              </div>
              <div className="space-y-1">
                {activeGovernorate.cities.map((city) => {
                  const isSelected = activeCity?.id === city.id;
                  const vCount = city.villages?.length || 0;
                  return (
                    <div
                      key={city.id}
                      className={cn(
                        "flex items-center justify-between gap-1 rounded-xl border p-2 transition",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-transparent hover:bg-muted/60"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedCityId(city.id)}
                        className="min-w-0 flex-1 text-right"
                      >
                        <p
                          className={cn(
                            "truncate text-xs font-extrabold",
                            isSelected ? "text-primary" : "text-foreground"
                          )}
                        >
                          {city.nameAr}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {toArabicDigits(vCount)} قرية / منطقة تابعة
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleConfirmCityOnly(activeGovernorate, city)
                        }
                        className="shrink-0 rounded-lg bg-primary px-2 py-1 text-[10px] font-extrabold text-primary-foreground hover:bg-primary/90"
                      >
                        اختيار المركز
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 3: Villages belonging to Selected Markaz */}
            <div className="max-h-64 overflow-y-auto p-3 md:col-span-5 md:max-h-[460px]">
              {activeCity && (
                <>
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                    <div>
                      <h3 className="flex items-center gap-1.5 text-xs font-extrabold text-foreground sm:text-sm">
                        <Home className="h-3.5 w-3.5 text-primary" />
                        <span>قرى ومناطق {activeCity.nameAr}</span>
                      </h3>
                      <p className="text-[10px] text-muted-foreground">
                        اختر القرية أو الشياخة التابعة للمركز ({toArabicDigits(activeVillages.length)}{" "}
                        قرية)
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleConfirmCityOnly(activeGovernorate, activeCity)
                      }
                      className="rounded-xl border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-extrabold text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      اختيار {activeCity.nameAr} عامة
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {activeVillages.map((village) => {
                      const isCurrentVillage =
                        currentLocation.governorateId === activeGovernorate.id &&
                        currentLocation.cityId === activeCity.id &&
                        currentLocation.villageId === village.id;

                      return (
                        <button
                          key={village.id}
                          type="button"
                          onClick={() =>
                            handleConfirmVillage(
                              activeGovernorate,
                              activeCity,
                              village
                            )
                          }
                          className={cn(
                            "flex items-center justify-between gap-1.5 rounded-xl border px-3 py-2 text-right transition",
                            isCurrentVillage
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-border bg-background/70 text-foreground hover:border-primary/40 hover:bg-muted/50"
                          )}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold">
                              {village.nameAr}
                            </p>
                            <p
                              className={cn(
                                "text-[10px]",
                                isCurrentVillage
                                  ? "text-primary-foreground/80"
                                  : "text-muted-foreground"
                              )}
                              dir="ltr"
                            >
                              {village.latitude.toFixed(3)}°N,{" "}
                              {village.longitude.toFixed(3)}°E
                            </p>
                          </div>
                          {isCurrentVillage && (
                            <Check className="h-3.5 w-3.5 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
