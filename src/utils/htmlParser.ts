import { WordTypeTranslations, TranslationWithMeaning } from "../types";
import { LANGUAGE_NAMES } from "./languageConfig";

/**
 * Helper function to decode HTML entities
 */
function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Detect if a word type has a redirect to a separate translations page
 * Returns the redirect page name if found, null otherwise
 */
export function detectTranslationRedirect(html: string, wordTypeName: string): string | null {
  const typeRegex = new RegExp(`<h[34][^>]*id="(${wordTypeName}(?:_\\d+)?)"[^>]*>`, 'i');
  const match = html.match(typeRegex);

  if (!match) return null;

  const headingPos = match.index!;
  const headingLevel = match[0].match(/<h([34])/)?.[1];
  const nextHeadingRegex = headingLevel === '3' ? /<h[23][^>]*id="/i : /<h[234][^>]*id="/i;
  const restOfHtml = html.slice(headingPos + match[0].length);
  const nextHeadingMatch = restOfHtml.match(nextHeadingRegex);
  const sectionEnd = nextHeadingMatch ? headingPos + match[0].length + nextHeadingMatch.index! : html.length;
  const section = html.slice(headingPos, sectionEnd);

  const translationsStart = section.search(/<h[45][^>]*id="[^"]*Translations[^"]*"[^>]*>/i);
  if (translationsStart === -1) return null;

  const translationsSection = section.slice(translationsStart, translationsStart + 1000);

  const redirectRegex = /<div class="(?:pseudo )?NavFrame"[^>]*>[\s\S]*?<div class="NavHead"[^>]*>.*?See\s+<a[^>]*href="[^"]*\/wiki\/([^"#]+)(?:#([^"]+))?"[^>]*>/i;
  const redirectMatch = translationsSection.match(redirectRegex);

  return redirectMatch ? redirectMatch[1] : null;
}

/**
 * Parse Wiktionary HTML to extract translations grouped by word type
 * Only supports English Wiktionary standard format (for en/es/fr)
 */
