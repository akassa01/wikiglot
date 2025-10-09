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
 * Extract headword transliteration from Wiktionary page
 *
 * For character-based languages (Arabic, Korean, Mandarin, Cantonese, etc.),
 * Wiktionary shows both the native script and romanization in the page header.
 *
 * Pattern: <native script> • (<romanization>)
 * Examples:
 * - Arabic: "مَرْحَبًا • (marḥaban)"
 * - Korean: "안녕하세요? • (annyeonghaseyo?)"
 *
 * @param html - The HTML content from Wiktionary
 * @param languageName - The language name (e.g., "Arabic", "Korean")
 * @returns The romanization/transliteration if found, undefined otherwise
 */
export function extractHeadwordTransliteration(
  html: string,
  languageName: string
): string | undefined {
  // Find the language section (h2 heading)
  const languageSectionRegex = new RegExp(`<h2[^>]*id="${languageName}"[^>]*>${languageName}</h2>`, 'i');
  const langMatch = html.match(languageSectionRegex);

  if (!langMatch) {
    return undefined;
  }

  const langStart = langMatch.index!;

  // Find the next h2 (next language section) to know where this language section ends
  const nextH2Regex = /<h2[^>]*id="[^"]*"[^>]*>/;
  const restAfterLang = html.slice(langStart + langMatch[0].length);
  const nextH2Match = restAfterLang.match(nextH2Regex);
  const langEnd = nextH2Match ? langStart + langMatch[0].length + nextH2Match.index! : html.length;

  const languageSection = html.slice(langStart, langEnd);

  // First 2000 characters are usually the header section with the headword
  const headerSection = languageSection.slice(0, 2000);

  // Pattern 1: Look for <strong class="Latn headword"> or similar with bullet point
  // Example: <strong class="Arab headword">مَرْحَبًا</strong> • <span>(<i>marḥaban</i>)</span>
  // The romanization appears after the bullet point (•) in parentheses
  // We want to extract all text within the parentheses, including from nested tags
  const bulletPattern = /•\s*(?:<[^>]+>)*\(((?:<[^>]+>|[^<)])+)\)/;
  const bulletMatch = headerSection.match(bulletPattern);

  if (bulletMatch) {
    // Extract text from within the parentheses, removing HTML tags
    let transliteration = bulletMatch[1].replace(/<[^>]+>/g, '');
    transliteration = decodeHTMLEntities(transliteration.trim());
    if (transliteration && transliteration.length > 0) {
      return transliteration;
    }
  }

  // Pattern 2: Look for romanization in <span class="...romanization...">
  // This is a fallback for pages that might use a different format
  const romanizationSpanRegex = /<span[^>]*class="[^"]*romanization[^"]*"[^>]*>([^<]+)<\/span>/i;
  const romanMatch = languageSection.match(romanizationSpanRegex);

  if (romanMatch) {
    const transliteration = decodeHTMLEntities(romanMatch[1].trim());
    if (transliteration && transliteration.length > 0) {
      return transliteration;
    }
  }

  // Pattern 3: Look for lang="xx-Latn" elements (Latin script for the language)
  // Example: <span lang="ar-Latn">marḥaban</span> or <b lang="ar-Latn">marḥaban</b>
  const langCode = languageName === 'Arabic' ? 'ar' :
                   languageName === 'Korean' ? 'ko' :
                   languageName === 'Chinese' ? 'zh' :
                   languageName === 'Mandarin' ? 'zh' :
                   languageName === 'Cantonese' ? 'yue' : '';

  if (langCode) {
    // Try various tag types (span, b, strong, i)
    const latinRegex = new RegExp(`<(?:span|b|strong|i)[^>]*lang="${langCode}-Latn"[^>]*>([^<]+)<\/(?:span|b|strong|i)>`, 'i');
    const latinMatch = headerSection.match(latinRegex);

    if (latinMatch) {
      const transliteration = decodeHTMLEntities(latinMatch[1].trim());
      if (transliteration && transliteration.length > 0) {
        return transliteration;
      }
    }
  }

  return undefined;
}
