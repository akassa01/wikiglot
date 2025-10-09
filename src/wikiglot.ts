import fetch from "node-fetch";
import { TranslationResult, WikiglotOptions } from "./types";
import { WikiglotError, WikiglotNotFoundError, WikiglotTimeoutError } from "./errors";
import { RateLimiter } from "./utils/rateLimit";
import { parseEnglishWiktionaryForeignWord, detectEnglishVerbForm } from "./utils/enWiktionaryParser";
import { extractPronunciation } from "./utils/pronunciationParser";
import { parseWiktionaryTranslationsByType, detectTranslationRedirect, parseTranslationRedirectPage } from "./utils/htmlParser";
import { LANGUAGE_NAMES } from "./utils/languageConfig";
import { extractHeadwordTransliteration } from "./utils/headwordParser";

interface WiktionaryResponse {
  parse?: {
    title: string;
    pageid: number;
    text: {
      "*": string;
    };
  };
  error?: {
    code: string;
    info: string;
  };
}

interface WiktionarySearchResponse {
  query?: {
    search: Array<{
      title: string;
      pageid: number;
      snippet: string;
    }>;
  };
}

/**
 * Simple translation client using English Wiktionary
 * Supports 14 languages: English, Spanish, French, Italian, German, Portuguese, Swedish, Indonesian, Swahili, Turkish, Arabic, Korean, Chinese, Japanese
 * Note: One language must be English (source or target)
 */
export class Wikiglot {
  private api = "wiktionary.org/w/api.php";
  private timeout: number;
  private protocol: "https" = "https";
  private rateLimiter?: RateLimiter;
  private userAgent: string;

  constructor(options?: WikiglotOptions) {
    this.timeout = options?.timeout ?? 10000;
    this.userAgent = options?.userAgent ?? "wikiglot/1.1.0 (https://github.com/yourproject/wikiglot)";

    if (options?.rateLimit) {
      this.rateLimiter = new RateLimiter(
        options.rateLimit.maxRequests,
        options.rateLimit.perMilliseconds
      );
    }
  }

