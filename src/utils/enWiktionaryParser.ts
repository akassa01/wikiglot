import { WordTypeTranslations, TranslationWithMeaning } from "../types";

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
 * Parse English Wiktionary for foreign language word definitions and English translations
 * This is used when translating between English and another language using en.wiktionary.org
 * Structure: Language (h2) -> Etymology (h3) -> Word Type (h3 or h4) -> Definition list with English translations
 *
 * @param html - The HTML content from English Wiktionary
 * @param sourceLanguage - The source language name (e.g., "Spanish", "French", "Latin")
 * @returns Array of translations grouped by word type with English meanings
 */
export function parseEnglishWiktionaryForeignWord(
  html: string,
  sourceLanguage: string
): WordTypeTranslations[] {
  const result: WordTypeTranslations[] = [];

  // Find the language section (h2 heading)
  const languageSectionRegex = new RegExp(`<h2[^>]*id="${sourceLanguage}"[^>]*>${sourceLanguage}</h2>`, 'i');
  const langMatch = html.match(languageSectionRegex);

  if (!langMatch) {
    return result;
  }

  const langStart = langMatch.index!;

  // Find the next h2 (next language section) to know where this language section ends
  const nextH2Regex = /<h2[^>]*id="[^"]*"[^>]*>/;
  const restAfterLang = html.slice(langStart + langMatch[0].length);
  const nextH2Match = restAfterLang.match(nextH2Regex);
  const langEnd = nextH2Match ? langStart + langMatch[0].length + nextH2Match.index! : html.length;

  const languageSection = html.slice(langStart, langEnd);

  // Check if this is a verb form by looking for patterns in definitions
  const verbFormInfo = detectVerbForm(languageSection);

  // Word types to look for (h3 or h4 depending on whether there's an Etymology section)
  const wordTypes = [
    { key: 'noun', name: 'Noun' },
    { key: 'verb', name: 'Verb' },
    { key: 'participle', name: 'Participle' },
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
    // Try to find word type at h3 or h4 level
    let typeRegex = new RegExp(`<h[34][^>]*id="${type.name}[^"]*"[^>]*>${type.name}</h[34]>`, 'i');
    let match = languageSection.match(typeRegex);

    if (!match) {
      // Try with just partial match (e.g., "Noun_19" or "Verb_7")
      typeRegex = new RegExp(`<h[34][^>]*id="[^"]*${type.name}[^"]*"[^>]*>${type.name}</h[34]>`, 'i');
      match = languageSection.match(typeRegex);
    }

    if (!match) continue;

    const typeStart = match.index!;

    // Find the next h3/h4/h5 heading to know where this word type section ends
    const restAfterType = languageSection.slice(typeStart + match[0].length);
    const nextHeadingMatch = restAfterType.match(/<h[345][^>]*id="/);
    const typeEnd = nextHeadingMatch ? typeStart + match[0].length + nextHeadingMatch.index! : languageSection.length;

    const typeSection = languageSection.slice(typeStart, typeEnd);

    // Check if this specific word type section is a verb form
    const sectionVerbForm = detectVerbForm(typeSection);

    // Extract definitions from <ol><li> tags
    // The text inside <li> contains English translations/definitions
    const translations: TranslationWithMeaning[] = [];
    const olMatch = typeSection.match(/<ol[^>]*>([\s\S]*?)<\/ol>/);

    if (olMatch) {
      // Extract all <li> items
      const liRegex = /<li[^>]*>([\s\S]*?)(?=<\/li>|<ol>|<li>)/g;
      let liMatch;

      while ((liMatch = liRegex.exec(olMatch[1])) !== null) {
        let definition = liMatch[1];

        // Remove nested lists and other complex structures
        definition = definition.replace(/<ol[\s\S]*?<\/ol>/g, '');
        definition = definition.replace(/<ul[\s\S]*?<\/ul>/g, '');
        definition = definition.replace(/<div[\s\S]*?<\/div>/g, '');

        // Extract just the linked words (English translations)
        // Pattern: <a href="/wiki/word">word</a>
        const linkRegex = /<a[^>]*href="\/wiki\/([^"#]+)"[^>]*>([^<]+)<\/a>/g;
        let linkMatch;
        const englishWords: string[] = [];

        while ((linkMatch = linkRegex.exec(definition)) !== null) {
          const word = linkMatch[2].trim();
          // Skip if it's a reference link or meta link
          if (!word.includes('Appendix:') && !word.includes('File:') && word.length > 0) {
            englishWords.push(word);
          }
        }

        // If we found English words, add them as translations
        if (englishWords.length > 0) {
          // Use the first English word as the primary translation
          // and include others as part of the meaning
          const primaryTranslation = englishWords[0];
          const meaning = englishWords.join(', ');

          translations.push({
            translation: primaryTranslation,
            meaning: meaning
          });
        } else {
          // Fallback: extract plain text definition
          let plainDef = definition.replace(/<[^>]+>/g, '');
          plainDef = decodeHTMLEntities(plainDef);
          plainDef = plainDef.trim().replace(/\s+/g, ' ');

          if (plainDef && plainDef.length > 0 && plainDef.length < 200) {
            translations.push({
              translation: plainDef.split(/[,;]/)[0].trim(),
              meaning: plainDef
            });
          }
        }
      }
    }

    if (translations.length > 0) {
      const entry: WordTypeTranslations = {
        wordType: type.key,
        translations
      };

      // Add verbForm metadata if this section is a verb form or participle
      if (sectionVerbForm) {
        entry.verbForm = sectionVerbForm;
      } else if (verbFormInfo && (type.key === 'verb' || type.key === 'participle')) {
        // Fall back to language-level detection for verb/participle types
        entry.verbForm = verbFormInfo;
      }

      result.push(entry);
    }
  }

  return result;
}

