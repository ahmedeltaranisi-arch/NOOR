"use client";

import React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme, ThemeMode } from "./ThemeProvider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ showLabels = false }: { showLabels?: boolean }) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (!showLabels) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={resolvedTheme === "dark" ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي"}
        title={resolvedTheme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/80 text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {resolvedTheme === "dark" ? (
          <Sun className="h-5 w-5 text-gold" />
        ) : (
          <Moon className="h-5 w-5 text-primary" />
        )}
      </button>
    );
  }

  const options: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { id: "light", label: "نهاري", icon: <Sun className="h-4 w-4" /> },
    { id: "dark", label: "ليلي", icon: <Moon className="h-4 w-4" /> },
    { id: "system", label: "تلقائي", icon: <Monitor className="h-4 w-4" /> },
  ];

  return (
    <div
      role="group"
      aria-label="اختيار مظهر الموقع"
      className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/60 p-1"
    >
      {options.map((opt) => {
        const active = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
