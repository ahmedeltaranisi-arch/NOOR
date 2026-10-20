import type { Metadata } from "next";
import { AdhkarExplorerClient } from "@/components/adhkar/AdhkarExplorerClient";

export const metadata: Metadata = {
  title: "أذكار المسلم والأدعية النبوية الموثقة — حصن المسلم",
  description:
    "أذكار الصباح والمساء، أذكار بعد الصلاة، أذكار النوم والاستيقاظ، والأدعية النبوية والقرآنية الصحيحة مع عداد تفاعلي وحفظ التقدم اليومي.",
};

export default function AdhkarPage() {
  return <AdhkarExplorerClient initialCategory="morning" />;
}
