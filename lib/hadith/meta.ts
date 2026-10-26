import { HadithBookMeta, HadithBookSlug } from "@/types";

export const TOTAL_HADITHS_COUNT = 50759;
export const TOTAL_HADITH_BOOKS_COUNT = 17;
export const TOTAL_HADITH_CHAPTERS_COUNT = 607;

export const HADITH_BOOKS_META: HadithBookMeta[] = [
  // 1. الكتب التسعة (الأمهات)
  {
    slug: "bukhari",
    titleAr: "صحيح البخاري (الجامع المسند الصحيح)",
    shortTitleAr: "صحيح البخاري",
    authorAr: "الإمام محمد بن إسماعيل البخاري (٢٥٦ هـ)",
    categoryAr: "الكتب التسعة (الأمهات)",
    descriptionAr:
      "أصح كتاب بعد كتاب الله تعالى، جمع فيه الإمام البخاري الأحاديث الصحيحة المسندة المتصلة إلى رسول الله ﷺ مرتبةً على الأبواب الفقهية.",
    gradeBadgeAr: "صحيح باتفاق الأمة",
    totalHadiths: 7277,
    totalChapters: 97,
  },
  {
    slug: "muslim",
    titleAr: "صحيح مسلم (المسند الصحيح المختصر)",
    shortTitleAr: "صحيح مسلم",
    authorAr: "الإمام مسلم بن الحجاج النيسابوري (٢٦١ هـ)",
    categoryAr: "الكتب التسعة (الأمهات)",
    descriptionAr:
      "ثاني الصحيحين وأدقّها سياقاً وجمعاً لطرق الحديث في موضع واحد، تلقته الأمة بالقبول والتصحيح.",
    gradeBadgeAr: "صحيح باتفاق الأمة",
    totalHadiths: 7459,
    totalChapters: 57,
  },
  {
    slug: "abudawud",
    titleAr: "سنن أبي داود",
    shortTitleAr: "سنن أبي داود",
    authorAr: "الإمام أبو داود سليمان بن الأشعث السجستاني (٢٧٥ هـ)",
    categoryAr: "الكتب التسعة (الأمهات)",
    descriptionAr:
      "أول السنن الأربعة وأجمعها لأحاديث الأحكام الفقهية والعبادات والمعاملات التي استدل بها فقهاء الأمصار.",
    gradeBadgeAr: "من الكتب الستة",
    totalHadiths: 5276,
    totalChapters: 43,
  },
  {
    slug: "tirmidhi",
    titleAr: "جامع الترمذي (سنن الترمذي)",
    shortTitleAr: "جامع الترمذي",
    authorAr: "الإمام أبو عيسى محمد بن عيسى الترمذي (٢٧٩ هـ)",
    categoryAr: "الكتب التسعة (الأمهات)",
    descriptionAr:
      "الجامع الكبير في السنن والأحكام والفضائل والآداب والتفسير والمناقب مع بيان مذاهب الصحابة والفقهاء.",
    gradeBadgeAr: "من الكتب الستة",
    totalHadiths: 4053,
    totalChapters: 49,
  },
  {
    slug: "nasai",
    titleAr: "سنن النسائي (المجتبى من السنن)",
    shortTitleAr: "سنن النسائي",
    authorAr: "الإمام أحمد بن شعيب النسائي (٣٠٣ هـ)",
    categoryAr: "الكتب التسعة (الأمهات)",
    descriptionAr:
      "أشد السنن الأربعة شرطاً في الرجال وأقلها حديثاً ضعيفاً، مرتب بدقة فائقة على دقائق الفقه والعبادات.",
    gradeBadgeAr: "من الكتب الستة",
    totalHadiths: 5768,
    totalChapters: 52,
  },
  {
    slug: "ibnmajah",
    titleAr: "سنن ابن ماجه",
    shortTitleAr: "سنن ابن ماجه",
    authorAr: "الإمام محمد بن يزيد بن ماجه القزويني (٢٧٣ هـ)",
    categoryAr: "الكتب التسعة (الأمهات)",
    descriptionAr:
      "سادس الكتب الستة الأصول، يتميز بحسن التبويب والترتيب الفقهي والزهد والآداب النبوية.",
    gradeBadgeAr: "من الكتب الستة",
    totalHadiths: 4345,
    totalChapters: 38,
  },
  {
    slug: "malik",
    titleAr: "موطأ الإمام مالك",
    shortTitleAr: "موطأ مالك",
    authorAr: "إمام دار الهجرة مالك بن أنس الأصبحي (١٧٩ هـ)",
    categoryAr: "الكتب التسعة (الأمهات)",
    descriptionAr:
      "من أقدم وأجلّ دواوين السنة النبوية المشرفة، جمع فيه الإمام مالك أصحّ مرويات أهل المدينة وعمل الصحابة والتابعين.",
    gradeBadgeAr: "من الكتب التسعة",
    totalHadiths: 1860,
    totalChapters: 61,
  },
  {
    slug: "ahmed",
    titleAr: "مسند الإمام أحمد بن حنبل",
    shortTitleAr: "مسند أحمد",
    authorAr: "الإمام أحمد بن محمد بن حنبل الشيباني (٢٤١ هـ)",
    categoryAr: "الكتب التسعة (الأمهات)",
    descriptionAr:
      "أعظم دواوين السنة المسانيد، مرتب على مسانيد الصحابة الكرام رضي الله عنهم أجمعين.",
    gradeBadgeAr: "من الكتب التسعة",
    totalHadiths: 1374,
    totalChapters: 8,
  },
  {
    slug: "darimi",
    titleAr: "سنن الدارمي (مسند الدارمي)",
    shortTitleAr: "سنن الدارمي",
    authorAr: "الإمام عبد الله بن عبد الرحمن الدارمي (٢٥٥ هـ)",
    categoryAr: "الكتب التسعة (الأمهات)",
    descriptionAr:
      "تاسع الكتب التسعة المعتمدة، يفتتح بمقدمة عظيمة في فضل العلم والسنة وشمائل النبي ﷺ ثم كتب الأحكام والفضائل.",
    gradeBadgeAr: "من الكتب التسعة",
    totalHadiths: 3406,
    totalChapters: 24,
  },

  // 2. جوامع السنة والأخلاق والأحكام
  {
    slug: "riyad_assalihin",
    titleAr: "رياض الصالحين من كلام سيد المرسلين ﷺ",
    shortTitleAr: "رياض الصالحين",
    authorAr: "الإمام يحيى بن شرف النووي (٦٧٦ هـ)",
    categoryAr: "جوامع السنة والأخلاق والأحكام",
    descriptionAr:
      "أشهر كتاب جامع لأحاديث الأخلاق والرقائق والآداب والفضائل والترغيب والترهيب وتزكية النفوس.",
    gradeBadgeAr: "جامع الآداب والفضائل",
    totalHadiths: 1896,
    totalChapters: 20,
  },
  {
    slug: "bulugh_almaram",
    titleAr: "بلوغ المرام من أدلة الأحكام",
    shortTitleAr: "بلوغ المرام",
    authorAr: "الحافظ أحمد بن علي بن حجر العسقلاني (٨٥٢ هـ)",
    categoryAr: "جوامع السنة والأخلاق والأحكام",
    descriptionAr:
      "عمدة المتون الحديثية في أحاديث الأحكام الفقهية من الطهارة والصلاة إلى المعاملات والجامع في الآداب والبر.",
    gradeBadgeAr: "عمدة أحاديث الأحكام",
    totalHadiths: 1767,
    totalChapters: 16,
  },
  {
    slug: "aladab_almufrad",
    titleAr: "الأدب المفرد للإمام البخاري",
    shortTitleAr: "الأدب المفرد",
    authorAr: "الإمام محمد بن إسماعيل البخاري (٢٥٦ هـ)",
    categoryAr: "جوامع السنة والأخلاق والأحكام",
    descriptionAr:
      "كتاب مفرد صنّفه الإمام البخاري في الآداب الإسلامية، بر الوالدين، صلة الرحم، الجوار، وحسن المعاشرة والأخلاق.",
    gradeBadgeAr: "جامع الأخلاق والآداب",
    totalHadiths: 1326,
    totalChapters: 57,
  },
  {
    slug: "mishkat_almasabih",
    titleAr: "مشكاة المصابيح",
    shortTitleAr: "مشكاة المصابيح",
    authorAr: "الإمام محمد بن عبد الله الخطيب التبريزي (٧٤١ هـ)",
    categoryAr: "جوامع السنة والأخلاق والأحكام",
    descriptionAr:
      "موسوعة حديثية جامعة هذّب فيها التبريزي كتاب مصابيح السنة للبغوي ورتبها على أبواب الإيمان والعلم والعبادات والرقائق.",
    gradeBadgeAr: "موسوعة حديثية جامعة",
    totalHadiths: 4428,
    totalChapters: 25,
  },
  {
    slug: "shamail_muhammadiyah",
    titleAr: "الشمائل المحمدية والخصائص المصطفوية",
    shortTitleAr: "الشمائل المحمدية",
    authorAr: "الإمام أبو عيسى محمد بن عيسى الترمذي (٢٧٩ هـ)",
    categoryAr: "جوامع السنة والأخلاق والأحكام",
    descriptionAr:
      "أجمع كتاب في وصف خَلْق وخُلُق رسول الله ﷺ، هديه، عبادته، تواضعه، كلامه، وعيشه الشريف.",
    gradeBadgeAr: "وصف النبي ﷺ وهديه",
    totalHadiths: 402,
    totalChapters: 57,
  },

  // 3. متون الأربعينات الجامعة
  {
    slug: "nawawi40",
    titleAr: "الأربعون النووية في الأحاديث الصحيحة النبوية",
    shortTitleAr: "الأربعون النووية",
    authorAr: "الإمام يحيى بن شرف النووي (٦٧٦ هـ)",
    categoryAr: "متون الأربعينات الجامعة",
    descriptionAr:
      "اثنان وأربعون حديثاً صحيحاً من جوامع كلم النبي ﷺ، يدور عليها الإسلام وأصول الإيمان والأحكام والأخلاق.",
    gradeBadgeAr: "جوامع الكلم (صحيح)",
    totalHadiths: 42,
    totalChapters: 1,
  },
  {
    slug: "qudsi40",
    titleAr: "الأربعون القدسية",
    shortTitleAr: "الأربعون القدسية",
    authorAr: "الملا علي القاري / الإمام النووي",
    categoryAr: "متون الأربعينات الجامعة",
    descriptionAr:
      "أربعون حديثاً قدسياً يرويها النبي ﷺ عن ربه عز وجل في التوحيد والرحمة والمغفرة وفضل الذكر والإخلاص.",
    gradeBadgeAr: "أحاديث قدسية شريفة",
    totalHadiths: 40,
    totalChapters: 1,
  },
  {
    slug: "shahwaliullah40",
    titleAr: "أربعون الشاه ولي الله الدهلوي",
    shortTitleAr: "الأربعون الدهلوية",
    authorAr: "الإمام أحمد بن عبد الرحيم الشاه ولي الله الدهلوي (١١٧٦ هـ)",
    categoryAr: "متون الأربعينات الجامعة",
    descriptionAr:
      "أربعون حديثاً نبوية وجيزة اللفظ عظيمة المعنى من جوامع الكلم المتصلة الإسناد.",
    gradeBadgeAr: "من جوامع الكلم",
    totalHadiths: 40,
    totalChapters: 1,
  },
];

export const HADITH_TOPIC_CHIPS: { labelAr: string; query: string }[] = [
  { labelAr: "النية والإخلاص", query: "إنما الأعمال بالنيات" },
  { labelAr: "فضل الصلاة", query: "الصلاة" },
  { labelAr: "بر الوالدين", query: "الوالدين" },
  { labelAr: "الصدقة والزكاة", query: "الصدقة" },
  { labelAr: "الصيام ورمضان", query: "رمضان" },
  { labelAr: "الذكر والاستغفار", query: "سبحان الله" },
  { labelAr: "حسن الخلق", query: "حسن الخلق" },
  { labelAr: "الرحمة والرفق", query: "الرفق" },
  { labelAr: "فضل القرآن", query: "القرآن" },
  { labelAr: "الجنة والآخرة", query: "الجنة" },
  { labelAr: "التوبة والمغفرة", query: "التوبة" },
  { labelAr: "الدعاء", query: "الدعاء" },
];

export function getHadithBookMeta(slug: string): HadithBookMeta | undefined {
  return HADITH_BOOKS_META.find((b) => b.slug === slug);
}
