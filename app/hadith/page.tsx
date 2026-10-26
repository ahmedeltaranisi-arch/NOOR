import type { Metadata } from "next";
import { HadithExplorerClient } from "@/components/hadith/HadithExplorerClient";
import { queryHadiths } from "@/lib/hadith";

export const metadata: Metadata = {
  title: "موسوعة الأحاديث النبوية الشريفة — ٥٠,٧٥٩ حديثًا من ١٧ كتابًا | نور NOOR",
  description:
    "موسوعة الأحاديث النبوية الشريفة الكاملة عن رسول الله ﷺ: الكتب التسعة (صحيح البخاري، صحيح مسلم، سنن أبي داود، جامع الترمذي، سنن النسائي، سنن ابن ماجه، موطأ مالك، مسند أحمد، سنن الدارمي)، رياض الصالحين، بلوغ المرام، الأدب المفرد، مشكاة المصابيح، الشمائل المحمدية، والأربعون النووية والقدسية.",
};

export default function HadithPage() {
  const initialPageData = queryHadiths({
    bookSlug: "bukhari",
    page: 1,
    pageSize: 20,
  });

  const initialNawawiData = queryHadiths({
    bookSlug: "nawawi40",
    page: 1,
    pageSize: 50,
  });

  return (
    <div className="mx-auto max-w-7xl px-3.5 py-5 sm:px-6 sm:py-8 lg:px-8">
      <HadithExplorerClient
        initialPageData={initialPageData}
        initialNawawiData={initialNawawiData}
      />
    </div>
  );
}
