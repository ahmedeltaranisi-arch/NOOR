import type { Metadata } from "next";
import { CalendarAndToolsClient } from "@/components/calendar/CalendarAndToolsClient";

export const metadata: Metadata = {
  title: "التقويم الهجري والمناسبات الإسلامية وأسماء الله الحسنى وحاسبة الزكاة",
  description:
    "التقويم الهجري والميلادي لجمهورية مصر العربية، مواعيد المناسبات والأعياد الإسلامية، أسماء الله الحسنى الـ 99 ومعانيها الموثقة، وحاسبة الزكاة التقديرية.",
};

export default function CalendarPage() {
  return <CalendarAndToolsClient />;
}
