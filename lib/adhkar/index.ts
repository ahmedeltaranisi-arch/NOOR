import { ADHKAR_CATEGORIES, ADHKAR_DATA } from "@/data/adhkar";
import { AdhkarCategoryId, AdhkarCategoryMeta, DhikrItem } from "@/types";
import { normalizeArabicText } from "@/lib/utils";

export function getAdhkarByCategory(category: AdhkarCategoryId): DhikrItem[] {
  return ADHKAR_DATA.filter((item) => item.category === category);
}

export function getCategoryMeta(category: AdhkarCategoryId): AdhkarCategoryMeta | undefined {
  return ADHKAR_CATEGORIES.find((c) => c.id === category);
}

export function searchAdhkar(query: string): DhikrItem[] {
  const normalized = normalizeArabicText(query);
  if (!normalized) return ADHKAR_DATA;
  return ADHKAR_DATA.filter(
    (item) =>
      normalizeArabicText(item.text).includes(normalized) ||
      (item.titleAr && normalizeArabicText(item.titleAr).includes(normalized)) ||
      normalizeArabicText(item.sourceAr).includes(normalized)
  );
}
