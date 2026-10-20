import type { Metadata } from "next";
import { PrayerTimesExplorer } from "@/components/prayer/PrayerTimesExplorer";

export const metadata: Metadata = {
  title: "مواقيت الصلاة في جميع محافظات مصر الـ 27 — جدول اليوم والشهر",
  description:
    "مواقيت الصلاة الدقيقة في جميع محافظات ومدن ومراكز جمهورية مصر العربية (القاهرة، الجيزة، الإسكندرية، الدقهلية، دمياط، الشرقية، الصعيد، سيناء) وفق الهيئة المصرية العامة للمساحة مع إمساكية الشهر الكامل.",
};

export default function PrayerTimesPage() {
  return <PrayerTimesExplorer />;
}