/**
 * Detect if a word is a verb form and extract the base verb
 * Returns information about the verb form if detected, null otherwise
 * Also detects participles that reference a base verb
 */
function detectVerbForm(languageSection: string): { baseVerb: string; formType: string } | null {
  // Look specifically in the first definition (inside <ol><li>)
  const olMatch = languageSection.match(/<ol[^>]*>([\s\S]*?)<\/ol>/);
  if (!olMatch) return null;

  const firstOl = olMatch[1];
  const firstLiMatch = firstOl.match(/<li[^>]*>([\s\S]*?)(?=<\/li>|<ol>|<li>)/);
  if (!firstLiMatch) return null;

  const firstDefinition = firstLiMatch[1];

  // Common patterns for verb forms in Wiktionary definitions
  // These patterns should match definitions that explicitly state this is a form of another verb
  // Note: Patterns allow HTML tags between words using (?:<[^>]+>|\s)+
  const verbFormPatterns = [
    // Matches: "inflection of comer:" or "inflection of manger:"
    /inflection(?:<[^>]+>|\s)+of(?:<[^>]+>|\s)+([a-zA-Záéíóúñü]+)/i,

    // Matches: "simple past of eat" or "simple past tense of run"
    /simple(?:<[^>]+>|\s)+past(?:(?:<[^>]+>|\s)+tense)?(?:<[^>]+>|\s)+(?:and(?:<[^>]+>|\s)+past(?:<[^>]+>|\s)+participle(?:<[^>]+>|\s)+)?of(?:<[^>]+>|\s)+([a-zA-Záéíóúñü]+)/i,

    // Matches: "present participle and gerund of run" or "past participle of comer"
    /(?:present|past)(?:<[^>]+>|\s)+participle(?:(?:<[^>]+>|\s)+and(?:<[^>]+>|\s)+gerund)?(?:<[^>]+>|\s)+of(?:<[^>]+>|\s)+([a-zA-Záéíóúñü]+)/i,

    // Matches: "gerund of running"
    /gerund(?:<[^>]+>|\s)+of(?:<[^>]+>|\s)+([a-zA-Záéíóúñü]+)/i,

    // Matches: "first-person singular preterite indicative of hablar"
    // Handles: "first-person", "third-person", "first/third-person", etc.
    // Allows for complex HTML structures like <span><a>first</a><span>/</span><a>third-person</a></span>
    /(?:first|second|third)(?:[\s\S]{0,150}?person)[\s\S]{1,200}?(?:singular|plural)[\s\S]{1,150}?(?:present|past|future|imperfect|preterite|conditional|subjunctive|imperative)[\s\S]{1,150}?(?:of)[\s\S]{1,50}?(?:<[^>]+>)*([a-zA-Záéíóúñü]+)/i,

    // Matches: "past tense of go" or "past participle of see"
    /past(?:<[^>]+>|\s)+(?:tense|participle)(?:<[^>]+>|\s)+of(?:<[^>]+>|\s)+([a-zA-Záéíóúñü]+)/i,

    // Matches: "present tense of goes"
    /present(?:<[^>]+>|\s)+(?:tense)?(?:<[^>]+>|\s)*of(?:<[^>]+>|\s)+([a-zA-Záéíóúñü]+)/i,
  ];

  for (const pattern of verbFormPatterns) {
    const match = firstDefinition.match(pattern);
    if (match) {
      const baseVerb = match[1].trim();

      // Extract the form type description (everything before "of")
      // Remove HTML tags first
      const cleanMatch = match[0].replace(/<[^>]+>/g, '').trim();
      const ofIndex = cleanMatch.search(/\s+of\s+/i);
      const formType = ofIndex !== -1 ? cleanMatch.substring(0, ofIndex).trim() : cleanMatch;

      return {
        baseVerb,
        formType
      };
    }
  }

  return null;
}

/**
 * Detect if an English word is a verb form in the English section
 * This checks the English section's definition structure
 */
