import type { Metadata } from "next";
import { ElectronicTasbeehClient } from "@/components/tasbeeh/ElectronicTasbeehClient";

export const metadata: Metadata = {
  title: "المسبحة الإلكترونية التفاعلية — عداد التسبيح والأذكار اليومية",
  description:
    "مسبحة إلكترونية أنيقة وسهلة الاستخدام بيد واحدة، مع دعم الاهتزاز، قائمة بالأذكار المأثورة، إضافة ذكر مخصص، وحفظ إحصائيات التسبيح اليومية.",
};

export default function TasbeehPage() {
  return <ElectronicTasbeehClient />;
}
