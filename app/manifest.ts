import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "نور | NOOR — المنصة الإسلامية المتكاملة لمصر",
    short_name: "نور | NOOR",
    description:
      "مواقيت الصلاة في جميع محافظات مصر الـ 27، اتجاه القبلة، القرآن الكريم بالرسم العثماني وورد القراءة، وأذكار الصباح والمساء.",
    start_url: "/",
    display: "standalone",
    dir: "rtl",
    lang: "ar",
    background_color: "#FAF8F3",
    theme_color: "#0D6B4B",
  };
}
