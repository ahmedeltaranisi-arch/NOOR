import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Header } from "@/components/navigation/Header";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { Footer } from "@/components/layout/Footer";
import { PrayerAlertWatcher } from "@/components/prayer/PrayerAlertWatcher";
import { getSiteUrl } from "@/lib/utils";

const cairoFont = localFont({
  src: [
    { path: "./fonts/cairo-arabic-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/cairo-arabic-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/cairo-arabic-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/cairo-arabic-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/cairo-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/cairo-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/cairo-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-cairo",
  display: "swap",
});

const amiriFont = localFont({
  src: [
    { path: "./fonts/amiri-arabic-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/amiri-arabic-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-amiri",
  display: "swap",
});

const amiriQuranFont = localFont({
  src: [{ path: "./fonts/amiri-quran-arabic-400-normal.woff2", weight: "400", style: "normal" }],
  variable: "--font-amiri-quran",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "نور | NOOR — المنصة الإسلامية المتكاملة لمصر (مواقيت الصلاة، القبلة، القرآن، الأذكار)",
    template: "%s | نور — NOOR",
  },
  description:
    "منصة نور الإسلامية المتكاملة لجمهورية مصر العربية: مواقيت الصلاة الدقيقة في جميع المحافظات الـ 27 وفق الهيئة المصرية العامة للمساحة، بوصلة القبلة، القرآن الكريم كاملًا بالرسم العثماني وورد القراءة، أذكار الصباح والمساء، والمسبحة الإلكترونية.",
  keywords: [
    "مواقيت الصلاة في مصر",
    "مواقيت الصلاة القاهرة",
    "مواقيت الصلاة دمياط",
    "مواقيت الصلاة الإسكندرية",
    "اتجاه القبلة",
    "القرآن الكريم",
    "أذكار الصباح والمساء",
    "المسبحة الإلكترونية",
    "الهيئة المصرية العامة للمساحة",
    "التقويم الهجري",
    "نور",
    "NOOR",
  ],
  authors: [{ name: "NOOR Islamic Platform" }],
  openGraph: {
    type: "website",
    locale: "ar_EG",
    title: "نور | NOOR — المنصة الإسلامية المتكاملة لجمهورية مصر العربية",
    description:
      "مواقيت الصلاة في جميع محافظات مصر الـ 27، اتجاه القبلة، القرآن الكريم كاملًا بالرسم العثماني وورد القراءة، والأذكار اليومية الموثقة.",
    siteName: "نور | NOOR",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF8F3" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1512" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

const themeInitScript = `
(function() {
  try {
    var mode = localStorage.getItem('noor_theme');
    var supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (mode === 'dark' || (!mode || mode === 'system') && supportDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${cairoFont.variable} ${amiriFont.variable} ${amiriQuranFont.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-screen w-full max-w-[100vw] flex-col overflow-x-hidden bg-background font-sans text-foreground">
        <ThemeProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:right-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-primary-foreground"
          >
            تخطي إلى المحتوى الرئيسي
          </a>
          <Header />
          <main
            id="main-content"
            className="mx-auto w-full max-w-7xl flex-1 overflow-x-hidden px-3.5 pt-4 sm:px-6 sm:pt-6 lg:px-8"
          >
            {children}
          </main>
          <Footer />
          <MobileBottomNav />
          <PrayerAlertWatcher />
        </ThemeProvider>
      </body>
    </html>
  );
}
