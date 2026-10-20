import React from "react";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  CalendarRange,
  Compass,
  HeartHandshake,
  MapPin,
  Moon,
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

const QUICK_ACCESS_CARDS = [
  {
    href: "/quran",
    title: "القرآن الكريم",
    desc: "المصحف الكامل (١١٤ سورة) بالرسم العثماني والتلاوات الصوتية",
    icon: BookOpen,
    badge: "١١٤ سورة",
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
