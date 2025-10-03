export interface Translation {
  translation: string;
  transliteration?: string;
  meaning: string;
}

export interface TranslationWithMeaning {
  translation: string;
  transliteration?: string;
  dialect?: string;
  meaning: string;
}

export interface WordTypeTranslations {
  wordType: string;
  translations: Translation[];
  verbForm?: {
    baseVerb: string;
    formType: string;
  };
}

export interface TranslationResult {
  word: string;
  sourceLanguage: string;
  targetLanguage: string;
  translationsByType: WordTypeTranslations[];
  pronunciation?: string;
}

export interface WikiglotOptions {
  userAgent?: string;
  timeout?: number;
  rateLimit?: {
    maxRequests: number;
    perMilliseconds: number;
  };
}