export function parseWiktionaryTranslationsByType(
  html: string,
  targetLanguageCode: string,
  sourceLanguageCode: string = 'en'
): WordTypeTranslations[] {
  const result: WordTypeTranslations[] = [];
  const targetLanguageName = LANGUAGE_NAMES[targetLanguageCode] || targetLanguageCode;

  const wordTypes = [
    { key: 'noun', name: 'Noun' },
    { key: 'verb', name: 'Verb' },
    { key: 'adjective', name: 'Adjective' },
    { key: 'adverb', name: 'Adverb' },
    { key: 'pronoun', name: 'Pronoun' },
    { key: 'preposition', name: 'Preposition' },
    { key: 'conjunction', name: 'Conjunction' },
    { key: 'interjection', name: 'Interjection' },
    { key: 'numeral', name: 'Numeral' },
    { key: 'phrase', name: 'Phrase' },
  ];

  for (const type of wordTypes) {
    const typeRegex = new RegExp(`<h[34][^>]*id="(${type.name}(?:_\\d+)?)"[^>]*>`, 'gi');
    let match;
    const allMatches: RegExpExecArray[] = [];

    while ((match = typeRegex.exec(html)) !== null) {
      allMatches.push(match);
    }

    if (allMatches.length === 0) continue;

    const allTranslations: TranslationWithMeaning[] = [];

    for (const currentMatch of allMatches) {
      const headingPos = currentMatch.index!;
      const headingLevel = currentMatch[0].match(/<h([34])/)?.[1];
      const nextHeadingRegex = headingLevel === '3' ? /<h[23][^>]*id="/i : /<h[234][^>]*id="/i;
      const restOfHtml = html.slice(headingPos + currentMatch[0].length);
      const nextHeadingMatch = restOfHtml.match(nextHeadingRegex);
      const sectionEnd = nextHeadingMatch ? headingPos + currentMatch[0].length + nextHeadingMatch.index! : html.length;
      const section = html.slice(headingPos, sectionEnd);

      const translationsStart = section.search(/<h[45][^>]*id="[^"]*Translations[^"]*"[^>]*>/i);
      if (translationsStart === -1) continue;

      const translationsSection = section.slice(translationsStart);
      const firstHeadingEnd = translationsSection.search(/>/) + 1;
      const restAfterHeading = translationsSection.slice(firstHeadingEnd);
      const nextSubheadingMatch = restAfterHeading.search(/<h[45][^>]*id="/i);
      const transEnd = nextSubheadingMatch !== -1 ? firstHeadingEnd + nextSubheadingMatch : translationsSection.length;
      const transSection = translationsSection.slice(0, transEnd);

      const translations: TranslationWithMeaning[] = [];

      // Check for translation redirect (e.g., "See cat/translations § Noun")
      const redirectRegex = /<div class="(?:pseudo )?NavFrame"[^>]*>[\s\S]*?<div class="NavHead"[^>]*>.*?See\s+<a[^>]*href="[^"]*\/wiki\/([^"#]+)(?:#([^"]+))?"[^>]*>/i;
      const redirectMatch = transSection.match(redirectRegex);

      if (redirectMatch) {
        // Skip redirects - they need to be handled at a higher level
        continue;
      }

      // Parse NavFrame format
      const navFrameRegex = /<div class="NavFrame"(?:[^>]*id="Translations-([^"]*)")?[^>]*>[\s\S]*?<div class="NavHead"[^>]*>([\s\S]*?)<\/div>[\s\S]*?<div class="NavContent">([\s\S]*?)<\/div><\/div>/g;
      let navMatch;

      while ((navMatch = navFrameRegex.exec(transSection)) !== null) {
        const glossRaw = navMatch[2];
        const gloss = decodeHTMLEntities(glossRaw.replace(/<[^>]+>/g, '')).trim();
        const navContent = navMatch[3];

        if (gloss.includes('—')) continue;

        const liRegex = /<li>([^:]+?):\s*([\s\S]*?)<\/li>/g;
        let liMatch;

        while ((liMatch = liRegex.exec(navContent)) !== null) {
          const language = decodeHTMLEntities(liMatch[1].replace(/<[^>]*>/g, '')).trim();
          if (language.toLowerCase() !== targetLanguageName.toLowerCase()) continue;

          const liContent = liMatch[2];

          const extractTranslations = (content: string, dialect?: string) => {
            const langSpanRegex = /<(?:span|bdi)[^>]*lang="([^"]*)"[^>]*>(?:<a[^>]*>)?([^<]+?)(?:<\/a>)?<\/(?:span|bdi)>/g;
            const trSpanRegex = /<span[^>]*class="[^"]*\btr\b[^"]*"[^>]*>(?:<a[^>]*>)?([^<]+?)(?:<\/a>)?<\/span>/g;

            const spanMatches: Array<{pos: number, isTranslit: boolean, text: string}> = [];
            let spanMatch;

            while ((spanMatch = langSpanRegex.exec(content)) !== null) {
              const isTranslit = spanMatch[1].includes('-Latn');
              spanMatches.push({
                pos: spanMatch.index,
                isTranslit,
                text: decodeHTMLEntities(spanMatch[2].trim())
              });
            }

            while ((spanMatch = trSpanRegex.exec(content)) !== null) {
              spanMatches.push({
                pos: spanMatch.index,
                isTranslit: true,
                text: decodeHTMLEntities(spanMatch[1].trim())
              });
            }

            spanMatches.sort((a, b) => a.pos - b.pos);

            let i = 0;
            while (i < spanMatches.length) {
              const current = spanMatches[i];
              const next = spanMatches[i + 1];

              if (next && next.isTranslit && !current.isTranslit) {
                const trans: TranslationWithMeaning = {
                  translation: current.text,
                  transliteration: next.text,
                  meaning: gloss
                };
                if (dialect) trans.dialect = dialect;
                translations.push(trans);
                i += 2;
              } else if (!current.isTranslit) {
                const trans: TranslationWithMeaning = {
                  translation: current.text,
                  meaning: gloss
                };
                if (dialect) trans.dialect = dialect;
                translations.push(trans);
                i += 1;
              } else {
                i += 1;
              }
            }
          };

          const dlStartPos = liContent.indexOf('<dl>');
          const generalContent = dlStartPos !== -1 ? liContent.substring(0, dlStartPos) : liContent;
          extractTranslations(generalContent);

          const dialectRegex = /<dl>([\s\S]*?)<\/dl>/g;
          let dialectMatch;

          while ((dialectMatch = dialectRegex.exec(liContent)) !== null) {
            const dlContent = dialectMatch[1];
            const ddRegex = /<dd>([^:]+?):\s*([\s\S]*?)(?=<\/dd>|<dd>)/g;
            let ddMatch;

            while ((ddMatch = ddRegex.exec(dlContent)) !== null) {
              const dialectName = ddMatch[1].trim();
              const dialectContent = ddMatch[2];
              extractTranslations(dialectContent, dialectName);
            }
          }
        }
      }

      allTranslations.push(...translations);
    }

    if (allTranslations.length > 0) {
      result.push({
        wordType: type.key,
        translations: allTranslations
      });
    }
  }

  return result;
}

