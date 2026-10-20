import React from "react";
import Link from "next/link";
import { Compass, Home, BookOpen } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto my-16 max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-soft">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Compass className="h-7 w-7" />
      </div>
      <h1 className="mt-4 text-2xl font-extrabold text-foreground">
        الصفحة المطلوبة غير موجودة (٤٠٤)
      </h1>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
        عذرًا، لم نتمكن من العثور على الرابط الذي تبحث عنه. يمكنك العودة إلى الصفحة الرئيسية أو تصفح القرآن الكريم ومواقيت الصلاة.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground"
        >
          <Home className="h-4 w-4" />
          <span>الصفحة الرئيسية</span>
        </Link>
        <Link
          href="/quran"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-5 py-2.5 text-xs font-bold text-foreground hover:bg-muted"
        >
          <BookOpen className="h-4 w-4" />
          <span>القرآن الكريم</span>
        </Link>
      </div>
    </div>
  );
}
