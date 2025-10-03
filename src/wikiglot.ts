import fetch from "node-fetch";
import { TranslationResult, WikiglotOptions } from "./types";
import { WikiglotError, WikiglotNotFoundError, WikiglotTimeoutError } from "./errors";
import { RateLimiter } from "./utils/rateLimit";
import { parseEnglishWiktionaryForeignWord, detectEnglishVerbForm } from "./utils/enWiktionaryParser";
import { extractPronunciation } from "./utils/pronunciationParser";
import { parseWiktionaryTranslationsByType, detectTranslationRedirect, parseTranslationRedirectPage } from "./utils/htmlParser";

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

const LANGUAGE_NAMES: { [key: string]: string } = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French'
};

/**
 * Simple translation client using English Wiktionary
 * Supports English, French, and Spanish translations
 */
export class Wikiglot {
  private api = "wiktionary.org/w/api.php";
  private timeout: number;
  private protocol: "https" = "https";
  private rateLimiter?: RateLimiter;
  private userAgent: string;

  constructor(options?: WikiglotOptions) {
    this.timeout = options?.timeout ?? 10000;
    this.userAgent = options?.userAgent ?? "wikiglot/1.0.0 (https://github.com/yourproject/wikiglot)";

    if (options?.rateLimit) {
      this.rateLimiter = new RateLimiter(
        options.rateLimit.maxRequests,
        options.rateLimit.perMilliseconds
      );
    }
  }

  /**
   * Translate a word between English, French, and Spanish
   * Uses English Wiktionary as the source
   *
   * @param word - The word to translate
   * @param sourceLanguage - Source language code: "en", "es", or "fr"
   * @param targetLanguage - Target language code: "en", "es", or "fr"
   * @returns Translation result with translations organized by word type
   */
  async translate(
    word: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationResult> {
    return this.translateEng(word, sourceLanguage, targetLanguage);
  }

  private async translateEng(
    word: string,
    sourceLanguage: string,
    targetLanguage: string,
    skipVerbFormLookup = false
  ): Promise<TranslationResult> {
    // Validate languages
    if (!['en', 'es', 'fr'].includes(sourceLanguage) || !['en', 'es', 'fr'].includes(targetLanguage)) {
      throw new WikiglotError('Only English (en), Spanish (es), and French (fr) are supported');
    }

    if (sourceLanguage === targetLanguage) {
      throw new WikiglotError('Source and target languages must be different');
    }

    // Ensure one language is English (since we use English Wiktionary)
    if (sourceLanguage !== 'en' && targetLanguage !== 'en') {
      throw new WikiglotError('One of the languages must be English when using English Wiktionary');
    }

    const normalizedWord = word.replace(/\s+/g, '_');
    const rawResult = await this.fetch(normalizedWord);
    const html = rawResult.parse?.text["*"] || "";

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
            const redirectHtml = await this.fetch(redirectPage);
            const redirectTranslations = parseTranslationRedirectPage(
              redirectHtml.parse?.text["*"] || "",
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

    return {
      word,
      sourceLanguage,
      targetLanguage,
      translationsByType,
      pronunciation
    };
  }

  private async fetch(word: string): Promise<WiktionaryResponse> {
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
          throw new WikiglotNotFoundError(word);
        }
        throw new WikiglotError(`HTTP ${res.status}: ${res.statusText}`, res.status);
      }

      const data = await res.json() as WiktionaryResponse;

      if (data.error) {
        throw new WikiglotError(data.error.info, undefined, data.error.code);
      }

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new WikiglotTimeoutError(`Request timed out after ${this.timeout}ms`);
      }
      throw error;
    }
  }
}
