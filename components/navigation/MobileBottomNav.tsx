"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Calendar,
  Clock,
  Compass,
  Heart,
  Home,
  LayoutGrid,
  Library,
  Moon,
  ScrollText,
  Settings,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";

const MAIN_MOBILE_TABS = [
  { href: "/", label: "الرئيسية", icon: Home },
  { href: "/prayer-times", label: "الصلاة", icon: Clock },
  { href: "/quran", label: "القرآن", icon: BookOpen },
  { href: "/adhkar", label: "الأذكار", icon: Heart },
];

const MORE_DRAWER_LINKS = [
  {
    href: "/tafsir",
    label: "تفسير القرآن الكريم",
    desc: "موسوعة التفسير الكاملة (٧ تفاسير معتمدة: الميسر، السعدي، ابن كثير، القرطبي، البغوي، المعاني، والإعراب)",
    icon: Library,
  },
  {
    href: "/hadith",
    label: "الأحاديث النبوية الشريفة",
    desc: "موسوعة شاملة تضم ٥٠,٧٥٩ حديثًا من ١٧ كتابًا من أمهات كتب السنة",
    icon: ScrollText,
  },
  {
    href: "/qibla",
    label: "اتجاه القبلة والمساجد",
    desc: "بوصلة تفاعلية وحساب المسافة للكعبة وأقرب المساجد",
    icon: Compass,
  },
  {
    href: "/tasbeeh",
    label: "المسبحة الإلكترونية",
    desc: "عداد تسبيح تفاعلي مع إحصائيات يومية وأذكار مخصصة",
    icon: Sparkles,
  },
  {
    href: "/adhkar/morning",
    label: "أذكار الصباح",
    desc: "أذكار الصباح كاملة من حصن المسلم مع عداد تفاعلي",
    icon: Sun,
  },
  {
    href: "/adhkar/evening",
    label: "أذكار المساء",
    desc: "أذكار المساء كاملة مع حفظ التقدم اليومي",
    icon: Moon,
  },
  {
    href: "/calendar",
    label: "التقويم الهجري والأدوات",
    desc: "المناسبات الإسلامية، أسماء الله الحسنى، وحاسبة الزكاة",
    icon: Calendar,
  },
  {
    href: "/settings",
    label: "الإعدادات والتنبيهات",
    desc: "إدارة تنبيهات الصلاة، طريقة الحساب، والخصوصية",
    icon: Settings,
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isMoreActive = [
    "/tafsir",
    "/hadith",
    "/qibla",
    "/tasbeeh",
    "/calendar",
    "/settings",
  ].some((p) => pathname.startsWith(p));

  return (
    <>
      {/* More Drawer */}
      {drawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="المزيد من الأقسام والأدوات الإسلامية"
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm lg:hidden"
        >
          <div className="max-h-[82vh] overflow-y-auto rounded-t-3xl border-t border-border bg-card p-5 pb-24 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">جميع الأدوات والأقسام</h2>
                <p className="text-xs text-muted-foreground">
                  الوصول السريع إلى كافة خدمات منصة نور الإسلامية
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="إغلاق القائمة"
                className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-muted/40 p-3.5">
              <span className="text-sm font-semibold text-foreground">مظهر العرض</span>
              <ThemeToggle showLabels />
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {MORE_DRAWER_LINKS.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border p-3.5 transition-all",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background/70 text-foreground hover:border-primary/40"
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold">{item.label}</div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Bar — Native Mobile App Navigation with Safe Area support */}
      <nav
        aria-label="شريط التنقل السفلي"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/90 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-lg lg:hidden"
      >
        <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center px-1.5">
          {MAIN_MOBILE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setDrawerOpen(false)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl py-1 text-[11px] font-bold transition-all active:scale-95",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-11 items-center justify-center rounded-full transition-colors",
                    isActive ? "bg-primary/15" : "bg-transparent"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="truncate">{tab.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setDrawerOpen((prev) => !prev)}
            aria-expanded={drawerOpen}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-xl py-1 text-[11px] font-bold transition-all active:scale-95",
              drawerOpen || isMoreActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div
              className={cn(
                "flex h-7 w-11 items-center justify-center rounded-full transition-colors",
                drawerOpen || isMoreActive ? "bg-primary/15" : "bg-transparent"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </div>
            <span className="truncate">المزيد</span>
          </button>
        </div>
      </nav>
    </>
  );
}
