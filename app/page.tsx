import React from "react";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  CalendarRange,
  Compass,
  HeartHandshake,
  Layers,
  Library,
  MapPin,
  Moon,
  ScrollText,
  Settings,
  Sparkles,
  Sun,
  ChevronLeft,
} from "lucide-react";
import { HeroPrayerCard } from "@/components/prayer/HeroPrayerCard";
import { DashboardQiblaCard } from "@/components/qibla/DashboardQiblaCard";
import { DashboardWirdCard } from "@/components/quran/DashboardWirdCard";
import { DailyInspirationSection } from "@/components/layout/DailyInspirationSection";
import { getDailyInspiration } from "@/data/daily-content";
import {
  HADITH_BOOKS_META,
  TOTAL_HADITH_BOOKS_COUNT,
  TOTAL_HADITH_CHAPTERS_COUNT,
  TOTAL_HADITHS_COUNT,
} from "@/lib/hadith/meta";
import {
  TAFSIR_BOOKS_META,
  TOTAL_QURAN_SURAHS_COUNT,
  TOTAL_QURAN_VERSES_COUNT,
  TOTAL_TAFSIR_BOOKS_COUNT,
} from "@/lib/tafsir/meta";
import { QURAN_JUZ_META } from "@/lib/quran/juz";
import { toArabicDigits } from "@/lib/utils";

const FEATURED_TAFSIR_SURAHS = [
  { id: 1, name: "الفاتحة", verses: 7 },
  { id: 2, name: "البقرة", verses: 286 },
  { id: 18, name: "الكهف", verses: 110 },
  { id: 36, name: "يس", verses: 83 },
  { id: 55, name: "الرحمن", verses: 78 },
  { id: 56, name: "الواقعة", verses: 96 },
  { id: 67, name: "الملك", verses: 30 },
  { id: 112, name: "الإخلاص", verses: 4 },
];

const QUICK_ACCESS_CARDS = [
  {
    href: "/quran",
    title: "القرآن الكريم",
    desc: "المصحف الكامل (١١٤ سورة و٣٠ جزءًا) بالرسم العثماني والتلاوات الصوتية",
    icon: BookOpen,
    badge: "١١٤ سورة",
  },
  {
    href: "/tafsir",
    title: "تفسير القرآن الكريم",
    desc: "موسوعة التفسير الكاملة (٧ تفاسير معتمدة: الميسر، السعدي، ابن كثير، القرطبي، البغوي، المعاني، والإعراب)",
    icon: Library,
    badge: "٧ تفاسير",
  },
  {
    href: "/hadith",
    title: "الأحاديث النبوية الشريفة",
    desc: "موسوعة السنة الكاملة (٥٠,٧٥٩ حديثًا في ١٧ كتابًا من الكتب التسعة ورياض الصالحين والأربعين النووية)",
    icon: ScrollText,
    badge: "٥٠,٧٥٩ حديث",
  },
  {
    href: "/adhkar/morning",
    title: "أذكار الصباح",
    desc: "حصن المسلم الصباحي كاملًا مع عداد تفاعلي وحفظ التقدم",
    icon: Sun,
    badge: "صباحًا",
  },
  {
    href: "/adhkar/evening",
    title: "أذكار المساء",
    desc: "أذكار المساء المأثورة من السنة النبوية الصحيحة",
    icon: Moon,
    badge: "مساءً",
  },
  {
    href: "/tasbeeh",
    title: "المسبحة الإلكترونية",
    desc: "عداد تسبيح مريح مع اهتزاز وأذكار مخصصة وإحصائيات يومية",
    icon: Sparkles,
    badge: "تسبيح",
  },
  {
    href: "/adhkar?cat=prophetic-duas",
    title: "الأدعية النبوية",
    desc: "جوامع الدعاء من القرآن الكريم والسنة النبوية المشرفة",
    icon: HeartHandshake,
    badge: "موثق",
  },
  {
    href: "/calendar",
    title: "التقويم الهجري",
    desc: "التاريخ الهجري والمناسبات الإسلامية وأسماء الله الحسنى والزكاة",
    icon: Calendar,
    badge: "١٤٤٨ هـ",
  },
  {
    href: "/qibla#nearby-mosques",
    title: "أقرب المساجد",
    desc: "خريطة المساجد القريبة في محافظتك ومدينتك والاتجاه إليها",
    icon: MapPin,
    badge: "خرائط",
  },
  {
    href: "/prayer-times?view=month",
    title: "مواقيت الصلاة الشهرية",
    desc: "جدول مواقيت اليوم والأسبوع والشهر لجميع محافظات مصر الـ ٢٧",
    icon: CalendarRange,
    badge: "٢٧ محافظة",
  },
  {
    href: "/settings",
    title: "الإعدادات والتنبيهات",
    desc: "إدارة تنبيهات الصلوات الخمس والإقامة وطريقة الحساب والخصوصية",
    icon: Settings,
    badge: "تخصيص",
  },
];

