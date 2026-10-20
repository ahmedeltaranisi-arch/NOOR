"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CheckCircle2,
  Download,
  Info,
  MapPin,
  Palette,
  ShieldCheck,
  Sliders,
  Trash2,
  Volume2,
} from "lucide-react";
import { DEFAULT_USER_LOCATION } from "@/data/egypt-governorates";
import {
  CALCULATION_METHODS_META,
  DEFAULT_CALCULATION_SETTINGS,
  MADHAB_OPTIONS_META,
  PRAYER_NAMES_AR,
} from "@/lib/prayer-times";
import {
  clearAllLocalData,
  DEFAULT_PRAYER_NOTIFICATIONS,
  exportAllLocalData,
  getSavedLocation,
  getSavedPrayerNotifications,
  getSavedPrayerSettings,
  playNotificationTone,
  saveLocation,
  savePrayerNotifications,
  savePrayerSettings,
  STORAGE_CHANGE_EVENT,
} from "@/lib/storage/local-storage";
import { clearIndexedDBData } from "@/lib/storage/indexed-db";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LocationSelectorModal } from "@/components/prayer/LocationSelectorModal";
import { cn } from "@/lib/utils";
import {
  CalculationMethodId,
  MadhabId,
  NotificationToneId,
  PrayerCalculationSettings,
  PrayerId,
  PrayerNotificationSettings,
  SinglePrayerAlertConfig,
  UserLocation,
} from "@/types";

const TONE_OPTIONS: { id: NotificationToneId; labelAr: string }[] = [
  { id: "takbeer-echo", labelAr: "صدى التكبير الهادئ (مولد صوتيًا)" },
  { id: "spiritual-chime", labelAr: "رنين روحاني هادئ" },
  { id: "soft-bell", labelAr: "تنبيه جرس خفيف" },
  { id: "silent", labelAr: "صامت (إشعار مرئي فقط)" },
];

