import type { TranslationDict } from "../types";
import en from "./en";
import academyAr from "./academy-ar";

/**
 * Arabic (RTL) — Workspace Academy content is fully translated; other modules
 * currently fall back to English via the merged dictionary. Add Arabic
 * overrides here as further modules are localized.
 */
const arOverrides: TranslationDict = {
  ...academyAr,
  "common.loading": "جارٍ التحميل…",
  "common.error": "حدث خطأ ما",
  "common.retry": "إعادة المحاولة",
  "common.done": "تم",
  "common.welcomeBack": "مرحباً بعودتك",
  "common.signOut": "تسجيل الخروج",
  "common.myDashboard": "لوحتي",
  "common.openMenu": "فتح القائمة",
  "common.collapse": "طي الشريط الجانبي",
  "common.expand": "توسيع الشريط الجانبي",
  "lang.switch": "اللغة",
};

const ar: TranslationDict = { ...en, ...arOverrides };

export default ar;
