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
 * NOTE: Chinese pages often use a different structure without word type headings (h3/h4).
 * Instead they use "Definitions" sections with complex table structures. This parser works
 * for Chinese phrases/expressions but has limited coverage for individual characters.
 * See https://github.com/yourproject/wikiglot/issues for planned improvements.
 *
 * @param html - The HTML content from English Wiktionary
 * @param sourceLanguage - The source language name (e.g., "Spanish", "French", "Latin", "Chinese")
 * @returns Array of translations grouped by word type with English meanings
 */
export function parseEnglishWiktionaryForeignWord(
  html: string,
  sourceLanguage: string
): WordTypeTranslations[] {
  const result: WordTypeTranslations[] = [];

  // Find the language section (h2 heading)
  // Note: Wiktionary sometimes wraps h2 in divs, so we search flexibly
  const languageSectionRegex = new RegExp(`<h2[^>]*id="${sourceLanguage}"[^>]*>${sourceLanguage}</h2>`, 'i');
  let langMatch = html.match(languageSectionRegex);

  // If not found, try a more flexible pattern (for cases where h2 is wrapped in divs)
  if (!langMatch) {
    const flexibleRegex = new RegExp(`id="${sourceLanguage}"[\\s\\S]{0,50}?>${sourceLanguage}</h2>`, 'i');
    langMatch = html.match(flexibleRegex);
  }

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

  // Check for special redirect formats (e.g., Japanese ja-see template, Chinese zh-see template)
  // Format: <table class="wikitable ja-see">...[interjection] <a href="/wiki/word">word</a>...
  // Format: <table class="wikitable zh-see">...see 謝謝 ("<a href="/wiki/thanks">thanks</a>")...
  // This is used for alternate spellings that redirect to the main entry
  const redirectFormatMatch = languageSection.match(/<table[^>]*class="[^"]*(?:ja-see|zh-see)[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (redirectFormatMatch) {
    const tableContent = redirectFormatMatch[1];

    // TWO DIFFERENT FORMATS:
    // 1. Japanese ja-see: <span>[interjection]</span> <a href="/wiki/word">word</a>
    // 2. Chinese zh-see: see 謝謝 ("<a href="/wiki/thanks">thanks</a>; <a href="/wiki/thank_you">thank you</a>")

    // Try Japanese format first (with [word type] in brackets)
    const definitionRegex = /<span[^>]*>[\s\S]*?\[([^\]]+)\][\s\S]*?<\/span>([\s\S]*?)(?=<\/td>|<\/dd>)/gi;
    let defMatch;

    while ((defMatch = definitionRegex.exec(tableContent)) !== null) {
      const wordType = defMatch[1].trim().toLowerCase();
      const definitionContent = defMatch[2];

      // Extract English translations from links
      const linkRegex = /<a[^>]*href="\/wiki\/([^"#]+)"[^>]*>([^<]+)<\/a>/g;
      let linkMatch;
      const englishWords: string[] = [];

      while ((linkMatch = linkRegex.exec(definitionContent)) !== null) {
        const word = linkMatch[2].trim();
        if (!word.includes('Appendix:') && !word.includes('File:') && word.length > 0) {
          englishWords.push(word);
        }
      }

      if (englishWords.length > 0) {
        // Extract the full meaning text (plain text after word type)
        let meaningText = definitionContent.replace(/<[^>]+>/g, ' ');
        meaningText = decodeHTMLEntities(meaningText).trim().replace(/\s+/g, ' ');
        meaningText = meaningText.replace(/^:\s*/, ''); // Remove leading colon

        const translations: TranslationWithMeaning[] = englishWords.map(word => ({
          translation: word,
          meaning: meaningText || englishWords.join(', ')
        }));

        result.push({
          wordType,
          translations
        });
      }
    }

    // If Japanese format didn't work, try Chinese zh-see format
    // Pattern: see 謝謝 ("<a href="/wiki/thanks">thanks</a>; <a href="/wiki/thank_you">thank you</a>")
    // Chinese zh-see templates show the definition inline in the redirect table
    if (result.length === 0 && sourceLanguage === 'Chinese') {
      // Extract ALL English word links from the zh-see table
      // Simpler approach: just get all links and filter for English
      const linkRegex = /<a[^>]*href="\/wiki\/([^"#]+)"[^>]*>([^<]+)<\/a>/g;
      let linkMatch;
      const englishWords: string[] = [];

      while ((linkMatch = linkRegex.exec(tableContent)) !== null) {
        const word = linkMatch[2].trim();
        // Skip Chinese characters, external links, and meta links
        if (!/[\u4E00-\u9FFF]/.test(word) &&
            !linkMatch[1].includes('Appendix:') &&
            !linkMatch[1].includes('File:') &&
            !linkMatch[1].includes('http') &&
            !linkMatch[1].includes('Simplified_Chinese') &&
            !linkMatch[1].includes('Traditional_Chinese') &&
            word.length > 0 &&
            word.length < 50) {
          englishWords.push(word);
        }
      }

      if (englishWords.length > 0) {
        // Extract meaning text from the table (strip HTML)
        let meaningText = tableContent.replace(/<[^>]+>/g, ' ');
        meaningText = decodeHTMLEntities(meaningText).trim().replace(/\s+/g, ' ');

        // Clean up the meaning text - extract just the relevant part
        const meaningMatch = meaningText.match(/see\s+\S+\s+\(([^)]+)\)/);
        if (meaningMatch) {
          meaningText = meaningMatch[1];
        } else {
          meaningText = englishWords.join(', ');
        }

        const translations: TranslationWithMeaning[] = englishWords.map(word => ({
          translation: word,
          meaning: meaningText
        }));

        // Default to interjection for Chinese phrases (most common for zh-see redirects)
        result.push({
          wordType: 'interjection',
          translations
        });
      }
    }

    // If we found translations in the redirect format, return early
    if (result.length > 0) {
      return result;
    }
  }

  // Check if this is a verb form by looking for patterns in definitions
  const verbFormInfo = detectVerbForm(languageSection);

  // SPECIAL HANDLING FOR CHINESE: Many Chinese character pages use "Definitions" section instead of word types
  // Pattern: <h3 id="Definitions">Definitions</h3> OR <h4 id="Definitions">Definitions</h4> followed by <ol><li>...</li></ol>
  // The definitions include English translations embedded in the text
  // NOTE: Can be h3 OR h4 depending on whether it's nested under Etymology sections
  if (sourceLanguage === 'Chinese') {
    const definitionsMatch = languageSection.match(/<h[34][^>]*id="Definitions"[^>]*>Definitions<\/h[34]>/i);
    if (definitionsMatch) {
      const defStart = definitionsMatch.index!;
      const restAfterDef = languageSection.slice(defStart + definitionsMatch[0].length);
      const nextHeadingMatch = restAfterDef.match(/<h[345][^>]*id="/);
      const defEnd = nextHeadingMatch ? defStart + definitionsMatch[0].length + nextHeadingMatch.index! : languageSection.length;
      const definitionsSection = languageSection.slice(defStart, defEnd);

      // Extract definitions from <ol><li> tags
      const translations: TranslationWithMeaning[] = [];
      const olMatch = definitionsSection.match(/<ol[^>]*>([\s\S]*?)<\/ol>/);

      if (olMatch) {
        const liRegex = /<li[^>]*>([\s\S]*?)(?=<\/li>|<ol>|<li>)/g;
        let liMatch;

        while ((liMatch = liRegex.exec(olMatch[1])) !== null) {
          let definition = liMatch[1];

          // Remove nested lists and complex structures
          definition = definition.replace(/<ol[\s\S]*?<\/ol>/g, '');
          definition = definition.replace(/<ul[\s\S]*?<\/ul>/g, '');
          definition = definition.replace(/<div[\s\S]*?<\/div>/g, '');

          // Extract English words from the definition
          // Chinese definitions typically start with English translation(s) in plain text or links
          // Pattern 1: English word links like <a href="/wiki/dog">dog</a>
          const linkRegex = /<a[^>]*href="\/wiki\/([^"#]+)"[^>]*>([^<]+)<\/a>/g;
          let linkMatch;
          const englishWords: string[] = [];

          while ((linkMatch = linkRegex.exec(definition)) !== null) {
            const word = linkMatch[2].trim();
            // Skip Chinese characters, appendix links, and meta links
            if (!/[\u4E00-\u9FFF]/.test(word) &&
                !word.includes('Appendix:') &&
                !word.includes('File:') &&
                !word.includes('Classifier:') &&
                word.length > 0) {
              englishWords.push(word);
            }
          }

          // Pattern 2: Plain English text at the start of the definition (before any Chinese characters or parentheses)
          // Example: "dog ( Classifier: 隻 ／ 只 ..."
          if (englishWords.length === 0) {
            let plainText = definition.replace(/<[^>]+>/g, ' ');
            plainText = decodeHTMLEntities(plainText).trim();

            // Extract text before first Chinese character or opening parenthesis
            const beforeChineseMatch = plainText.match(/^([^(\u4E00-\u9FFF]+?)[\((\u4E00-\u9FFF]/);
            if (beforeChineseMatch) {
              const englishPart = beforeChineseMatch[1].trim();
              if (englishPart.length > 0 && englishPart.length < 100) {
                englishWords.push(englishPart);
              }
            }
          }

          if (englishWords.length > 0) {
            // Extract full meaning text for context
            let meaningText = definition.replace(/<[^>]+>/g, ' ');
            meaningText = decodeHTMLEntities(meaningText).trim().replace(/\s+/g, ' ');
            // Limit meaning text length for readability
            if (meaningText.length > 200) {
              meaningText = meaningText.slice(0, 200) + '...';
            }

            const primaryTranslation = englishWords[0];
            translations.push({
              translation: primaryTranslation,
              meaning: englishWords.join(', ')
            });
          }
        }
      }

      if (translations.length > 0) {
        // Chinese character pages don't specify word type in the same way
        // Default to 'noun' for characters (most common), but could be multiple types
        result.push({
          wordType: 'noun',
          translations
        });

        // Return early since we found Chinese definitions
        return result;
      }
    }
  }

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

    // If still not found, try flexible pattern (for cases where headers are wrapped in divs)
    if (!match) {
      typeRegex = new RegExp(`id="${type.name}[^"]*"[\\s\\S]{0,50}?>${type.name}</h[34]>`, 'i');
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
        // Remove <dl> tags which contain synonyms, usage notes, and other metadata
        definition = definition.replace(/<dl[\s\S]*?<\/dl>/g, '');

        // Skip this item if it doesn't contain a wiki link early in the definition
        // (filters out usage examples, quotations, and other non-definition content)
        // Allow for short text before the link (e.g., "to love" in Latin definitions)
        if (!/^\s*(?:\w+\s+)?<a[^>]*href="\/wiki\//.test(definition)) {
          continue;
        }

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
          // Create a separate translation entry for each English word
          // This ensures all translations are searchable, not just the first one
          const meaning = englishWords.join(', ');

          for (const word of englishWords) {
            translations.push({
              translation: word,
              meaning: meaning
            });
          }
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
  // Character class includes Latin macrons (āēīōū) and breves (ăĕĭŏŭ) for Latin support
  const verbFormPatterns = [
    // Matches: "inflection of comer:" or "inflection of manger:" or "inflection of amō:"
    /inflection(?:<[^>]+>|\s)+of(?:<[^>]+>|\s)+([a-zA-Záéíóúñüāēīōūăĕĭŏŭ]+)/i,

    // Matches: "simple past of eat" or "simple past tense of run"
    /simple(?:<[^>]+>|\s)+past(?:(?:<[^>]+>|\s)+tense)?(?:<[^>]+>|\s)+(?:and(?:<[^>]+>|\s)+past(?:<[^>]+>|\s)+participle(?:<[^>]+>|\s)+)?of(?:<[^>]+>|\s)+([a-zA-Záéíóúñüāēīōūăĕĭŏŭ]+)/i,

    // Matches: "present participle and gerund of run" or "past participle of comer"
    /(?:present|past)(?:<[^>]+>|\s)+participle(?:(?:<[^>]+>|\s)+and(?:<[^>]+>|\s)+gerund)?(?:<[^>]+>|\s)+of(?:<[^>]+>|\s)+([a-zA-Záéíóúñüāēīōūăĕĭŏŭ]+)/i,

    // Matches: "gerund of running"
    /gerund(?:<[^>]+>|\s)+of(?:<[^>]+>|\s)+([a-zA-Záéíóúñüāēīōūăĕĭŏŭ]+)/i,

    // Matches: "first-person singular preterite indicative of hablar"
    // Handles: "first-person", "third-person", "first/third-person", etc.
    // Allows for complex HTML structures like <span><a>first</a><span>/</span><a>third-person</a></span>
    /(?:first|second|third)(?:[\s\S]{0,150}?person)[\s\S]{1,200}?(?:singular|plural)[\s\S]{1,150}?(?:present|past|future|imperfect|preterite|conditional|subjunctive|imperative)[\s\S]{1,150}?(?:of)[\s\S]{1,50}?(?:<[^>]+>)*([a-zA-Záéíóúñüāēīōūăĕĭŏŭ]+)/i,

    // Matches: "past tense of go" or "past participle of see"
    /past(?:<[^>]+>|\s)+(?:tense|participle)(?:<[^>]+>|\s)+of(?:<[^>]+>|\s)+([a-zA-Záéíóúñüāēīōūăĕĭŏŭ]+)/i,

    // Matches: "present tense of goes"
    /present(?:<[^>]+>|\s)+(?:tense)?(?:<[^>]+>|\s)*of(?:<[^>]+>|\s)+([a-zA-Záéíóúñüāēīōūăĕĭŏŭ]+)/i,
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
