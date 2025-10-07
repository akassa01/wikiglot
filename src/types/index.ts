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

/**
 * Result of a translation query
 */
export interface TranslationResult {
  /** The word that was queried */
  word: string;
  /** Source language code (e.g., 'es', 'fr', 'en') */
  sourceLanguage: string;
  /** Target language code (e.g., 'es', 'fr', 'en') */
  targetLanguage: string;
  /** Translations organized by word type (noun, verb, etc.) */
  translationsByType: WordTypeTranslations[];
  /** IPA pronunciation, if available */
  pronunciation?: string;
  /**
   * Original query if accent correction was applied.
   * e.g., "azucar" when the user searched for "azucar" but found "azúcar"
   * @example
   * const result = await translator.translate('azucar', 'es', 'en');
   * if (result.searchedFor) {
   *   console.log(`Searched for "${result.searchedFor}", found "${result.foundAs}"`);
   * }
   */
  searchedFor?: string;
  /**
   * Corrected word that was actually found, if accent correction was applied.
   * e.g., "azúcar" when the user searched for "azucar"
   */
  foundAs?: string;
}

export interface WikiglotOptions {
  userAgent?: string;
  timeout?: number;
  rateLimit?: {
    maxRequests: number;
    perMilliseconds: number;
  };
}
