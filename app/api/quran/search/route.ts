import { NextRequest, NextResponse } from "next/server";
import { searchQuranVerses } from "@/lib/quran";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const limitParam = parseInt(searchParams.get("limit") || "35", 10);
  const limit = Number.isNaN(limitParam) ? 35 : Math.min(100, Math.max(1, limitParam));

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [], query: q });
  }

  const results = searchQuranVerses(q, limit);
  return NextResponse.json({ results, query: q });
}
