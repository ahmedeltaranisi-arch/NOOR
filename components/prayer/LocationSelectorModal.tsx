"use client";

import React, { useMemo, useState } from "react";
import { MapPin, Navigation, Search, Check, X, Loader2, AlertCircle } from "lucide-react";
import { EGYPT_GOVERNORATES } from "@/data/egypt-governorates";
import { UserLocation } from "@/types";
import { requestBrowserLocation } from "@/lib/location";
import { normalizeArabicText, cn } from "@/lib/utils";

interface LocationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: UserLocation;
  onSelectLocation: (loc: UserLocation) => void;
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
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const filteredGovernorates = useMemo(() => {
    const q = normalizeArabicText(searchQuery);
    if (!q) return EGYPT_GOVERNORATES;

    return EGYPT_GOVERNORATES.filter((gov) => {
      const govMatch =
        normalizeArabicText(gov.nameAr).includes(q) ||
        gov.nameEn.toLowerCase().includes(searchQuery.toLowerCase());
      const cityMatch = gov.cities.some(
        (c) =>
          normalizeArabicText(c.nameAr).includes(q) ||
          c.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return govMatch || cityMatch;
    });
  }, [searchQuery]);

  const activeGovernorate = useMemo(() => {
    return (
      filteredGovernorates.find((g) => g.id === selectedGovId) ||
      filteredGovernorates[0] ||
      EGYPT_GOVERNORATES[0]
    );
  }, [filteredGovernorates, selectedGovId]);

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

  const handleSelectCity = (govId: string, cityId: string) => {
    const gov = EGYPT_GOVERNORATES.find((g) => g.id === govId);
    if (!gov) return;
    const city = gov.cities.find((c) => c.id === cityId) || gov.cities[0];

    onSelectLocation({
      governorateId: gov.id,
      cityId: city.id,
      governorateNameAr: gov.nameAr,
      cityNameAr: city.nameAr,
      latitude: city.latitude,
      longitude: city.longitude,
      isCustomGps: false,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h2 id="location-modal-title" className="text-lg font-bold text-foreground">
                اختيار المحافظة والمدينة (جميع محافظات مصر الـ 27)
              </h2>
              <p className="text-xs text-muted-foreground">
                تُحسب مواقيت الصلاة واتجاه القبلة بدقة فلكية وفق إحداثيات المدينة المختارة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة اختيار الموقع"
            className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & GPS Bar */}
        <div className="space-y-3 border-b border-border bg-muted/30 px-6 py-4">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن محافظة أو مدينة (مثال: القاهرة، دمياط، المنصورة، أسوان...)"
                className="w-full rounded-xl border border-border bg-card py-2.5 pl-4 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="button"
              onClick={handleGpsDetect}
              disabled={gpsLoading}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
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
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{gpsError}</span>
            </div>
          )}
        </div>

        {/* Governorates & Cities Split Grid */}
        <div className="grid min-h-[340px] flex-1 grid-cols-1 overflow-hidden sm:grid-cols-12">
          {/* Governorates List */}
          <div className="max-h-60 overflow-y-auto border-b border-border p-3 sm:col-span-5 sm:max-h-[420px] sm:border-b-0 sm:border-l">
            <div className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
              المحافظات ({filteredGovernorates.length})
            </div>
            <div className="space-y-1">
              {filteredGovernorates.map((gov) => {
                const isSelected = activeGovernorate?.id === gov.id;
                return (
                  <button
                    key={gov.id}
                    type="button"
                    onClick={() => setSelectedGovId(gov.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-right text-sm transition-colors",
                      isSelected
                        ? "bg-primary font-bold text-primary-foreground shadow-sm"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <span>{gov.nameAr}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px]",
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {gov.cities.length} مدن
                    </span>
                  </button>
                );
              })}

              {filteredGovernorates.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  لا توجد محافظة أو مدينة مطابقة للبحث
                </p>
              )}
            </div>
          </div>

          {/* Cities List */}
          <div className="max-h-72 overflow-y-auto p-4 sm:col-span-7 sm:max-h-[420px]">
            {activeGovernorate && (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-foreground">
                      مدن ومراكز محافظة {activeGovernorate.nameAr}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      الإقليم: {activeGovernorate.region}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {activeGovernorate.cities.map((city) => {
                    const isCurrent =
                      currentLocation.governorateId === activeGovernorate.id &&
                      currentLocation.cityId === city.id &&
                      !currentLocation.isCustomGps;

                    return (
                      <button
                        key={city.id}
                        type="button"
                        onClick={() => handleSelectCity(activeGovernorate.id, city.id)}
                        className={cn(
                          "flex items-center justify-between rounded-xl border p-3 text-right transition-all",
                          isCurrent
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background/60 text-foreground hover:border-primary/40 hover:bg-muted/60"
                        )}
                      >
                        <div>
                          <div className="font-semibold">{city.nameAr}</div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground" dir="ltr">
                            {city.latitude.toFixed(4)}° N, {city.longitude.toFixed(4)}° E
                          </div>
                        </div>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                            <Check className="h-3.5 w-3.5" />
                            <span>الحالية</span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
