import type { Metadata } from "next";
import { SettingsAndAlertsClient } from "@/components/prayer/SettingsAndAlertsClient";

export const metadata: Metadata = {
  title: "إعدادات الموقع ونظام تنبيهات الصلاة والخصوصية",
  description:
    "إدارة تنبيهات الصلوات الخمس والإقامة، اختيار طريقة الحساب الفلكي والمحافظة، تغيير المظهر (نهاري/ليلي)، وإدارة البيانات المحلية.",
};

export default function SettingsPage() {
  return <SettingsAndAlertsClient />;
}
