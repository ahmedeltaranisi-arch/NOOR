"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, Home, RotateCcw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto my-16 max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-soft">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
        <AlertCircle className="h-7 w-7" />
      </div>
      <h1 className="mt-4 text-xl font-extrabold text-foreground">
        عذرًا، حدث خطأ غير متوقع أثناء عرض الصفحة
      </h1>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {error?.message || "يرجى المحاولة مرة أخرى أو العودة إلى الصفحة الرئيسية."}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"
        >
          <RotateCcw className="h-4 w-4" />
          <span>إعادة المحاولة</span>
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted"
        >
          <Home className="h-4 w-4" />
          <span>العودة للرئيسية</span>
        </Link>
      </div>
    </div>
  );
}
