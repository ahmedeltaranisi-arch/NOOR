import type { Metadata } from "next";
import { QiblaCompassView } from "@/components/qibla/QiblaCompassView";

export const metadata: Metadata = {
  title: "اتجاه القبلة بالبوصلة التفاعلية وأقرب المساجد في مصر",
  description:
    "حدد اتجاه القبلة بدقة بالدرجات من موقعك في أي محافظة أو مدينة مصرية باستخدام البوصلة التفاعلية ومستشعرات الجهاز، مع حساب المسافة للكعبة المشرفة وخريطة أقرب المساجد.",
};

export default function QiblaPage() {
  return <QiblaCompassView />;
}