export function detectEnglishVerbForm(html: string): { baseVerb: string; formType: string } | null {
  // Find the English section
  const englishSectionRegex = /<h2[^>]*id="English"[^>]*>English<\/h2>/i;
  const englishMatch = html.match(englishSectionRegex);
  if (!englishMatch) return null;

  const englishStart = englishMatch.index!;
  const nextH2Regex = /<h2[^>]*id="[^"]*"[^>]*>/;
  const restAfterEnglish = html.slice(englishStart + englishMatch[0].length);
  const nextH2Match = restAfterEnglish.match(nextH2Regex);
  const englishEnd = nextH2Match ? englishStart + englishMatch[0].length + nextH2Match.index! : html.length;
  const englishSection = html.slice(englishStart, englishEnd);

  // Look in verb sections first (h3 or h4)
  // Match patterns like: <h4 id="Verb">Verb</h4> or <h3 id="Verb_2">Verb</h3>
  const verbSectionRegex = /<h[34][^>]*\bid="Verb(?:_\d+)?"[^>]*>Verb<\/h[34]>/i;
  const verbMatch = englishSection.match(verbSectionRegex);

  if (!verbMatch) return null;

  const verbStart = verbMatch.index!;
  const nextHeadingRegex = /<h[234][^>]*id="/i;
  const restAfterVerb = englishSection.slice(verbStart + verbMatch[0].length);
  const nextHeadingMatch = restAfterVerb.match(nextHeadingRegex);
  const verbEnd = nextHeadingMatch ? verbStart + verbMatch[0].length + nextHeadingMatch.index! : englishSection.length;
  const verbSection = englishSection.slice(verbStart, verbEnd);

  // Look for definition list
  const olMatch = verbSection.match(/<ol[^>]*>([\s\S]*?)<\/ol>/);
  if (!olMatch) return null;

  const firstLiMatch = olMatch[1].match(/<li[^>]*>([\s\S]*?)(?=<\/li>|<ol>|<li>)/);
  if (!firstLiMatch) return null;

  const firstDefinition = firstLiMatch[1];

  // Patterns for English verb forms
  // Note: Words may be separated by HTML tags like <a>present</a> <a>participle</a>
  // And the verb name appears inside nested tags like <i><a>verb</a></i>
  const verbFormPatterns = [
    // Matches: "inflection of eat"
    /inflection(?:<[^>]+>|\s)+of(?:<[^>]+>|\s)+([a-zA-Z]+)/i,

    // Matches: "simple past of eat" or "simple past tense of run"
    /simple(?:<[^>]+>|\s)+past(?:(?:<[^>]+>|\s)+tense)?(?:<[^>]+>|\s)+(?:and(?:<[^>]+>|\s)+past(?:<[^>]+>|\s)+participle(?:<[^>]+>|\s)+)?of(?:<[^>]+>|\s)+([a-zA-Z]+)/i,

    // Matches: "present participle and gerund of run"
    /present(?:<[^>]+>|\s)+participle(?:<[^>]+>|\s)+(?:and(?:<[^>]+>|\s)+gerund(?:<[^>]+>|\s)+)?of(?:<[^>]+>|\s)+([a-zA-Z]+)/i,

    // Matches: "past participle of see"
    /past(?:<[^>]+>|\s)+participle(?:<[^>]+>|\s)+(?:and(?:<[^>]+>|\s)+past(?:<[^>]+>|\s)+participle(?:<[^>]+>|\s)+)?of(?:<[^>]+>|\s)+([a-zA-Z]+)/i,

    // Matches: "gerund of running"
    /gerund(?:<[^>]+>|\s)+of(?:<[^>]+>|\s)+([a-zA-Z]+)/i,

    // Matches: "third-person singular present indicative of go"
    /(?:first|second|third)(?:<[^>]+>|\s|-)+person(?:<[^>]+>|\s)+(?:singular|plural)(?:<[^>]+>|\s)+(?:present|past|future|imperfect|preterite)(?:<[^>]+>|\s)+(?:indicative|subjunctive)?(?:<[^>]+>|\s)*of(?:<[^>]+>|\s)+([a-zA-Z]+)/i,

    // Matches: "past tense of go"
    /past(?:<[^>]+>|\s)+tense(?:<[^>]+>|\s)+of(?:<[^>]+>|\s)+([a-zA-Z]+)/i,

    // Matches: "present tense of goes"
    /present(?:<[^>]+>|\s)+(?:tense(?:<[^>]+>|\s)+)?of(?:<[^>]+>|\s)+([a-zA-Z]+)/i,
  ];

  for (const pattern of verbFormPatterns) {
    const match = firstDefinition.match(pattern);
    if (match) {
      const baseVerb = match[1].trim();
      const cleanMatch = match[0].replace(/<[^>]+>/g, '').trim();
      const ofIndex = cleanMatch.search(/\s+of\s+/i);
      const formType = ofIndex !== -1 ? cleanMatch.substring(0, ofIndex).trim() : cleanMatch;

      return {
        baseVerb,
        formType
      };
    }
  }

  return null;
}
