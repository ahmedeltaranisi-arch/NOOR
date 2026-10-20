import type { Metadata } from "next";
import { AdhkarExplorerClient } from "@/components/adhkar/AdhkarExplorerClient";

export const metadata: Metadata = {
  title: "أذكار المساء كاملة ومكتوبة مع عداد تفاعلي — حصن المسلم",
  description:
    "اقرأ أذكار المساء الصحيحة كاملة بالتشكيل مع عدد مرات التكرار والفضل والمصدر من حصن المسلم، مع عداد إلكتروني وحفظ التقدم اليومي.",
};

export default function EveningAdhkarPage() {
  return <AdhkarExplorerClient initialCategory="evening" lockedCategory="evening" />;
}
