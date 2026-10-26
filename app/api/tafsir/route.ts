import { NextRequest, NextResponse } from "next/server";
import {
  getAyahAllTafsirs,
  getSurahTafsirData,
  getTafsirBookMeta,
} from "@/lib/tafsir";
import { TafsirBookSlug } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "surah";
    const surahId = parseInt(searchParams.get("surah") || "1", 10) || 1;
    const rawAyah = searchParams.get("ayah");
    const ayahNumber =
      rawAyah && rawAyah !== "" && rawAyah !== "all"
        ? parseInt(rawAyah, 10)
        : null;

    if (mode === "compare") {
      const compareData = getAyahAllTafsirs(surahId, ayahNumber || 1);
      return NextResponse.json(compareData);
    }

    const rawBook = searchParams.get("book") || "muyassar";
    const tafsirSlug: TafsirBookSlug =
      getTafsirBookMeta(rawBook)?.slug || "muyassar";
    const query = searchParams.get("q") || "";

    const data = getSurahTafsirData({
      tafsirSlug,
      surahId,
      ayahNumber: Number.isNaN(ayahNumber as number) ? null : ayahNumber,
      query,
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error("Tafsir API Error:", err);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب تفسير القرآن الكريم" },
      { status: 500 }
    );
  }
}
