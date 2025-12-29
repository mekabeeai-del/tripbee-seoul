import { useMemo } from 'react';
import { getTranslation, type Language } from '../locales';
import type { TranslationKeys } from '../locales/ko';

/**
 * 번역 훅
 * @param language 현재 언어
 * @returns 번역 객체
 */
export function useTranslation(language: Language): TranslationKeys {
  return useMemo(() => getTranslation(language), [language]);
}

export type { TranslationKeys };
