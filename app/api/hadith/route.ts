import { NextRequest, NextResponse } from "next/server";
import { getHadithBookMeta, queryHadiths } from "@/lib/hadith";
import { HadithBookSlug } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawBook = searchParams.get("book") || "bukhari";
    const bookSlug: HadithBookSlug | "all" =
      rawBook === "all"
        ? "all"
        : getHadithBookMeta(rawBook)?.slug || "bukhari";

    const rawChapter = searchParams.get("chapter");
    const chapterId =
      rawChapter !== null && rawChapter !== "" && rawChapter !== "all"
        ? parseInt(rawChapter, 10)
        : null;

    const rawHadithId = searchParams.get("hadithId");
    const hadithId =
      rawHadithId !== null && rawHadithId !== ""
        ? parseInt(rawHadithId, 10)
        : null;

    const query = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10) || 20;

    const result = queryHadiths({
      bookSlug,
      chapterId: Number.isNaN(chapterId as number) ? null : chapterId,
      hadithId: Number.isNaN(hadithId as number) ? null : hadithId,
      query,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Hadith API Error:", err);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب الأحاديث النبوية الشريفة" },
      { status: 500 }
    );
  }
}
