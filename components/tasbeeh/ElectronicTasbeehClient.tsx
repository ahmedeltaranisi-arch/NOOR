"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Plus,
  RotateCcw,
  Smartphone,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { DEFAULT_TASBEEH_PHRASES } from "@/data/adhkar";
import {
  DEFAULT_TASBEEH_STATE,
  getTasbeehState,
  saveTasbeehState,
  STORAGE_CHANGE_EVENT,
} from "@/lib/storage/local-storage";
import { logSpiritualActivity } from "@/lib/storage/indexed-db";
import { getLocalDateKey, toArabicDigits, cn } from "@/lib/utils";
import { TasbeehPhrase, TasbeehState } from "@/types";

export function ElectronicTasbeehClient() {
  const [state, setState] = useState<TasbeehState>(DEFAULT_TASBEEH_STATE);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customText, setCustomText] = useState("");
  const [customVirtue, setCustomVirtue] = useState("");
  const [customTarget, setCustomTarget] = useState(33);

  useEffect(() => {
    setState(getTasbeehState());
    const sync = () => setState(getTasbeehState());
    window.addEventListener(STORAGE_CHANGE_EVENT, sync);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, sync);
  }, []);

  const allPhrases: TasbeehPhrase[] = useMemo(
    () => [...DEFAULT_TASBEEH_PHRASES, ...(state.customPhrases || [])],
    [state.customPhrases]
  );

  const activePhrase: TasbeehPhrase = useMemo(
    () =>
      allPhrases.find((p) => p.id === state.activePhraseId) ||
      DEFAULT_TASBEEH_PHRASES[0],
    [allPhrases, state.activePhraseId]
  );

  const todayKey = getLocalDateKey();
  const todayStats = state.dailyHistory?.[todayKey] || {
    total: 0,
    byPhrase: {},
  };

  const progressPercent = Math.min(
    100,
    Math.round((state.currentCount / Math.max(1, state.targetCount)) * 100)
  );

  const handleIncrement = async () => {
    const nextCount = state.currentCount + 1;
    let nextCycles = state.cyclesCompleted;
    let effectiveCount = nextCount;

    const reachedTarget = nextCount === state.targetCount;
    if (nextCount > state.targetCount) {
      effectiveCount = 1;
      nextCycles += 1;
    } else if (reachedTarget) {
      nextCycles += 1;
    }

    // Vibration feedback if enabled & supported
    if (
      state.vibrateEnabled &&
      typeof navigator !== "undefined" &&
      "vibrate" in navigator
    ) {
      try {
        navigator.vibrate(reachedTarget ? [40, 60, 80] : 18);
      } catch {
        // ignore
      }
    }

    const updatedTodayTotal = todayStats.total + 1;
    const updatedByPhrase = {
      ...todayStats.byPhrase,
      [activePhrase.id]: (todayStats.byPhrase[activePhrase.id] || 0) + 1,
    };

    const nextState: TasbeehState = {
      ...state,
      currentCount: effectiveCount,
      cyclesCompleted: nextCycles,
      lifetimeTotal: (state.lifetimeTotal || 0) + 1,
      dailyHistory: {
        ...state.dailyHistory,
        [todayKey]: {
          total: updatedTodayTotal,
          byPhrase: updatedByPhrase,
        },
      },
    };

    saveTasbeehState(nextState);
    setState(nextState);

    if (reachedTarget) {
      await logSpiritualActivity({
        dateKey: todayKey,
        type: "tasbeeh-milestone",
        titleAr: `إتمام دورة تسبيح (${state.targetCount})`,
        detailsAr: activePhrase.text,
      });
    }
  };

  const handleConfirmReset = () => {
    const nextState: TasbeehState = {
      ...state,
      currentCount: 0,
      cyclesCompleted: 0,
    };
    saveTasbeehState(nextState);
    setState(nextState);
    setShowResetConfirm(false);
  };

  const handleSelectPhrase = (phrase: TasbeehPhrase) => {
    const nextState: TasbeehState = {
      ...state,
      activePhraseId: phrase.id,
      targetCount: phrase.recommendedTarget || 33,
      currentCount: 0,
    };
    saveTasbeehState(nextState);
    setState(nextState);
  };

  const handleAddCustomPhrase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;

    const newPhrase: TasbeehPhrase = {
      id: `custom-${Date.now()}`,
      text: customText.trim(),
      virtueAr: customVirtue.trim() || "ذكر مخصص",
      recommendedTarget: Math.max(1, customTarget),
      isCustom: true,
    };

    const nextState: TasbeehState = {
      ...state,
      activePhraseId: newPhrase.id,
      targetCount: newPhrase.recommendedTarget,
      currentCount: 0,
      customPhrases: [...(state.customPhrases || []), newPhrase],
    };

    saveTasbeehState(nextState);
    setState(nextState);
    setCustomText("");
    setCustomVirtue("");
    setShowAddCustom(false);
  };

  const handleDeleteCustomPhrase = (id: string) => {
    const filtered = (state.customPhrases || []).filter((p) => p.id !== id);
    const nextState: TasbeehState = {
      ...state,
      customPhrases: filtered,
      activePhraseId:
        state.activePhraseId === id ? DEFAULT_TASBEEH_PHRASES[0].id : state.activePhraseId,
    };
    saveTasbeehState(nextState);
    setState(nextState);
  };

  // SVG Ring Parameters
  const radius = 112;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (progressPercent / 100) * circumference;

  return (
    <div className="space-y-8">
      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <h3 id="reset-modal-title" className="text-lg font-extrabold text-foreground">
              تأكيد تصفير عداد التسبيح الحالي
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              هل أنت متأكد من رغبتك في إعادة العداد الحالي ({toArabicDigits(state.currentCount)}) إلى الصفر؟ سيظل إجمالي تسبيحاتك اليومية محفوظًا في الإحصائيات.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-bold text-foreground hover:bg-muted"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
              >
                نعم، تصفير العداد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Ergonomic Tasbeeh Counter + Phrases & Daily Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left/Center: One-Handed Interactive Tasbeeh */}
        <div className="flex flex-col items-center justify-between rounded-3xl border border-border bg-card p-6 shadow-soft lg:col-span-7 sm:p-8">
          {/* Top Bar: Vibration & Reset */}
          <div className="flex w-full items-center justify-between">
            <button
              type="button"
              onClick={() => {
                const updated = { ...state, vibrateEnabled: !state.vibrateEnabled };
                saveTasbeehState(updated);
                setState(updated);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition",
                state.vibrateEnabled
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground"
              )}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>الاهتزاز: {state.vibrateEnabled ? "مفعل" : "متوقف"}</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-gold-muted px-3 py-1 text-xs font-bold text-gold">
                الدورات المكتملة: {toArabicDigits(state.cyclesCompleted)}
              </span>
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                aria-label="إعادة تعيين العداد"
                className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-muted-foreground hover:border-red-500/40 hover:text-red-600"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>تصفير</span>
              </button>
            </div>
          </div>

          {/* Active Phrase Display */}
          <div className="my-5 w-full rounded-2xl border border-gold/30 bg-background/70 p-5 text-center">
            <p className="font-serif text-2xl font-bold leading-relaxed text-foreground sm:text-3xl">
              {activePhrase.text}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{activePhrase.virtueAr}</p>
          </div>

          {/* Giant One-Handed Tap Circle Button */}
          <div className="relative my-3 flex items-center justify-center">
            <svg className="h-64 w-64 -rotate-90 transform sm:h-72 sm:w-72" viewBox="0 0 256 256">
              <circle
                cx="128"
                cy="128"
                r={radius}
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-muted"
              />
              <circle
                cx="128"
                cy="128"
                r={radius}
                stroke="currentColor"
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="text-primary transition-all duration-200"
              />
            </svg>

            <button
              type="button"
              onClick={handleIncrement}
              aria-label="اضغط للتسبيح وزيادة العداد"
              className="group absolute flex h-52 w-52 flex-col items-center justify-center rounded-full bg-gradient-to-b from-primary to-emerald-900 text-primary-foreground shadow-xl transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold sm:h-56 sm:w-56"
            >
              <span className="text-xs font-semibold text-emerald-200">
                اضغط هنا للتسبيح
              </span>
              <span className="my-1 font-mono text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
                {toArabicDigits(state.currentCount)}
              </span>
              <span className="rounded-full bg-black/25 px-3 py-0.5 text-xs font-bold text-gold">
                الهدف: {toArabicDigits(state.targetCount)}
              </span>
            </button>
          </div>

          {/* Target Count Selector */}
          <div className="mt-4 flex w-full flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
              <Target className="h-3.5 w-3.5 text-primary" />
              <span>العدد المستهدف:</span>
            </span>
            {[33, 99, 100, 1000].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  const updated = { ...state, targetCount: t };
                  saveTasbeehState(updated);
                  setState(updated);
                }}
                className={cn(
                  "rounded-xl px-3.5 py-1.5 text-xs font-bold transition",
                  state.targetCount === t
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border bg-background text-muted-foreground hover:text-foreground"
                )}
              >
                {toArabicDigits(t)}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Phrase Selector, Custom Dhikr & Daily Statistics */}
        <div className="space-y-6 lg:col-span-5">
          {/* Daily & Total Stats Card */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-extrabold text-foreground">
                إحصائيات التسبيح اليومية
              </h2>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
                <span className="text-xs text-muted-foreground">تسبيحات اليوم</span>
                <p className="mt-1 text-2xl font-extrabold text-primary">
                  {toArabicDigits(todayStats.total)}
                </p>
              </div>
              <div className="rounded-2xl border border-gold/30 bg-gold-muted/40 p-3.5">
                <span className="text-xs text-muted-foreground">الإجمالي التراكمي</span>
                <p className="mt-1 text-2xl font-extrabold text-gold">
                  {toArabicDigits(state.lifetimeTotal || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Phrases List & Custom Dhikr */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-extrabold text-foreground">
                  قائمة الأذكار والتسبيحات
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustom((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
              >
                {showAddCustom ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                <span>{showAddCustom ? "إغلاق" : "إضافة ذكر مخصص"}</span>
              </button>
            </div>

            {/* Add Custom Dhikr Form */}
            {showAddCustom && (
              <form
                onSubmit={handleAddCustomPhrase}
                className="mt-4 space-y-3 rounded-2xl border border-primary/30 bg-muted/40 p-4"
              >
                <div>
                  <label className="mb-1 block text-xs font-bold text-foreground">
                    نص الذكر أو الدعاء المخصص
                  </label>
                  <input
                    type="text"
                    required
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="مثال: سبحان الله وبحمده..."
                    className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-foreground">
                      العدد المستهدف
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={customTarget}
                      onChange={(e) => setCustomTarget(Number(e.target.value || 33))}
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold text-foreground"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-foreground">
                      ملاحظة / الفضل (اختياري)
                    </label>
                    <input
                      type="text"
                      value={customVirtue}
                      onChange={(e) => setCustomVirtue(e.target.value)}
                      placeholder="ذكر يومي"
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground"
                >
                  حفظ واختيار الذكر
                </button>
              </form>
            )}

            <div className="mt-4 max-h-[380px] space-y-2 overflow-y-auto pl-1">
              {allPhrases.map((phrase) => {
                const isSelected = phrase.id === activePhrase.id;
                const phraseCountToday = todayStats.byPhrase?.[phrase.id] || 0;

                return (
                  <div
                    key={phrase.id}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-2xl border p-3.5 transition-all",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background/60 hover:border-primary/40"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectPhrase(phrase)}
                      className="flex-1 text-right"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-base font-bold text-foreground">
                          {phrase.text}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>الهدف المقترح: {toArabicDigits(phrase.recommendedTarget)}</span>
                        <span>•</span>
                        <span>اليوم: {toArabicDigits(phraseCountToday)} مرة</span>
                      </div>
                    </button>

                    {phrase.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomPhrase(phrase.id)}
                        aria-label="حذف الذكر المخصص"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