export function SettingsAndAlertsClient() {
  const [location, setLocation] = useState<UserLocation>(DEFAULT_USER_LOCATION);
  const [calcSettings, setCalcSettings] = useState<PrayerCalculationSettings>(
    DEFAULT_CALCULATION_SETTINGS
  );
  const [notifSettings, setNotifSettings] = useState<PrayerNotificationSettings>(
    DEFAULT_PRAYER_NOTIFICATIONS
  );
  const [browserPerm, setBrowserPerm] = useState<string>("default");
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setLocation(getSavedLocation());
    setCalcSettings(getSavedPrayerSettings());
    setNotifSettings(getSavedPrayerNotifications());

    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserPerm(window.Notification.permission);
    } else {
      setBrowserPerm("unsupported");
    }

    const sync = () => {
      setLocation(getSavedLocation());
      setCalcSettings(getSavedPrayerSettings());
      setNotifSettings(getSavedPrayerNotifications());
    };
    window.addEventListener(STORAGE_CHANGE_EVENT, sync);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, sync);
  }, []);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleRequestBrowserPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setBrowserPerm("unsupported");
      showToast("متصفحك الحالي لا يدعم إشعارات سطح المكتب/الهاتف.");
      return;
    }

    try {
      const perm = await window.Notification.requestPermission();
      setBrowserPerm(perm);
      const updated: PrayerNotificationSettings = {
        ...notifSettings,
        browserPermission: perm,
      };
      savePrayerNotifications(updated);
      setNotifSettings(updated);

      if (perm === "granted") {
        new window.Notification("منصة نور | NOOR الإسلامية", {
          body: "تم تفعيل إشعارات مواقيت الصلاة بنجاح!",
          lang: "ar",
          dir: "rtl",
        });
        playNotificationTone("spiritual-chime");
        showToast("تم تفعيل إشعارات المتصفح بنجاح!");
      } else {
        showToast("لم يتم منح إذن الإشعارات من المتصفح.");
      }
    } catch {
      showToast("تعذر طلب إذن الإشعارات في هذا المتصفح.");
    }
  };

  const updateSinglePrayerNotif = (
    prayerId: PrayerId,
    partial: Partial<SinglePrayerAlertConfig>
  ) => {
    const updated: PrayerNotificationSettings = {
      ...notifSettings,
      prayers: {
        ...notifSettings.prayers,
        [prayerId]: {
          ...notifSettings.prayers[prayerId],
          ...partial,
        },
      },
    };
    savePrayerNotifications(updated);
    setNotifSettings(updated);
  };

  const handleExportData = () => {
    const data = exportAllLocalData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `noor-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("تم تصدير نسخة احتياطية من بياناتك المحلية بنجاح.");
  };

  const handleClearAllData = async () => {
    clearAllLocalData();
    await clearIndexedDBData();
    setLocation(DEFAULT_USER_LOCATION);
    setCalcSettings(DEFAULT_CALCULATION_SETTINGS);
    setNotifSettings(DEFAULT_PRAYER_NOTIFICATIONS);
    setShowClearConfirm(false);
    showToast("تم حذف جميع البيانات والتفضيلات المحلية من جهازك بنجاح.");
  };

  return (
    <div className="space-y-8">
      {statusMessage && (
        <div
          role="status"
          className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-gold/40 bg-emerald-950 px-4 py-3 text-center text-xs font-bold text-white shadow-gold md:bottom-8"
        >
          {statusMessage}
        </div>
      )}

      {/* Clear Data Confirmation Modal */}
      {showClearConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="text-lg font-extrabold text-foreground">
              تأكيد حذف جميع البيانات المحلية
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              سيؤدي هذا الإجراء إلى مسح كافة إعداداتك المحفوظة محليًا (المحافظة المختارة، سجل ورد القرآن، العلامات المرجعية، تقدم الأذكار، وإحصائيات المسبحة) وإعادة الموقع إلى حالته الافتراضية.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-bold text-foreground"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleClearAllData}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
              >
                نعم، احذف بياناتي المحلية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary">
          <Sliders className="h-3.5 w-3.5" />
          <span>إدارة التنبيهات والتفضيلات والخصوصية</span>
        </div>
        <h1 className="mt-2 text-2xl font-extrabold text-foreground sm:text-3xl">
          إعدادات الموقع ونظام تنبيهات الصلاة
        </h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          خصص تنبيهات كل صلاة على حدة، وطريقة الحساب الفلكي، والمظهر، وإدارة بياناتك المحلية
        </p>
      </div>

      {/* SECTION 1: Prayer Notifications System */}
      <section className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-foreground">
                ١. نظام التنبيهات للصلوات الخمس والإقامة
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                إعدادات مستقلة لكل صلاة مع تنبيه قبل الأذان وتذكير بموعد الإقامة
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-bold">
              <input
                type="checkbox"
                checked={notifSettings.masterEnabled}
                onChange={(e) => {
                  const next = { ...notifSettings, masterEnabled: e.target.checked };
                  savePrayerNotifications(next);
                  setNotifSettings(next);
                }}
                className="h-4 w-4 accent-primary"
              />
              <span>تفعيل نظام التنبيهات العام</span>
            </label>

            <button
              type="button"
              onClick={handleRequestBrowserPermission}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
            >
              <Bell className="h-3.5 w-3.5" />
              <span>
                {browserPerm === "granted"
                  ? "إشعارات المتصفح مفعلة (تجربة)"
                  : "تفعيل إشعارات المتصفح"}
              </span>
            </button>
          </div>
        </div>

        {/* Browser Limitations Transparent Notice */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-950 dark:text-amber-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <strong>توضيح شفاف حول قيود متصفحات الويب: </strong>
              تعمل التنبيهات الصوتية وإشعارات الصلاة بدقة طالما أن تبويب الموقع مفتوح في المتصفح وبعد تفاعلك الأول مع الصفحة. تمنع متصفحات الهواتف والحواسيب الحديثة تشغيل الصوت تلقائيًا في الخلفية إذا تم إغلاق المتصفح بالكامل، حفاظًا على موارد الجهاز وخصوصية المستخدم.
            </div>
          </div>
        </div>

        {/* Independent Settings per Prayer */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as PrayerId[]).map(
            (prayerId) => {
              const cfg = notifSettings.prayers[prayerId];
              const isSunrise = prayerId === "sunrise";

              return (
                <div
                  key={prayerId}
                  className={cn(
                    "rounded-2xl border p-4 transition",
                    cfg.enabled
                      ? "border-primary/30 bg-background/80"
                      : "border-border bg-muted/20 opacity-75"
                  )}
                >
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`toggle-${prayerId}`}
                        checked={cfg.enabled}
                        onChange={(e) =>
                          updateSinglePrayerNotif(prayerId, {
                            enabled: e.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-primary"
                      />
                      <label
                        htmlFor={`toggle-${prayerId}`}
                        className="cursor-pointer text-base font-extrabold text-foreground"
                      >
                        {isSunrise ? "وقت الشروق" : `صلاة ${PRAYER_NAMES_AR[prayerId]}`}
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => playNotificationTone(cfg.tone)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-muted"
                    >
                      <Volume2 className="h-3 w-3" />
                      <span>معاينة الصوت</span>
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {/* Pre-prayer alert */}
                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                        التنبيه قبل الموعد
                      </label>
                      <select
                        value={cfg.preAlertMinutes}
                        onChange={(e) =>
                          updateSinglePrayerNotif(prayerId, {
                            preAlertMinutes: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-bold text-foreground"
                      >
                        <option value={0}>بدون تنبيه مسبق</option>
                        <option value={5}>قبل ٥ دقائق</option>
                        <option value={10}>قبل ١٠ دقائق</option>
                        <option value={15}>قبل ١٥ دقيقة</option>
                        <option value={20}>قبل ٢٠ دقيقة</option>
                        <option value={30}>قبل ٣٠ دقيقة</option>
                      </select>
                    </div>

                    {/* Iqamah reminder */}
                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                        تذكير الإقامة
                      </label>
                      <select
                        disabled={isSunrise}
                        value={isSunrise ? 0 : cfg.iqamahMinutes}
                        onChange={(e) =>
                          updateSinglePrayerNotif(prayerId, {
                            iqamahMinutes: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-bold text-foreground disabled:opacity-40"
                      >
                        <option value={0}>غير مفعل</option>
                        <option value={10}>بعد ١٠ دقائق</option>
                        <option value={15}>بعد ١٥ دقيقة</option>
                        <option value={20}>بعد ٢٠ دقيقة</option>
                        <option value={30}>بعد ٣٠ دقيقة</option>
                      </select>
                    </div>

                    {/* Tone choice */}
                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                        نغمة التنبيه
                      </label>
                      <select
                        value={cfg.tone}
                        onChange={(e) =>
                          updateSinglePrayerNotif(prayerId, {
                            tone: e.target.value as NotificationToneId,
                          })
                        }
                        className="w-full rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-bold text-foreground"
                      >
                        {TONE_OPTIONS.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.labelAr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </section>

      {/* SECTION 2: Location, Calculation Method & Theme */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Location & Calculation */}
        <section className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2.5">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-extrabold text-foreground">
              ٢. إعدادات المحافظة وطريقة الحساب
            </h2>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border bg-background/60 p-4">
            <div>
              <span className="text-xs text-muted-foreground">الموقع الحالي المختار</span>
              <p className="mt-0.5 text-sm font-extrabold text-foreground">
                محافظة {location.governorateNameAr} — {location.cityNameAr}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground"
            >
              تغيير الموقع
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-foreground">
              طريقة حساب مواقيت الصلاة
            </label>
            <select
              value={calcSettings.method}
              onChange={(e) => {
                const updated: PrayerCalculationSettings = {
                  ...calcSettings,
                  method: e.target.value as CalculationMethodId,
                };
                savePrayerSettings(updated);
                setCalcSettings(updated);
                showToast("تم حفظ طريقة حساب المواقيت.");
              }}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-bold text-foreground sm:text-sm"
            >
              {CALCULATION_METHODS_META.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nameAr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-foreground">
              المذهب الفقهي لحساب العصر
            </label>
            <select
              value={calcSettings.madhab}
              onChange={(e) => {
                const updated: PrayerCalculationSettings = {
                  ...calcSettings,
                  madhab: e.target.value as MadhabId,
                };
                savePrayerSettings(updated);
                setCalcSettings(updated);
                showToast("تم حفظ مذهب حساب العصر.");
              }}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-bold text-foreground sm:text-sm"
            >
              {MADHAB_OPTIONS_META.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nameAr}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Appearance & Privacy Management */}
        <section className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2.5">
            <Palette className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-extrabold text-foreground">
              ٣. المظهر والخصوصية والبيانات المحلية
            </h2>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 p-4">
            <div>
              <div className="text-sm font-bold text-foreground">وضع الألوان والمظهر</div>
              <p className="text-xs text-muted-foreground">
                اختر بين الوضع النهاري المريح، الليلي الهادئ، أو التلقائي
              </p>
            </div>
            <ThemeToggle showLabels />
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs leading-relaxed text-foreground">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <strong>سياسة الخصوصية واستخدام الموقع الجغرافي: </strong>
                لا يشترط موقع <strong>نور | NOOR</strong> إنشاء حساب أو تسجيل دخول. لا يتم طلب موقعك الجغرافي (GPS) إلا عند ضغطك يدويًا على زر «تحديد موقعي الحالي»، وتُستخدم الإحداثيات محليًا داخل متصفحك فقط لحساب مواقيت الصلاة واتجاه القبلة دون إرسالها لأي خادم خارجي.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleExportData}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted"
            >
              <Download className="h-4 w-4 text-primary" />
              <span>تصدير نسخة احتياطية (JSON)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-500/20 dark:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
              <span>حذف جميع البيانات المحلية</span>
            </button>
          </div>
        </section>
      </div>

      {/* SECTION 4: Documentation of Sources & Calculation Methodology */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-extrabold text-foreground">
            ٤. توثيق المصادر الشرعية والعلمية وطريقة الحساب
          </h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 text-xs leading-relaxed text-muted-foreground md:grid-cols-3">
          <div className="rounded-2xl border border-border/80 bg-background/60 p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>مواقيت الصلاة والقبلة</span>
            </h3>
            <p className="mt-1.5">
              تُحسب فلكيًا عبر مكتبة <code>Adhan</code> المعتمدة على معادلات جان ميوس الفلكية (Jean Meeus Astronomical Algorithms)، مع ضبط <strong>الهيئة المصرية العامة للمساحة</strong> افتراضيًا (زاوية الفجر 19.5°، زاوية العشاء 17.5°، ومذهب الجمهور للعصر).
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-background/60 p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>النص القرآني والتلاوات</span>
            </h3>
            <p className="mt-1.5">
              النص القرآني الكامل (114 سورة - 6236 آية) مضمن محليًا بالرسم العثماني الموافق لمصحف المدينة النبوية ومشروع <code>Tanzil / Quran-JSON</code>، والتلاوات الصوتية عبر شبكة <code>EveryAyah</code> الموثوقة لكبار قراء مصر والعالم الإسلامي.
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-background/60 p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>الأذكار والأحاديث النبوية</span>
            </h3>
            <p className="mt-1.5">
              جميع الأذكار والأدعية مأخوذة بنصها وتشكيلها وعدد تكرارها من كتاب <strong>«حصن المسلم من أذكار الكتاب والسنة»</strong> للشيخ د. سعيد بن علي بن وهف القحطاني، والأحاديث اليومية مخرجة من صحيحي البخاري ومسلم.
            </p>
          </div>
        </div>
      </section>

      <LocationSelectorModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={location}
        onSelectLocation={(loc) => {
          saveLocation(loc);
          setLocation(loc);
          showToast(`تم تغيير الموقع إلى: ${loc.governorateNameAr} - ${loc.cityNameAr}`);
        }}
      />
    </div>
  );
}
