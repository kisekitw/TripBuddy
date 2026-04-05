import { zhTW } from "./zh-TW";
import { en } from "./en";

export type Locale = "zh-TW" | "en";
export type Translations = typeof zhTW;

const locales: Record<Locale, Translations> = {
  "zh-TW": zhTW,
  en,
};

export function getTranslations(locale: Locale): Translations {
  return locales[locale];
}

export { zhTW, en };