  /**
   * Translate a word between supported languages
   * Uses English Wiktionary as the source
   *
   * @param word - The word to translate
   * @param sourceLanguage - Source language code (en, es, fr, it, de, pt, sv, id, sw, tr, ar, ko, zh, ja)
   * @param targetLanguage - Target language code (en, es, fr, it, de, pt, sv, id, sw, tr, ar, ko, zh, ja)
   * @returns Translation result with translations organized by word type
   * @note One language must be English (source or target)
   */
  async translate(
    word: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationResult> {
    return this.translateEng(word, sourceLanguage, targetLanguage);
  }

  /**
   * Search for words by transliteration/romanization
   * Useful for finding character-based words when you only know the romanization
   *
   * @param transliteration - The romanization to search for (e.g., "annyeonghaseyo", "marḥaban")
   * @param language - Optional language code to help filter results (ar, ko, zh, etc.)
   * @returns Array of suggested page titles (words) matching the search
   *
   * @example
   * // Find Korean word from romanization
   * const suggestions = await translator.searchByTransliteration('annyeonghaseyo', 'ko');
   * // Returns: ['안녕하세요', ...]
   *
   * // Then translate the first result
   * if (suggestions.length > 0) {
   *   const result = await translator.translate(suggestions[0], 'ko', 'en');
   * }
   *
   * @example
   * // Find Arabic word from romanization
   * const suggestions = await translator.searchByTransliteration('marhaban', 'ar');
   * // Returns: ['مرحبا', ...]
   *
   * @note Limitations:
   * - Accuracy depends on Wiktionary's search indexing and algorithm
   * - Some romanizations may not return results even if the word page exists
   * - Works best with standard/common romanizations (e.g., Revised Romanization for Korean, Pinyin for Chinese)
   * - Arabic romanizations may require diacritics for better results (e.g., "salām" vs "salam")
   * - Returns empty array if no matches found in the target language's script
   * - Wiktionary's search may prioritize Latin-script words over character-based ones
   */
  async searchByTransliteration(
    transliteration: string,
    language?: string
  ): Promise<string[]> {
    const suggestions = await this.searchSuggestions(transliteration);

    // If language is specified, try to filter to character-based scripts
    if (language) {
      const languageName = LANGUAGE_NAMES[language];
      if (languageName) {
        // Filter to suggestions that are likely in the target language
        // For character-based languages, filter to non-Latin characters
        if (language === 'ar' || language === 'ko' || language === 'zh' || language === 'yue' || language === 'ja') {
          return suggestions.filter(word => {
            // Arabic: contains Arabic script (U+0600 to U+06FF)
            // Korean: contains Hangul (U+AC00 to U+D7AF) or Hangul Jamo (U+1100 to U+11FF)
            // Chinese: contains CJK Unified Ideographs (U+4E00 to U+9FFF)
            // Japanese: contains Hiragana (U+3040 to U+309F), Katakana (U+30A0 to U+30FF), or CJK (U+4E00 to U+9FFF)
            if (language === 'ar') {
              return /[\u0600-\u06FF]/.test(word);
            } else if (language === 'ko') {
              return /[\uAC00-\uD7AF\u1100-\u11FF]/.test(word);
            } else if (language === 'zh' || language === 'yue') {
              return /[\u4E00-\u9FFF]/.test(word);
            } else if (language === 'ja') {
              return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(word);
            }
            return true;
          });
        }
      }
    }

    return suggestions;
  }

  private async translateEng(
    word: string,
    sourceLanguage: string,
    targetLanguage: string,
    skipVerbFormLookup = false
  ): Promise<TranslationResult> {
    // Validate languages
    const supportedLanguages = Object.keys(LANGUAGE_NAMES);
    if (!supportedLanguages.includes(sourceLanguage) || !supportedLanguages.includes(targetLanguage)) {
      const langList = supportedLanguages.map(code => `${LANGUAGE_NAMES[code]} (${code})`).join(', ');
      throw new WikiglotError(`Only ${langList} are supported`);
    }

    if (sourceLanguage === targetLanguage) {
      throw new WikiglotError('Source and target languages must be different');
    }

    // Ensure one language is English (since we use English Wiktionary)
    if (sourceLanguage !== 'en' && targetLanguage !== 'en') {
      throw new WikiglotError('One of the languages must be English when using English Wiktionary');
    }

    const normalizedWord = word.replace(/\s+/g, '_');
    const fetchResult = await this.fetch(normalizedWord);
    const rawResult = fetchResult.response;
    const html = rawResult.parse?.text["*"] || "";
    const actualTitle = rawResult.parse?.title || normalizedWord;
    const correctedFrom = fetchResult.correctedFrom;

    let translationsByType = [];
    let englishHtml = html;

    if (sourceLanguage === 'en') {
      // English to Foreign
      const englishMatch = html.match(/<h2[^>]*id="English"[^>]*>English<\/h2>/i);
      if (englishMatch) {
        const englishStart = englishMatch.index!;
        const nextH2Regex = /<h2[^>]*id="[^"]*"[^>]*>/;
        const restAfterEnglish = html.slice(englishStart + englishMatch[0].length);
        const nextH2Match = restAfterEnglish.match(nextH2Regex);
        const englishEnd = nextH2Match ? englishStart + englishMatch[0].length + nextH2Match.index! : html.length;
        englishHtml = html.slice(englishStart, englishEnd);
      }

      // Check if this is an English verb form
      let englishVerbForm = null;
      if (!skipVerbFormLookup) {
        englishVerbForm = detectEnglishVerbForm(html);
      }

      // Parse translations from English section
      translationsByType = parseWiktionaryTranslationsByType(englishHtml, targetLanguage, 'en');

      // Check for redirect pages and fetch them if needed
      const wordTypes = ['Noun', 'Verb', 'Adjective', 'Adverb', 'Pronoun', 'Preposition', 'Conjunction', 'Interjection', 'Numeral'];
      for (const wordTypeName of wordTypes) {
        const redirectPage = detectTranslationRedirect(englishHtml, wordTypeName);
        if (redirectPage) {
          try {
            const redirectFetchResult = await this.fetch(redirectPage);
            const redirectTranslations = parseTranslationRedirectPage(
              redirectFetchResult.response.parse?.text["*"] || "",
              targetLanguage,
              wordTypeName.toLowerCase()
            );

            if (redirectTranslations.length > 0) {
              translationsByType.push({
                wordType: wordTypeName.toLowerCase(),
                translations: redirectTranslations
              });
            }
          } catch (error) {
            // Continue if redirect page fetch fails
          }
        }
      }

      // If this is a verb form, fetch base verb translations
      if (englishVerbForm && !skipVerbFormLookup) {
        try {
          const baseVerbResult = await this.translateEng(
            englishVerbForm.baseVerb,
            sourceLanguage,
            targetLanguage,
            true
          );

          for (const baseTranslation of baseVerbResult.translationsByType) {
            translationsByType.push({
              ...baseTranslation,
              verbForm: englishVerbForm
            });
          }
        } catch (error) {
          // Continue without base verb translations
        }
      }
    } else {
      // Foreign to English
      const languageName = LANGUAGE_NAMES[sourceLanguage];
      translationsByType = parseEnglishWiktionaryForeignWord(html, languageName);

      // Check for verb forms and participles
      if (!skipVerbFormLookup) {
        const verbFormEntries = translationsByType.filter(t => t.verbForm);
        const fetchedBaseVerbs = new Set<string>();

        for (const entry of verbFormEntries) {
          const baseVerb = entry.verbForm!.baseVerb;
          if (fetchedBaseVerbs.has(baseVerb)) continue;
          fetchedBaseVerbs.add(baseVerb);

          try {
            const baseVerbResult = await this.translateEng(
              baseVerb,
              sourceLanguage,
              targetLanguage,
              true
            );

            for (const baseTranslation of baseVerbResult.translationsByType) {
              translationsByType.push({
                ...baseTranslation,
                verbForm: entry.verbForm
              });
            }
          } catch (error) {
            // Continue without base verb translations
          }
        }
      }
    }

    // Extract pronunciation
    const pronunciation = extractPronunciation(sourceLanguage === 'en' ? englishHtml : html);

    // Extract headword transliteration for character-based languages
    // Only extract when translating FROM character-based languages TO another language
    const characterBasedLanguages = ['ar', 'ko', 'zh', 'ja']; // Arabic, Korean, Chinese (Mandarin), Japanese
    let headwordTransliteration: string | undefined;
    if (characterBasedLanguages.includes(sourceLanguage)) {
      const sourceLanguageName = LANGUAGE_NAMES[sourceLanguage];
      headwordTransliteration = extractHeadwordTransliteration(html, sourceLanguageName);
    }

    // ACCENT CORRECTION FALLBACK
    // If no translations found for target language, try searching for accent-corrected version.
    // This handles common cases like:
    // - "azucar" (doesn't exist) → finds "azúcar" (Spanish)
    // - "revolucion" (exists for Esperanto) → finds "revolución" (Spanish)
    // - "cafe" (exists for English) → finds "café" (Portuguese)
    if (translationsByType.length === 0 && !correctedFrom && !skipVerbFormLookup) {
      const suggestions = await this.searchSuggestions(normalizedWord);
      const correctedWord = this.filterBestMatch(suggestions, normalizedWord);

      if (correctedWord && correctedWord !== normalizedWord) {
        // Retry with corrected word
        try {
          const retryResult = await this.translateEng(
            correctedWord,
            sourceLanguage,
            targetLanguage,
            true // Skip verb form lookup on retry to avoid infinite loops
          );

          // If retry found translations, use those results with correction metadata
          if (retryResult.translationsByType.length > 0) {
            return {
              ...retryResult,
              searchedFor: normalizedWord,
              foundAs: correctedWord
            };
          }
        } catch (error) {
          // Continue with empty results if retry also fails
        }
      }
    }

    const result: TranslationResult = {
      word,
      sourceLanguage,
      targetLanguage,
      translationsByType,
      pronunciation,
      headwordTransliteration
    };

    // Add correction metadata if word was auto-corrected
    if (correctedFrom) {
      result.searchedFor = correctedFrom;
      result.foundAs = actualTitle;
    }

    return result;
  }

