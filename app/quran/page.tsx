import type { Metadata } from "next";
import { SURAHS_META } from "@/lib/quran/metadata";
import { QuranIndexClient } from "@/components/quran/QuranIndexClient";

export const metadata: Metadata = {
  title: "القرآن الكريم كاملًا بالرسم العثماني وورد القراءة اليومي",
  description:
    "تصفح سور القرآن الكريم الـ 114 بالرسم العثماني الكامل مع التشكيل، البحث الفوري في الآيات، الاستماع لتلاوات كبار القراء، ومتابعة ورد القرآن اليومي والأسبوعي.",
};

export default function QuranIndexPage() {
  return <QuranIndexClient surahs={SURAHS_META} />;
}
