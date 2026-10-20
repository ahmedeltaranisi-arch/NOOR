"use client";

import React, { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Coins,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { ALLAH_NAMES, ISLAMIC_OCCASIONS } from "@/data/daily-content";
import { cn, toArabicDigits, getHijriDateInfo } from "@/lib/utils";

type ActiveToolTab = "calendar" | "names" | "zakat";

const WEEKDAYS_AR = [
  { full: "الأحد", short: "أحد" },
  { full: "الإثنين", short: "إثنين" },
  { full: "الثلاثاء", short: "ثلاثاء" },
  { full: "الأربعاء", short: "أربعاء" },
  { full: "الخميس", short: "خميس" },
  { full: "الجمعة", short: "جمعة" },
  { full: "السبت", short: "سبت" },
];

export function CalendarAndToolsClient() {
  const [activeTab, setActiveTab] = useState<ActiveToolTab>("calendar");
  const today = useMemo(() => new Date(), []);
  const [viewMonthDate, setViewMonthDate] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  // 99 Names search
  const [namesSearch, setNamesSearch] = useState("");

  // Zakat Calculator states
  const [cashEgp, setCashEgp] = useState<string>("150000");
  const [goldGrams24, setGoldGrams24] = useState<string>("0");
  const [gold21PriceEgp, setGold21PriceEgp] = useState<string>("3750");
  const [silverGrams, setSilverGrams] = useState<string>("0");
  const [debtsEgp, setDebtsEgp] = useState<string>("0");
  const [zakatFitrPersons, setZakatFitrPersons] = useState<string>("4");
  const [zakatFitrPerPersonEgp, setZakatFitrPerPersonEgp] = useState<string>("35");

  const todayHijri = useMemo(() => getHijriDateInfo(today), [today]);

  // Build calendar days for current month
  const calendarGrid = useMemo(() => {
    const year = viewMonthDate.getFullYear();
    const month = viewMonthDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startWeekday = firstDayOfMonth.getDay(); // 0 = Sunday

    const cells: Array<{
      date: Date | null;
      dayNumber?: number;
      hijri?: ReturnType<typeof getHijriDateInfo>;
      isToday?: boolean;
      occasion?: (typeof ISLAMIC_OCCASIONS)[number];
    }> = [];

    for (let i = 0; i < startWeekday; i++) {
      cells.push({ date: null });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d, 12, 0, 0);
      const hijri = getHijriDateInfo(date);
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      const occasion = ISLAMIC_OCCASIONS.find(
        (occ) => occ.hijriMonth === hijri.monthNumber && occ.hijriDay === hijri.day
      );

      cells.push({
        date,
        dayNumber: d,
        hijri,
        isToday,
        occasion,
      });
    }

    return cells;
  }, [viewMonthDate, today]);

  // Hijri months spanned by current Gregorian month
  const monthHijriSpanLabel = useMemo(() => {
    const populated = calendarGrid.filter((c) => c.hijri);
    if (populated.length === 0) return "";
    const firstH = populated[0].hijri!;
    const lastH = populated[populated.length - 1].hijri!;
    if (firstH.monthNameAr === lastH.monthNameAr) {
      return `${firstH.monthNameAr} ${toArabicDigits(firstH.year)} هـ`;
    }
    return `${firstH.monthNameAr} - ${lastH.monthNameAr} ${toArabicDigits(lastH.year)} هـ`;
  }, [calendarGrid]);

  // Selected day details
  const selectedDayInfo = useMemo(() => {
    const hijri = getHijriDateInfo(selectedDate);
    const occasion = ISLAMIC_OCCASIONS.find(
      (occ) => occ.hijriMonth === hijri.monthNumber && occ.hijriDay === hijri.day
    );
    const gregorianFormatted = new Intl.DateTimeFormat("ar-EG", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(selectedDate);

    return {
      hijri,
      occasion,
      gregorianFormatted,
    };
  }, [selectedDate]);

  const filteredNames = useMemo(() => {
    if (!namesSearch.trim()) return ALLAH_NAMES;
    const q = namesSearch.trim();
    return ALLAH_NAMES.filter(
      (item) => item.name.includes(q) || item.meaningAr.includes(q)
    );
  }, [namesSearch]);

  // Zakat calculation
  const zakatResult = useMemo(() => {
    const cash = Math.max(0, parseFloat(cashEgp) || 0);
    const goldG = Math.max(0, parseFloat(goldGrams24) || 0);
    const price21 = Math.max(1, parseFloat(gold21PriceEgp) || 3750);
    const price24 = (price21 * 24) / 21;
    const silverG = Math.max(0, parseFloat(silverGrams) || 0);
    const debts = Math.max(0, parseFloat(debtsEgp) || 0);

    // Nisab of Gold = 85 grams of 24k gold
    const nisabGoldEgp = 85 * price24;
    const goldValueEgp = goldG * price24;
    const silverValueEgp = silverG * (price24 / 75);
    const netWealthEgp = Math.max(0, cash + goldValueEgp + silverValueEgp - debts);
    const reachedNisab = netWealthEgp >= nisabGoldEgp;
    const zakatMalAmount = reachedNisab ? netWealthEgp * 0.025 : 0;

    const persons = Math.max(1, parseInt(zakatFitrPersons, 10) || 1);
    const perPerson = Math.max(1, parseFloat(zakatFitrPerPersonEgp) || 35);
    const zakatFitrTotal = persons * perPerson;

    return {
      price24: Math.round(price24),
      nisabGoldEgp: Math.round(nisabGoldEgp),
      netWealthEgp: Math.round(netWealthEgp),
      reachedNisab,
      zakatMalAmount: Math.round(zakatMalAmount),
      zakatFitrTotal: Math.round(zakatFitrTotal),
    };
  }, [
    cashEgp,
    goldGrams24,
    gold21PriceEgp,
    silverGrams,
    debtsEgp,
    zakatFitrPersons,
    zakatFitrPerPersonEgp,
  ]);

  const gregorianMonthLabel = new Intl.DateTimeFormat("ar-EG", {
    month: "long",
    year: "numeric",
  }).format(viewMonthDate);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>التقويم الهجري والميلادي • أسماء الله الحسنى • الزكاة</span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold text-foreground sm:text-3xl">
              التقويم الهجري والأدوات الإسلامية
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              اليوم الهجري الموافق:{" "}
              <strong className="text-primary">{todayHijri.formattedAr}</strong>
            </p>
          </div>

          {/* Section Switcher Tabs */}
          <div className="grid w-full grid-cols-3 gap-1 rounded-2xl border border-border bg-muted/60 p-1.5 sm:inline-flex sm:w-auto sm:flex-wrap sm:gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("calendar")}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2 py-2 text-xs font-bold transition sm:px-4",
                activeTab === "calendar"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="sm:hidden">التقويم</span>
              <span className="hidden sm:inline">التقويم والمناسبات</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("names")}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2 py-2 text-xs font-bold transition sm:px-4",
                activeTab === "names"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="sm:hidden">أسماء الله</span>
              <span className="hidden sm:inline">أسماء الله الحسنى</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("zakat")}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2 py-2 text-xs font-bold transition sm:px-4",
                activeTab === "zakat"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Calculator className="h-3.5 w-3.5 shrink-0" />
              <span className="sm:hidden">الزكاة</span>
              <span className="hidden sm:inline">حاسبة الزكاة</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: HIJRI & GREGORIAN CALENDAR + OCCASIONS */}
      {activeTab === "calendar" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Calendar Grid */}
          <div className="rounded-3xl border border-border bg-card p-3.5 shadow-soft sm:p-6 lg:col-span-2">
            {/* Responsive Calendar Header — Never clips or wraps buttons awkwardly */}
            <div className="mb-4 flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-foreground sm:text-xl">
                  {gregorianMonthLabel}
                </h2>
                <p className="mt-0.5 text-xs font-bold text-primary">
                  {monthHijriSpanLabel}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setViewMonthDate(
                        new Date(
                          viewMonthDate.getFullYear(),
                          viewMonthDate.getMonth() - 1,
                          1
                        )
                      )
                    }
                    aria-label="الشهر السابق"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground transition hover:border-primary hover:bg-muted"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setViewMonthDate(
                        new Date(today.getFullYear(), today.getMonth(), 1)
                      );
                      setSelectedDate(today);
                    }}
                    className="inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-primary/30 bg-primary/10 px-3.5 text-xs font-extrabold text-primary transition hover:bg-primary hover:text-primary-foreground"
                  >
                    اليوم الحالي
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setViewMonthDate(
                        new Date(
                          viewMonthDate.getFullYear(),
                          viewMonthDate.getMonth() + 1,
                          1
                        )
                      )
                    }
                    aria-label="الشهر التالي"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground transition hover:border-primary hover:bg-muted"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </div>

                {/* Legend on mobile */}
                <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground sm:hidden">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-foreground/70" />
                    ميلادي
                  </span>
                  <span className="inline-flex items-center gap-1 text-primary">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    هجري
                  </span>
                </div>
              </div>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 text-center sm:gap-2">
              {WEEKDAYS_AR.map((day) => (
                <div
                  key={day.full}
                  className="py-1.5 text-[11px] font-extrabold text-muted-foreground sm:py-2 sm:text-xs"
                >
                  <span className="hidden sm:inline">{day.full}</span>
                  <span className="sm:hidden">{day.short}</span>
                </div>
              ))}
            </div>

            {/* Calendar Cells — Clean & Harmonious on Mobile and Desktop */}
            <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-2">
              {calendarGrid.map((cell, idx) => {
                if (!cell.date || !cell.hijri) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[54px] rounded-xl bg-muted/15 sm:min-h-[82px] sm:rounded-2xl"
                    />
                  );
                }

                const isSelected =
                  cell.date.getDate() === selectedDate.getDate() &&
                  cell.date.getMonth() === selectedDate.getMonth() &&
                  cell.date.getFullYear() === selectedDate.getFullYear();

                const isFirstOfHijriMonth = cell.hijri.day === 1;

                return (
                  <button
                    key={cell.date.toISOString()}
                    type="button"
                    onClick={() => setSelectedDate(cell.date!)}
                    className={cn(
                      "group relative flex min-h-[54px] flex-col justify-between rounded-xl border p-1.5 text-right transition-all sm:min-h-[84px] sm:rounded-2xl sm:p-2.5",
                      cell.isToday
                        ? "border-gold bg-primary text-primary-foreground shadow-sm"
                        : isSelected
                        ? "border-primary bg-primary/15 ring-2 ring-primary/30"
                        : cell.occasion
                        ? "border-gold/50 bg-gold/10 hover:border-gold"
                        : "border-border/70 bg-background/70 hover:border-primary/40 hover:bg-muted/40"
                    )}
                  >
                    {/* Top row inside cell: Gregorian Day + Occasion/Today indicator */}
                    <div className="flex w-full items-center justify-between">
                      <span
                        className={cn(
                          "text-xs font-extrabold leading-none sm:text-sm",
                          cell.isToday
                            ? "text-white"
                            : "text-foreground"
                        )}
                      >
                        {cell.dayNumber}
                      </span>

                      {cell.isToday ? (
                        <span className="hidden rounded-full bg-gold px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-950 sm:inline-block">
                          اليوم
                        </span>
                      ) : cell.occasion ? (
                        <span
                          className="h-2 w-2 rounded-full bg-gold"
                          title={cell.occasion.titleAr}
                        />
                      ) : null}
                    </div>

                    {/* Bottom row inside cell: Compact Hijri badge on mobile, Full Hijri date on desktop */}
                    <div className="mt-1 w-full">
                      {/* Mobile View: Crisp single-line Hijri day number */}
                      <div className="flex items-center justify-between sm:hidden">
                        <span
                          className={cn(
                            "inline-block whitespace-nowrap rounded-md px-1 py-0.5 text-[10px] font-bold leading-none",
                            cell.isToday
                              ? "bg-white/20 text-gold-light"
                              : isFirstOfHijriMonth
                              ? "bg-primary/15 text-primary"
                              : "text-primary"
                          )}
                        >
                          {toArabicDigits(cell.hijri.day)} هـ
                        </span>
                      </div>

                      {/* Desktop View: Hijri day + Hijri month name */}
                      <div className="hidden sm:block">
                        <div
                          className={cn(
                            "truncate text-[11px] font-bold",
                            cell.isToday
                              ? "text-gold-light"
                              : "text-primary"
                          )}
                        >
                          {toArabicDigits(cell.hijri.day)} {cell.hijri.monthNameAr}
                        </div>
                        {cell.occasion && (
                          <div
                            className={cn(
                              "mt-0.5 truncate rounded px-1 py-0.5 text-[9px] font-bold",
                              cell.isToday
                                ? "bg-white/20 text-white"
                                : "bg-gold/20 text-foreground"
                            )}
                          >
                            {cell.occasion.titleAr}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Day Details Bar — Displays full Hijri & Gregorian info cleanly */}
            <div className="mt-4 flex flex-col justify-between gap-2 rounded-2xl border border-primary/25 bg-primary/5 p-3.5 sm:flex-row sm:items-center sm:px-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  <span className="text-xs font-extrabold text-foreground sm:text-sm">
                    {selectedDayInfo.gregorianFormatted}
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold text-primary">
                  الموافق هجريًا: {selectedDayInfo.hijri.formattedAr}
                </p>
              </div>

              {selectedDayInfo.occasion ? (
                <div className="rounded-xl border border-gold/40 bg-gold/15 px-3 py-1.5 text-xs font-extrabold text-foreground">
                  ✨ {selectedDayInfo.occasion.titleAr}
                </div>
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  اضغط على أي يوم في التقويم لعرض تاريخه الهجري والميلادي الكامل
                </span>
              )}
            </div>
          </div>

          {/* Islamic Occasions List */}
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-foreground">
              <Star className="h-5 w-5 text-gold" />
              <span>أبرز المناسبات الإسلامية</span>
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              المواسم والأعياد الإسلامية وفق التقويم الهجري
            </p>

            <div className="mt-4 space-y-3">
              {ISLAMIC_OCCASIONS.map((occ, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border/80 bg-background/60 p-3.5 transition hover:border-primary/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-foreground">
                      {occ.titleAr}
                    </h3>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                      {toArabicDigits(occ.hijriDay)} من الشهر الهجري{" "}
                      {toArabicDigits(occ.hijriMonth)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {occ.descriptionAr}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 99 NAMES OF ALLAH */}
      {activeTab === "names" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={namesSearch}
                onChange={(e) => setNamesSearch(e.target.value)}
                placeholder="ابحث في أسماء الله الحسنى أو معانيها..."
                className="w-full rounded-xl border border-border bg-background py-2.5 pr-10 pl-4 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredNames.map((item) => (
              <div
                key={item.number}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-gold/60"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    {toArabicDigits(item.number)}
                  </span>
                  <span className="text-[11px] font-semibold text-gold">
                    أسماء الله الحسنى
                  </span>
                </div>
                <div className="mt-3 text-center font-quran text-3xl font-bold text-foreground">
                  {item.name}
                </div>
                <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
                  {item.meaningAr}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ZAKAT CALCULATOR */}
      {activeTab === "zakat" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <Coins className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-extrabold text-foreground">
                حاسبة زكاة المال والذهب وزكاة الفطر (بالجنيه المصري)
              </h2>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              نصاب زكاة المال يُقدر شرعًا بقيمة ٨٥ جرامًا من الذهب الخالص (عيار ٢٤)، وتجب فيه الزكاة بنسبة ربع العشر (٢.٥٪) إذا بلغ النصاب وحال عليه الحول الهجري.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-foreground">
                  سعر جرام الذهب عيار ٢١ الحالي في مصر (ج.م)
                </label>
                <input
                  type="number"
                  min={0}
                  value={gold21PriceEgp}
                  onChange={(e) => setGold21PriceEgp(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-foreground">
                  السيولة النقدية والمدخرات البنكية (ج.م)
                </label>
                <input
                  type="number"
                  min={0}
                  value={cashEgp}
                  onChange={(e) => setCashEgp(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-foreground">
                  الذهب المدخر للاستثمار (معادل عيار ٢٤ بالجرام)
                </label>
                <input
                  type="number"
                  min={0}
                  value={goldGrams24}
                  onChange={(e) => setGoldGrams24(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-foreground">
                  الديون الحالة الواجب سدادها (تُخصم من الوعاء الزكوي)
                </label>
                <input
                  type="number"
                  min={0}
                  value={debtsEgp}
                  onChange={(e) => setDebtsEgp(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Zakat Al-Fitr */}
            <div className="mt-6 border-t border-border pt-5">
              <h3 className="text-base font-extrabold text-foreground">
                حاسبة زكاة الفطر للأسرة
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-foreground">
                    عدد أفراد الأسرة
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={zakatFitrPersons}
                    onChange={(e) => setZakatFitrPersons(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-foreground">
                    قيمة الفرد (تحددها دار الإفتاء المصرية سنويًا - ج.م)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={zakatFitrPerPersonEgp}
                    onChange={(e) => setZakatFitrPerPersonEgp(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Results Summary Card */}
          <div className="flex flex-col justify-between rounded-3xl border border-gold/40 bg-hero-pattern p-6 text-white shadow-gold">
            <div>
              <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-gold-light">
                نتيجة الحساب التقديرية
              </span>
              <h3 className="mt-3 text-xl font-extrabold">ملخص الزكاة المستحقة</h3>

              <div className="mt-5 space-y-3 rounded-2xl bg-black/25 p-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-100/80">سعر جرام عيار ٢٤ التقديري:</span>
                  <span className="font-bold">
                    {zakatResult.price24.toLocaleString("ar-EG")} ج.م
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-100/80">قيمة نصاب الذهب (٨٥ جرام عيار ٢٤):</span>
                  <span className="font-bold text-gold-light">
                    {zakatResult.nisabGoldEgp.toLocaleString("ar-EG")} ج.م
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-2">
                  <span className="text-emerald-100/80">صافي الوعاء الزكوي:</span>
                  <span className="font-bold">
                    {zakatResult.netWealthEgp.toLocaleString("ar-EG")} ج.م
                  </span>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-gold/30 bg-white/10 p-4 text-center">
                <div className="text-xs text-emerald-100">مقدار زكاة المال (٢.٥٪)</div>
                {zakatResult.reachedNisab ? (
                  <div className="mt-1 font-mono text-3xl font-extrabold text-gold-light">
                    {zakatResult.zakatMalAmount.toLocaleString("ar-EG")} ج.م
                  </div>
                ) : (
                  <div className="mt-1 text-sm font-bold text-amber-200">
                    لم يبلغ المال نصاب الزكاة الشرعي (٨٥ جرام ذهب عيار ٢٤)
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-white/15 bg-white/5 p-4 text-center">
                <div className="text-xs text-emerald-100">إجمالي زكاة الفطر للأسرة</div>
                <div className="mt-1 font-mono text-2xl font-extrabold text-white">
                  {zakatResult.zakatFitrTotal.toLocaleString("ar-EG")} ج.م
                </div>
              </div>
            </div>

            <p className="mt-6 text-[11px] leading-relaxed text-emerald-100/75">
              ملاحظة فقهية: هذه الحاسبة استرشادية وفق القواعد العامة لحساب الزكاة، وللفتاوى التفصيلية الخاصة بالتجارة والأسهم يُرجى مراجعة دار الإفتاء المصرية (الخط الساخن 107).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
