import type { Metadata } from "next";
import { AdhkarExplorerClient } from "@/components/adhkar/AdhkarExplorerClient";

export const metadata: Metadata = {
  title: "أذكار الصباح كاملة ومكتوبة مع عداد تفاعلي — حصن المسلم",
  description:
    "اقرأ أذكار الصباح الصحيحة كاملة بالتشكيل مع عدد مرات التكرار والفضل والمصدر من حصن المسلم، مع عداد إلكتروني وحفظ التقدم اليومي.",
};

export default function MorningAdhkarPage() {
  return <AdhkarExplorerClient initialCategory="morning" lockedCategory="morning" />;
}
