import type { Metadata } from "next";
import { RamadanHubClient } from "@/components/ramadan/RamadanHubClient";

export const metadata: Metadata = {
  title:
    "شهر رمضان المبارك — إمساكية الـ ٢٧ محافظة، ختمة الـ ٣٠ جزءًا، والأدعية | نور NOOR",
  description:
    "واحة شهر رمضان المبارك الكاملة لجمهورية مصر العربية: إمساكية شهر رمضان (٣٠ يومًا) لجميع محافظات مصر الـ ٢٧ وفق الهيئة المصرية العامة للمساحة، مواعيد السحور والإمساك والفجر والمغرب، جدول ختمة القرآن الكريم (٣٠ جزءًا)، أدعية الإفطار وليلة القدر، وجدول الطاعات وزكاة الفطر.",
};

interface RamadanPageProps {
  searchParams?: Promise<{
    tab?: string;
  }>;
}

export default async function RamadanPage({ searchParams }: RamadanPageProps) {
  const resolved = searchParams ? await searchParams : {};
  const initialTab =
    resolved.tab === "khatmah"
      ? "khatmah"
      : resolved.tab === "duas"
      ? "duas"
      : resolved.tab === "tracker"
      ? "tracker"
      : "imsakiyah";

  return (
    <div className="mx-auto max-w-7xl px-3.5 py-5 sm:px-6 sm:py-8 lg:px-8">
      <RamadanHubClient initialTab={initialTab} />
    </div>
  );
}