/**
 * Parse translations from a separate translations page (e.g., cat/translations)
 * Used when the main page redirects to a separate translations subpage
 */
export function parseTranslationRedirectPage(
  html: string,
  targetLanguageCode: string,
  wordType: string
): TranslationWithMeaning[] {
  const translations: TranslationWithMeaning[] = [];
  const targetLanguageName = LANGUAGE_NAMES[targetLanguageCode] || targetLanguageCode;

  // Find the section for the specified word type (capitalize first letter)
  const wordTypeCap = wordType.charAt(0).toUpperCase() + wordType.slice(1);
  const sectionRegex = new RegExp(`<h3[^>]*id="${wordTypeCap}"[^>]*>`, 'i');
  const sectionMatch = html.match(sectionRegex);

  if (!sectionMatch) return translations;

  const sectionStart = sectionMatch.index!;
  const restOfHtml = html.slice(sectionStart);
  const nextSectionMatch = restOfHtml.slice(100).search(/<h[23][^>]*id="/i);
  const sectionEnd = nextSectionMatch !== -1 ? sectionStart + 100 + nextSectionMatch : html.length;
  const section = html.slice(sectionStart, sectionEnd);

  // Parse NavFrames with glosses
  const navFrameRegex = /<div class="NavFrame"[^>]*>[\s\S]*?<div class="NavHead"[^>]*>([\s\S]*?)<\/div>[\s\S]*?<div class="NavContent">([\s\S]*?)<\/div><\/div>/g;
  let navMatch;

  while ((navMatch = navFrameRegex.exec(section)) !== null) {
    const glossRaw = navMatch[1];
    const gloss = decodeHTMLEntities(glossRaw.replace(/<[^>]+>/g, '')).trim();
    const navContent = navMatch[2];

    if (gloss.includes('—')) continue;

    const liRegex = /<li>([^:]+?):\s*([\s\S]*?)<\/li>/g;
    let liMatch;

    while ((liMatch = liRegex.exec(navContent)) !== null) {
      const language = decodeHTMLEntities(liMatch[1].replace(/<[^>]*>/g, '')).trim();
      if (language.toLowerCase() !== targetLanguageName.toLowerCase()) continue;

      const liContent = liMatch[2];

      const langSpanRegex = /<(?:span|bdi)[^>]*lang="([^"]*)"[^>]*>(?:<a[^>]*>)?([^<]+?)(?:<\/a>)?<\/(?:span|bdi)>/g;
      const trSpanRegex = /<span[^>]*class="[^"]*\btr\b[^"]*"[^>]*>(?:<a[^>]*>)?([^<]+?)(?:<\/a>)?<\/span>/g;

      const spanMatches: Array<{pos: number, isTranslit: boolean, text: string}> = [];
      let spanMatch;

      while ((spanMatch = langSpanRegex.exec(liContent)) !== null) {
        const isTranslit = spanMatch[1].includes('-Latn');
        spanMatches.push({
          pos: spanMatch.index,
          isTranslit,
          text: decodeHTMLEntities(spanMatch[2].trim())
        });
      }

      while ((spanMatch = trSpanRegex.exec(liContent)) !== null) {
        spanMatches.push({
          pos: spanMatch.index,
          isTranslit: true,
          text: decodeHTMLEntities(spanMatch[1].trim())
        });
      }

      spanMatches.sort((a, b) => a.pos - b.pos);

      let i = 0;
      while (i < spanMatches.length) {
        const current = spanMatches[i];
        const next = spanMatches[i + 1];

        if (next && next.isTranslit && !current.isTranslit) {
          translations.push({
            translation: current.text,
            transliteration: next.text,
            meaning: gloss
          });
          i += 2;
        } else if (!current.isTranslit) {
          translations.push({
            translation: current.text,
            meaning: gloss
          });
          i += 1;
        } else {
          i += 1;
        }
      }
    }
  }

  return translations;
}