  /**
   * Search for word suggestions using Wiktionary's search API
   * Used as fallback when direct page lookup fails
   */
  private async searchSuggestions(word: string): Promise<string[]> {
    if (this.rateLimiter) {
      await this.rateLimiter.acquire();
    }

    const url = `${this.protocol}://en.${this.api}?action=query&list=search&srsearch=${encodeURIComponent(word)}&srnamespace=0&srlimit=10&format=json`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': this.userAgent
        }
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return [];
      }

      const data = await res.json() as WiktionarySearchResponse;

      if (!data.query?.search) {
        return [];
      }

      return data.query.search.map(result => result.title);
    } catch (error: any) {
      clearTimeout(timeoutId);
      // Don't throw on search failure, just return empty array
      return [];
    }
  }

  /**
   * Filter search suggestions to find the best match
   * Prefers single-word entries that match the original query (accent-insensitive)
   * When multiple matches exist, prefers the one with accents (more specific)
   */
  private filterBestMatch(suggestions: string[], originalWord: string): string | null {
    if (suggestions.length === 0) return null;

    // Normalize for comparison (strip accents, lowercase)
    const normalize = (str: string): string => {
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    };

    const hasAccents = (str: string): boolean => {
      return str !== str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    };

    const normalizedOriginal = normalize(originalWord);
    const originalHasAccents = hasAccents(originalWord);

    // Filter to single words only (no spaces)
    const singleWords = suggestions.filter(s => !s.includes(' '));

    // Find all accent-insensitive matches
    const matches = singleWords.filter(s => normalize(s) === normalizedOriginal);

    if (matches.length === 0) {
      // No matches - return first single word if available
      return singleWords[0] || null;
    }

    if (matches.length === 1) {
      return matches[0];
    }

    // Multiple matches - prefer accented version if original has no accents
    if (!originalHasAccents) {
      const accentedMatch = matches.find(m => hasAccents(m));
      if (accentedMatch) return accentedMatch;
    }

    // Otherwise return first match
    return matches[0];
  }

  private async fetch(word: string, attemptCorrection = true): Promise<{ response: WiktionaryResponse; correctedFrom?: string }> {
    if (this.rateLimiter) {
      await this.rateLimiter.acquire();
    }

    const url = `${this.protocol}://en.${this.api}?action=parse&page=${encodeURIComponent(word)}&prop=text&format=json`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': this.userAgent
        }
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 404) {
          // Try search suggestions as fallback
          if (attemptCorrection) {
            const suggestions = await this.searchSuggestions(word);
            const correctedWord = this.filterBestMatch(suggestions, word);

            if (correctedWord && correctedWord !== word) {
              // Retry with corrected word, but don't attempt correction again
              const result = await this.fetch(correctedWord, false);
              return {
                response: result.response,
                correctedFrom: word
              };
            }
          }

          throw new WikiglotNotFoundError(word);
        }
        throw new WikiglotError(`HTTP ${res.status}: ${res.statusText}`, res.status);
      }

      const data = await res.json() as WiktionaryResponse;

      if (data.error) {
        // ACCENT CORRECTION FALLBACK (Page doesn't exist)
        // When a page doesn't exist (e.g., "azucar"), search for similar pages
        // and try the best match (e.g., "azúcar")
        if (data.error.code === 'missingtitle' && attemptCorrection) {
          const suggestions = await this.searchSuggestions(word);
          const correctedWord = this.filterBestMatch(suggestions, word);

          if (correctedWord && correctedWord !== word) {
            // Retry with corrected word, but don't attempt correction again to avoid loops
            const result = await this.fetch(correctedWord, false);
            return {
              response: result.response,
              correctedFrom: word
            };
          }
        }

        throw new WikiglotError(data.error.info, undefined, data.error.code);
      }

      return { response: data };
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new WikiglotTimeoutError(`Request timed out after ${this.timeout}ms`);
      }
      throw error;
    }
  }
}
