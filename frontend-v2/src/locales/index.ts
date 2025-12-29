import { ko, type TranslationKeys } from './ko';
import { ja } from './ja';
import { en } from './en';

export type Language = 'ko' | 'en' | 'ja';

export const translations: Record<Language, TranslationKeys> = {
  ko,
  ja: ja as TranslationKeys,
  en: en as TranslationKeys,
};

// 언어 이름 (각 언어로)
export const languageNames: Record<Language, string> = {
  ko: '한국어',
  ja: '日本語',
  en: 'English',
};

// localStorage 키
export const LANGUAGE_STORAGE_KEY = 'tripbee-language';

// 기본 언어
export const DEFAULT_LANGUAGE: Language = 'ko';

// 저장된 언어 가져오기
export function getSavedLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved && (saved === 'ko' || saved === 'ja' || saved === 'en')) {
    return saved;
  }
  return DEFAULT_LANGUAGE;
}

// 언어 저장하기
export function saveLanguage(lang: Language): void {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
}

// 번역 가져오기
export function getTranslation(lang: Language): TranslationKeys {
  return translations[lang] || translations[DEFAULT_LANGUAGE];
}