export default function HomePage() {
  const dailyContent = getDailyInspiration(new Date());

  return (
    <div className="space-y-10">
      {/* أ. بطاقة مواقيت الصلاة الرئيسية */}
      <HeroPrayerCard />

      {/* ب. بطاقة القبلة + بطاقة ورد القرآن اليومي */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardQiblaCard />
        <DashboardWirdCard />
      </div>

      {/* ب-2. قسم أجزاء القرآن الكريم (٣٠ جزءًا — القراءة والتلاوة بأصوات ١١ شيخًا) */}
      <section
        aria-label="أجزاء القرآن الكريم الثلاثون"
        className="rounded-3xl border border-gold/35 bg-card p-4 shadow-soft sm:p-6 md:p-8"
      >
        <div className="flex flex-col justify-between gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-extrabold text-gold">
              <Layers className="h-3.5 w-3.5" />
              <span>الأجزاء الثلاثون • قراءة وتلاوة بأصوات ١١ قارئًا</span>
            </div>
            <h2 className="mt-2 text-xl font-extrabold text-foreground sm:text-2xl">
              أجزاء القرآن الكريم (٣٠ جزءًا)
            </h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              اقرأ واستمع لأي جزء من الأجزاء الثلاثين بأصوات كبار الشيوخ (عبد الباسط، المنشاوي، الحصري، مصطفى إسماعيل، المعيقلي، السديس، العفاسي، الدوسري، العجمي، فارس عباد، ناصر القطامي)
            </p>
          </div>

          <Link
            href="/quran?tab=juz"
            className="inline-flex items-center justify-center gap-1.5 self-start rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 sm:self-center"
          >
            <BookOpen className="h-4 w-4" />
            <span>عرض تفاصيل الأجزاء الـ ٣٠</span>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
          {QURAN_JUZ_META.map((juz) => (
            <Link
              key={juz.id}
              href={`/quran/juz/${juz.id}`}
              className="group flex flex-col justify-between rounded-2xl border border-border bg-background/70 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-gold/15 text-xs font-extrabold text-gold transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  {toArabicDigits(juz.id)}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  ص {toArabicDigits(juz.pageStart)}
                </span>
              </div>
              <div className="mt-2">
                <h3 className="truncate font-serif text-sm font-bold text-foreground group-hover:text-primary sm:text-base">
                  {juz.nameAr}
                </h3>
                <p className="mt-0.5 truncate text-[11px] font-medium text-gold">
                  {juz.titleAr}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  سورة {juz.startSurahName} ({toArabicDigits(juz.startAyah)})
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ب-2.5. قسم تفسير القرآن الكريم (٧ تفاسير معتمدة لجميع السور الـ ١١٤ والآيات الـ ٦,٢٣٦) */}
      <section
        aria-label="تفسير القرآن الكريم"
        className="rounded-3xl border border-gold/35 bg-card p-4 shadow-soft sm:p-6 md:p-8"
      >
        <div className="flex flex-col justify-between gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-extrabold text-gold">
              <BookOpen className="h-3.5 w-3.5" />
              <span>
                موسوعة التفسير • {toArabicDigits(TOTAL_TAFSIR_BOOKS_COUNT)} تفاسير
                معتمدة لـ {toArabicDigits(TOTAL_QURAN_SURAHS_COUNT)} سورة و
                {toArabicDigits(TOTAL_QURAN_VERSES_COUNT)} آية
              </span>
            </div>
            <h2 className="mt-2 text-xl font-extrabold text-foreground sm:text-2xl">
              تفسير القرآن الكريم
            </h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              اقرأ وتدبّر آيات القرآن الكريم من خلال ٧ مصادر معتمدة: التفسير الميسر،
              تفسير السعدي، تفسير ابن كثير، تفسير القرطبي، تفسير البغوي، معاني كلمات
              القرآن، وإعراب القرآن الكريم، مع إمكانية مقارنة التفاسير الـ ٧ لأي آية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <Link
              href="/tafsir?tab=compare"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-2.5 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
            >
              <span>مقارنة التفاسير الـ ٧</span>
            </Link>
            <Link
              href="/tafsir"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
            >
              <BookOpen className="h-4 w-4" />
              <span>فتح موسوعة التفسير الكاملة</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* 7 Tafsir Books Grid */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {TAFSIR_BOOKS_META.map((book) => (
            <Link
              key={book.slug}
              href={`/tafsir/${book.slug}`}
              className="group flex flex-col justify-between rounded-2xl border border-border bg-background/70 p-3.5 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card hover:shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <span className="rounded-lg border border-gold/30 bg-gold/15 px-2.5 py-0.5 text-[10px] font-extrabold text-gold">
                    {book.badgeAr}
                  </span>
                  <span className="text-[11px] font-extrabold text-primary">
                    {toArabicDigits(TOTAL_QURAN_SURAHS_COUNT)} سورة
                  </span>
                </div>
                <h3 className="mt-2.5 font-sans text-base font-extrabold text-foreground group-hover:text-primary">
                  {book.shortTitleAr}
                </h3>
                <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                  {book.authorAr}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-[11px] font-bold text-primary">
                <span>{toArabicDigits(TOTAL_QURAN_VERSES_COUNT)} آية مفسرة</span>
                <span className="inline-flex items-center gap-0.5">
                  <span>قراءة التفسير</span>
                  <ChevronLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Links to Popular Surahs' Tafsirs */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3.5">
          <span className="text-xs font-extrabold text-muted-foreground">
            تفسير سور مختارة:
          </span>
          {FEATURED_TAFSIR_SURAHS.map((s) => (
            <Link
              key={s.id}
              href={`/tafsir?surah=${s.id}`}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground transition hover:border-primary hover:text-primary"
            >
              <span>تفسير سورة {s.name}</span>
              <span className="text-[10px] text-muted-foreground">
                ({toArabicDigits(s.verses)})
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ب-3. قسم موسوعة الأحاديث النبوية الشريفة (٥٠,٧٥٩ حديثًا من ١٧ كتابًا معتمدًا) */}
      <section
        aria-label="موسوعة الأحاديث النبوية الشريفة"
        className="rounded-3xl border border-gold/35 bg-card p-4 shadow-soft sm:p-6 md:p-8"
      >
        <div className="flex flex-col justify-between gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-extrabold text-gold">
              <ScrollText className="h-3.5 w-3.5" />
              <span>
                موسوعة السنة النبوية • {toArabicDigits(TOTAL_HADITHS_COUNT)} حديثًا في{" "}
                {toArabicDigits(TOTAL_HADITH_BOOKS_COUNT)} كتابًا و
                {toArabicDigits(TOTAL_HADITH_CHAPTERS_COUNT)} بابًا
              </span>
            </div>
            <h2 className="mt-2 text-xl font-extrabold text-foreground sm:text-2xl">
              الأحاديث النبوية الشريفة عن رسول الله ﷺ
            </h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              تصفح وابحث في جميع الأحاديث الواردة عن النبي ﷺ في الكتب التسعة (صحيح البخاري،
              صحيح مسلم، سنن أبي داود، جامع الترمذي، سنن النسائي، سنن ابن ماجه، موطأ مالك،
              مسند أحمد، سنن الدارمي)، ورياض الصالحين، وبلوغ المرام، والأدب المفرد، ومشكاة
              المصابيح، والشمائل المحمدية، والأربعين النووية والقدسية.
            </p>
          </div>

          <Link
            href="/hadith"
            className="inline-flex items-center justify-center gap-1.5 self-start rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 sm:self-center"
          >
            <Library className="h-4 w-4" />
            <span>فتح موسوعة الأحاديث الكاملة</span>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {HADITH_BOOKS_META.map((book) => (
            <Link
              key={book.slug}
              href={`/hadith/${book.slug}`}
              className="group flex flex-col justify-between rounded-2xl border border-border bg-background/70 p-3.5 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card hover:shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <span className="rounded-lg border border-gold/30 bg-gold/15 px-2.5 py-0.5 text-[10px] font-extrabold text-gold">
                    {book.gradeBadgeAr}
                  </span>
                  <span className="text-[11px] font-extrabold text-primary">
                    {toArabicDigits(book.totalHadiths)} حديث
                  </span>
                </div>
                <h3 className="mt-2.5 font-sans text-base font-extrabold text-foreground group-hover:text-primary">
                  {book.shortTitleAr}
                </h3>
                <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                  {book.authorAr}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-[11px] font-bold text-primary">
                <span>{toArabicDigits(book.totalChapters)} بابًا</span>
                <span className="inline-flex items-center gap-0.5">
                  <span>تصفح الأحاديث</span>
                  <ChevronLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ج. بطاقات الوصول السريع */}
      <section aria-label="بطاقات الوصول السريع" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">
              الوصول السريع للخدمات الإسلامية
            </h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              جميع الأدوات اليومية التي يحتاجها المسلم في مكان واحد
            </p>
          </div>
          <Link
            href="/qibla"
            className="hidden items-center gap-1 text-xs font-bold text-primary hover:underline sm:inline-flex"
          >
            <Compass className="h-4 w-4" />
            <span>بوصلة القبلة</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACCESS_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {card.badge}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-bold text-foreground group-hover:text-primary">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {card.desc}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-primary">
                  <span>فتح القسم</span>
                  <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* د. المحتوى اليومي الموثق */}
      <DailyInspirationSection content={dailyContent} />
    </div>
  );
}
