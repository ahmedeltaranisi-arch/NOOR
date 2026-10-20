"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calculator,
  Calendar,
  ChevronLeft,
  ChevronRight,
  History,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { ALLAH_NAMES, ISLAMIC_OCCASIONS } from "@/data/daily-content";
import {
  getSpiritualActivityLogs,
  SpiritualActivityEntry,
} from "@/lib/storage/indexed-db";
import {
  getHijriDateInfo,
  getLocalDateKey,
  normalizeArabicText,
  toArabicDigits,
  WEEKDAYS_AR,
  cn,
} from "@/lib/utils";

const GREGORIAN_MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export function CalendarAndToolsClient() {
  const [activeTab, setActiveTab] = useState<
    "calendar" | "names" | "zakat" | "activity-log"
  >("calendar");

  // Calendar state
  const [viewYear, setViewYear] = useState<number>(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => new Date().getMonth());

  // 99 Names search
  const [nameSearch, setNameSearch] = useState("");

  // Zakat calculator state (in EGP)
  const [goldPrice24Egp, setGoldPrice24Egp] = useState<number>(4200);
  const [cashEgp, setCashEgp] = useState<number>(0);
  const [gold24Grams, setGold24Grams] = useState<number>(0);
  const [gold21Grams, setGold21Grams] = useState<number>(0);
  const [gold18Grams, setGold18Grams] = useState<number>(0);
  const [tradeAssetsEgp, setTradeAssetsEgp] = useState<number>(0);
  const [debtsEgp, setDebtsEgp] = useState<number>(0);

  // Activity logs from IndexedDB
  const [activityLogs, setActivityLogs] = useState<SpiritualActivityEntry[]>([]);

  useEffect(() => {
    getSpiritualActivityLogs(40).then(setActivityLogs);
  }, [activeTab]);

  const todayHijri = useMemo(() => getHijriDateInfo(new Date()), []);
  const todayKey = getLocalDateKey(new Date());

  // Generate calendar days for viewYear & viewMonth
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1, 12, 0, 0);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const startWeekday = firstDayOfMonth.getDay(); // 0 = Sunday

    const cells: (null | {
      date: Date;
      dateKey: string;
      gregDay: number;
      hijri: ReturnType<typeof getHijriDateInfo>;
      occasion?: (typeof ISLAMIC_OCCASIONS)[number];
    })[] = [];

    for (let i = 0; i < startWeekday; i++) {
      cells.push(null);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(viewYear, viewMonth, d, 12, 0, 0);
      const hijri = getHijriDateInfo(dateObj);
      const occasion = ISLAMIC_OCCASIONS.find(
        (occ) => occ.hijriMonth === hijri.monthNumber && occ.hijriDay === hijri.day
      );
      cells.push({
        date: dateObj,
        dateKey: getLocalDateKey(dateObj),
        gregDay: d,
        hijri,
        occasion,
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const filteredNames = useMemo(() => {
    const q = normalizeArabicText(nameSearch);
    if (!q) return ALLAH_NAMES;
    return ALLAH_NAMES.filter(
      (n) =>
        normalizeArabicText(n.name).includes(q) ||
        normalizeArabicText(n.meaningAr).includes(q) ||
        String(n.number) === nameSearch.trim()
    );
  }, [nameSearch]);

  // Zakat calculation
  const zakatResult = useMemo(() => {
    const pureGoldGrams =
      gold24Grams + (gold21Grams * 21) / 24 + (gold18Grams * 18) / 24;
    const goldValueEgp = pureGoldGrams * goldPrice24Egp;
    const grossWealth = cashEgp + goldValueEgp + tradeAssetsEgp;
    const netWealth = Math.max(0, grossWealth - debtsEgp);
    const nisabValueEgp = 85 * goldPrice24Egp;
    const reachedNisab = netWealth >= nisabValueEgp && nisabValueEgp > 0;
    const zakatDue = reachedNisab ? netWealth * 0.025 : 0;

    return {
      pureGoldGrams,
      goldValueEgp,
      grossWealth,
      netWealth,
      nisabValueEgp,
      reachedNisab,
      zakatDue,
    };
  }, [
    goldPrice24Egp,
    cashEgp,
    gold24Grams,
    gold21Grams,
    gold18Grams,
    tradeAssetsEgp,
    debtsEgp,
  ]);

  const changeMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  return (
    <div className="space-y-8">
      {/* Page Hero */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary">
              <Calendar className="h-3.5 w-3.5" />
              <span>التقويم الهجري والأدوات الإسلامية</span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold text-foreground sm:text-3xl">
              التقويم الهجري، أسماء الله الحسنى، وحاسبة الزكاة
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              تاريخ اليوم الهجري:{" "}
              <strong className="text-primary">{todayHijri.formattedAr}</strong>
            </p>
          </div>

          {/* Section Switcher */}
          <div
            role="tablist"
            aria-label="أقسام الأدوات الإسلامية"
            className="flex flex-wrap gap-1.5 rounded-2xl border border-border bg-muted/40 p-1.5"
          >
            {(
              [
                { id: "calendar", label: "التقويم والمناسبات", icon: Calendar },
                { id: "names", label: "أسماء الله الحسنى (٩٩)", icon: Star },
                { id: "zakat", label: "حاسبة الزكاة", icon: Calculator },
                { id: "activity-log", label: "سجل الإنجاز اليومي", icon: History },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition sm:text-sm",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TAB 1: Hijri & Gregorian Calendar + Islamic Occasions */}
      {activeTab === "calendar" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Monthly Calendar Grid */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft lg:col-span-7">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-foreground">
                  {GREGORIAN_MONTHS_AR[viewMonth]} {toArabicDigits(viewYear)} م
                </h2>
                <p className="text-xs text-muted-foreground">
                  عرض مزدوج للتاريخ الميلادي والتاريخ الهجري المقابل
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  aria-label="الشهر السابق"
                  className="rounded-xl border border-border p-2 hover:bg-muted"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setViewYear(now.getFullYear());
                    setViewMonth(now.getMonth());
                  }}
                  className="rounded-xl border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted"
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  aria-label="الشهر التالي"
                  className="rounded-xl border border-border p-2 hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Weekday Headers */}
            <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-muted-foreground">
              {WEEKDAYS_AR.map((day) => (
                <div key={day} className="py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="mt-1 grid grid-cols-7 gap-1.5">
              {calendarDays.map((cell, idx) => {
                if (!cell) {
                  return <div key={`empty-${idx}`} className="h-20 rounded-xl bg-muted/20" />;
                }
                const isToday = cell.dateKey === todayKey;
                const hasOccasion = Boolean(cell.occasion);

                return (
                  <div
                    key={cell.dateKey}
                    className={cn(
                      "flex h-20 flex-col justify-between rounded-2xl border p-2 transition",
                      isToday
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : hasOccasion
                        ? "border-gold bg-gold-muted/40 text-foreground"
                        : "border-border/70 bg-background/60 text-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold">
                        {toArabicDigits(cell.gregDay)}
                      </span>
                      {hasOccasion && (
                        <Sparkles
                          className={cn(
                            "h-3.5 w-3.5",
                            isToday ? "text-gold" : "text-gold"
                          )}
                        />
                      )}
                    </div>
                    <div className="text-left">
                      <div
                        className={cn(
                          "text-[11px] font-bold",
                          isToday ? "text-gold" : "text-primary"
                        )}
                      >
                        {toArabicDigits(cell.hijri.day)} {cell.hijri.monthNameAr}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Islamic Occasions List & Sighting Disclaimer */}
          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-950 dark:text-amber-200">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <strong>تنبيه بشأن الرؤية الشرعية للأهلة: </strong>
                  التواريخ الهجرية المعروضة مبنية على الحساب الفلكي التقويمي، وقد تختلف بداية بعض الشهور والمناسبات الإسلامية في مصر بيوم واحد تبعًا للرؤية الشرعية الرسمية للهلال التي تعلنها <strong>دار الإفتاء المصرية</strong>.
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="text-lg font-extrabold text-foreground">
                المناسبات والأعياد الإسلامية السنوية
              </h2>
              <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pl-1">
                {ISLAMIC_OCCASIONS.map((occ) => (
                  <div
                    key={occ.id}
                    className="rounded-2xl border border-border/80 bg-background/60 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-extrabold text-foreground">
                        {occ.titleAr}
                      </h3>
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                        {toArabicDigits(occ.hijriDay)} من الشهر الهجري {toArabicDigits(occ.hijriMonth)}
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
        </div>
      )}

      {/* TAB 2: 99 Names of Allah */}
      {activeTab === "names" && (
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 rounded-3xl border border-border bg-card p-5 shadow-soft sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-extrabold text-foreground">
                أسماء الله الحسنى التسعة والتسعون ومعانيها الموثقة
              </h2>
              <p className="text-xs text-muted-foreground">
                قال رسول الله ﷺ: «إِنَّ لِلَّهِ تِسْعَةً وَتِسْعِينَ اسْمًا مِائَةً إِلَّا وَاحِدًا، مَنْ أَحْصَاهَا دَخَلَ الْجَنَّةَ» (متفق عليه)
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
                placeholder="ابحث بالاسم أو المعنى..."
                className="w-full rounded-xl border border-border bg-background py-2 pl-3 pr-9 text-sm text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredNames.map((item) => (
              <div
                key={item.number}
                className="flex items-start gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:border-gold/50"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gold-muted text-sm font-extrabold text-gold">
                  {toArabicDigits(item.number)}
                </div>
                <div>
                  <h3 className="font-quran text-2xl font-bold text-primary">
                    {item.name}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.meaningAr}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Zakat Calculator */}
      {activeTab === "zakat" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-soft lg:col-span-7">
            <div>
              <h2 className="text-xl font-extrabold text-foreground">
                حاسبة زكاة المال والذهب وعروض التجارة
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                أدخل قيم مدخراتك التي حال عليها الحول الهجري لحساب النصاب ومقدار الزكاة (٢٫٥٪)
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-foreground">
                  سعر جرام الذهب عيار ٢٤ الحالي (ج.م)
                </label>
                <input
                  type="number"
                  min={0}
                  value={goldPrice24Egp}
                  onChange={(e) => setGoldPrice24Egp(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-foreground">
                  النقد والأرصدة البنكية والمدخرات (ج.م)
                </label>
                <input
                  type="number"
                  min={0}
                  value={cashEgp}
                  onChange={(e) => setCashEgp(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-foreground">
                  الذهب المدخر عيار ٢٤ (بالجرام)
                </label>
                <input
                  type="number"
                  min={0}
                  value={gold24Grams}
                  onChange={(e) => setGold24Grams(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-foreground">
                  الذهب المدخر عيار ٢١ (بالجرام)
                </label>
                <input
                  type="number"
                  min={0}
                  value={gold21Grams}
                  onChange={(e) => setGold21Grams(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-foreground">
                  الذهب المدخر عيار ١٨ (بالجرام)
                </label>
                <input
                  type="number"
                  min={0}
                  value={gold18Grams}
                  onChange={(e) => setGold18Grams(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-foreground">
                  قيمة عروض التجارة والأسهم للتجارة (ج.م)
                </label>
                <input
                  type="number"
                  min={0}
                  value={tradeAssetsEgp}
                  onChange={(e) => setTradeAssetsEgp(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-bold text-foreground">
                  الديون الحالة واجبة السداد فورًا (تُخصم من الوعاء الزكوي - ج.م)
                </label>
                <input
                  type="number"
                  min={0}
                  value={debtsEgp}
                  onChange={(e) => setDebtsEgp(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Zakat Summary Result */}
          <div className="flex flex-col justify-between gap-4 rounded-3xl border border-border bg-card p-6 shadow-soft lg:col-span-5">
            <div className="space-y-4">
              <h3 className="text-lg font-extrabold text-foreground">
                ملخص الحساب التقديري للزكاة
              </h3>

              <div className="space-y-2.5 rounded-2xl border border-border bg-background/60 p-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">قيمة نصاب الزكاة (٨٥ جرام ذهب عيار ٢٤):</span>
                  <strong className="text-foreground">
                    {Math.round(zakatResult.nisabValueEgp).toLocaleString("ar-EG")} ج.م
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">صافي الوعاء الزكوي بعد خصم الديون:</span>
                  <strong className="text-foreground">
                    {Math.round(zakatResult.netWealth).toLocaleString("ar-EG")} ج.م
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">حالة بلوغ النصاب الشرعي:</span>
                  <strong
                    className={
                      zakatResult.reachedNisab ? "text-emerald-600" : "text-amber-600"
                    }
                  >
                    {zakatResult.reachedNisab
                      ? "بلغ النصاب (تجب فيه الزكاة إذا حال الحول)"
                      : "لم يبلغ النصاب الشرعي"}
                  </strong>
                </div>
              </div>

              <div className="rounded-2xl bg-primary p-5 text-center text-primary-foreground shadow-md">
                <span className="text-xs font-semibold text-emerald-100">
                  مقدار الزكاة الواجبة التقديري (٢٫٥٪ — ربع العشر)
                </span>
                <div className="mt-2 text-3xl font-extrabold text-gold">
                  {Math.round(zakatResult.zakatDue).toLocaleString("ar-EG")} ج.م
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-950 dark:text-amber-200">
              <strong>تنبيه شرعي هام: </strong>
              هذه الحاسبة تقديرية استرشادية لحساب زكاة المال النقدي والذهب المدخر وعروض التجارة. بالنسبة لحليّ النساء الملبوس أو الأصول الصناعية والعقارية والزراعية، يُرجى مراجعة <strong>دار الإفتاء المصرية</strong> للتحقق من الحكم التفصيلي المناسب لحالتك.
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Spiritual Activity Log */}
      {activeTab === "activity-log" && (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-xl font-extrabold text-foreground">
            سجل الإنجاز اليومي للورد والأذكار والتسبيح
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            سجل محلي محفوظ على جهازك في قاعدة البيانات المحلية (IndexedDB) لمتابعة مواظبتك اليومية
          </p>

          {activityLogs.length === 0 ? (
            <div className="my-12 text-center">
              <History className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 font-bold text-foreground">
                لا توجد أنشطة مسجلة في السجل بعد
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                عند إتمام ورد القرآن اليومي أو أذكار الصباح والمساء أو دورة في المسبحة، سيظهر سجل إنجازك هنا تلقائيًا.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-2.5">
              {activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-2xl border border-border/80 bg-background/60 p-4"
                >
                  <div>
                    <div className="text-sm font-bold text-foreground">{log.titleAr}</div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{log.detailsAr}</p>
                  </div>
                  <span className="rounded-xl bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {log.dateKey}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
