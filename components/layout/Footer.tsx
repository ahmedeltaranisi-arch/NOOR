import React from "react";
import Link from "next/link";
import { ShieldCheck, BookOpen, Compass, Clock, Heart, ScrollText } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border/80 bg-card/60 pb-24 pt-10 lg:pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand Info */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <img
                src="/logo-mark.png"
                alt="شعار منصة نور الإسلامية"
                width={44}
                height={44}
                className="h-11 w-11 shrink-0 object-contain drop-shadow-sm"
              />
              <div>
                <span className="text-lg font-extrabold text-foreground">نور | NOOR</span>
                <p className="text-xs text-muted-foreground">
                  المنصة الإسلامية المتكاملة لجمهورية مصر العربية
                </p>
              </div>
            </div>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              رفيقك اليومي لمواقيت الصلاة الدقيقة في جميع محافظات مصر الـ 27 وفق الهيئة المصرية العامة للمساحة، مع اتجاه القبلة، القرآن الكريم كاملًا بالرسم العثماني وورد القراءة، وأذكار المسلم الموثقة.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>خصوصية كاملة: تُحفظ جميع تفضيلاتك وختمتك محليًا على جهازك دون تتبع</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold text-foreground">الأقسام الرئيسية</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/prayer-times" className="inline-flex items-center gap-1.5 hover:text-primary">
                  <Clock className="h-3.5 w-3.5" />
                  <span>مواقيت الصلاة في مصر</span>
                </Link>
              </li>
              <li>
                <Link href="/qibla" className="inline-flex items-center gap-1.5 hover:text-primary">
                  <Compass className="h-3.5 w-3.5" />
                  <span>اتجاه القبلة وأقرب المساجد</span>
                </Link>
              </li>
              <li>
                <Link href="/quran" className="inline-flex items-center gap-1.5 hover:text-primary">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>القرآن الكريم وورد القراءة</span>
                </Link>
              </li>
              <li>
                <Link href="/hadith" className="inline-flex items-center gap-1.5 hover:text-primary">
                  <ScrollText className="h-3.5 w-3.5" />
                  <span>الأحاديث النبوية الشريفة (٥٠,٧٥٩ حديث)</span>
                </Link>
              </li>
              <li>
                <Link href="/adhkar" className="inline-flex items-center gap-1.5 hover:text-primary">
                  <Heart className="h-3.5 w-3.5" />
                  <span>الأذكار والأدعية الموثقة</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Tools & Settings */}
          <div>
            <h3 className="text-sm font-bold text-foreground">أدوات إسلامية</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/adhkar/morning" className="hover:text-primary">
                  أذكار الصباح
                </Link>
              </li>
              <li>
                <Link href="/adhkar/evening" className="hover:text-primary">
                  أذكار المساء
                </Link>
              </li>
              <li>
                <Link href="/tasbeeh" className="hover:text-primary">
                  المسبحة الإلكترونية
                </Link>
              </li>
              <li>
                <Link href="/calendar" className="hover:text-primary">
                  التقويم الهجري وأسماء الله الحسنى والزكاة
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-primary">
                  إعدادات التنبيهات وطريقة الحساب
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} منصة نور (NOOR) الإسلامية. جميع الحقوق محفوظة.
          </p>
          <p>
            المصادر: الهيئة المصرية العامة للمساحة (Adhan) • الرسم العثماني للمصحف الشريف • حصن المسلم
          </p>
        </div>
      </div>
    </footer>
  );
}
