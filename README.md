# Wikiglot

Simple, fast translation library using English Wiktionary with support for 15 languages.

## Features

- ✅ Translate between English and 14 other languages (Spanish, French, Italian, German, Portuguese, Swedish, Indonesian, Swahili, Turkish, Arabic, Korean, Chinese, Japanese, **Latin**)
- ✅ **Latin inflection forms** - Automatic extraction of verb principal parts, noun declensions, and adjective forms
- ✅ **Headword transliteration** - Automatic romanization extraction for character-based languages (Arabic, Korean, Chinese, Japanese)
- ✅ **Automatic accent correction** - Forgiving search that finds "azúcar" when you type "azucar"
- ✅ Automatic verb form detection and base verb translation
- ✅ Pronunciation (IPA) extraction
- ✅ Organized by word type (noun, verb, adjective, phrase, etc.)
- ✅ Built-in rate limiting
- ✅ Zero dependencies (except node-fetch)
- ✅ TypeScript support

## Installation

```bash
npm install wikiglot
```

## Quick Start

```typescript
import { Wikiglot } from 'wikiglot';

const translator = new Wikiglot();

// Translate from Spanish to English
const result = await translator.translate('hola', 'es', 'en');

console.log(result.translationsByType);
// [
//   {
//     wordType: 'interjection',
//     translations: [
//       { translation: 'hello', meaning: 'greeting' },
//       { translation: 'hi', meaning: 'greeting' }
//     ]
//   }
// ]
```

## API

### `new Wikiglot(options?)`

Create a new Wikiglot instance.

**Options:**
- `userAgent?: string` - Custom User-Agent for API requests
- `timeout?: number` - Request timeout in milliseconds (default: 10000)
- `rateLimit?: { maxRequests: number, perMilliseconds: number }` - Rate limiting configuration

```typescript
const translator = new Wikiglot({
  userAgent: 'MyApp/1.0.0 (contact@example.com)',
  timeout: 5000,
  rateLimit: {
    maxRequests: 1,
    perMilliseconds: 1000 // 1 request per second
  }
});
```

### `translate(word, sourceLanguage, targetLanguage): Promise<TranslationResult>`

Translate a word between supported languages.

**Parameters:**
- `word: string` - The word to translate
- `sourceLanguage: string` - Source language code (see supported languages below)
- `targetLanguage: string` - Target language code (see supported languages below)

**Returns:** `Promise<TranslationResult>`

```typescript
interface TranslationResult {
  word: string;
  sourceLanguage: string;
  targetLanguage: string;
  translationsByType: WordTypeTranslations[];
  pronunciation?: string;
  searchedFor?: string;  // Original query if accent correction was applied
  foundAs?: string;      // Corrected word that was actually found
}

interface WordTypeTranslations {
  wordType: string; // 'noun', 'verb', 'adjective', etc.
  translations: Translation[];
  verbForm?: {
    baseVerb: string;
    formType: string;
  };
}

interface Translation {
  translation: string;      // The translated word
  transliteration?: string; // Romanization (for character-based languages)
  meaning: string;          // Context/definition (helps disambiguate multiple meanings)
}
```

## Examples

### Latin with Inflection Forms

Wikiglot automatically extracts Latin grammatical forms:

```typescript
// Verb: Returns 4 principal parts
const verbResult = await translator.translate('love', 'en', 'la');
console.log(verbResult.translationsByType[0].translations[0].latinVerbForms);
// {
//   firstPersonPresent: 'amō',     // 1st person singular present
//   infinitive: 'amāre',           // present infinitive
//   firstPersonPerfect: 'amāvī',   // 1st person singular perfect
//   supine: 'amātum'               // supine
// }

// Noun: Returns nominative, genitive, and gender
const nounResult = await translator.translate('water', 'en', 'la');
console.log(nounResult.translationsByType[0].translations[0].latinNounForms);
// {
//   nominative: 'aqua',
//   genitive: 'aquae',
//   gender: 'f'
// }

// Adjective: Returns masculine, feminine, and neuter forms
const adjResult = await translator.translate('human', 'en', 'la');
console.log(adjResult.translationsByType[0].translations[0].latinAdjectiveForms);
// {
//   masculine: 'hūmānus',
//   feminine: 'hūmāna',
//   neuter: 'hūmānum'
// }
```

### Verb Form Detection

Wikiglot automatically detects verb forms and includes base verb translations:

```typescript
const result = await translator.translate('eating', 'en', 'es');

// Returns translations for both "eating" AND "eat"
// with verbForm metadata indicating it's a "present participle of eat"
```

### With Pronunciation

```typescript
const result = await translator.translate('bonjour', 'fr', 'en');

console.log(result.pronunciation); // "/bɔ̃.ʒuʁ/"
console.log(result.translationsByType[0].translations);
// [{ translation: 'hello', meaning: 'greeting' }, ...]
```

### Character-Based Languages with Transliteration

For Arabic, Korean, and other character-based languages, Wikiglot automatically extracts romanization:

```typescript
// Arabic → English
const arabicResult = await translator.translate('مرحبا', 'ar', 'en');

console.log(arabicResult.headwordTransliteration); // "marḥaban"
console.log(arabicResult.translationsByType);
// [{ wordType: 'interjection', translations: [{ translation: 'hello', ... }] }]

// Korean → English
const koreanResult = await translator.translate('안녕하세요', 'ko', 'en');

console.log(koreanResult.headwordTransliteration); // "annyeonghaseyo"
console.log(koreanResult.translationsByType);
// [{ wordType: 'phrase', translations: [{ translation: 'hello', ... }] }]

// Japanese → English
const japaneseResult = await translator.translate('こんにちは', 'ja', 'en');

console.log(japaneseResult.headwordTransliteration); // "konnichiwa"
console.log(japaneseResult.translationsByType);
// [{ wordType: 'interjection', translations: [{ translation: 'hello', ... }] }]

// English → Arabic (translations may include transliterations)
const enToArResult = await translator.translate('hello', 'en', 'ar');
console.log(enToArResult.translationsByType[0].translations);
// [{ translation: 'مَرْحَبًا', transliteration: 'marḥaban', meaning: 'greeting' }, ...]
```

### Reverse Transliteration Search

Search for character-based words when you only know the romanization:

```typescript
// Find Korean word from romanization
const suggestions = await translator.searchByTransliteration('annyeonghaseyo', 'ko');
// Returns: ['안녕하세요', '안녕', '안녕하다', ...]

// Translate the result
if (suggestions.length > 0) {
  const result = await translator.translate(suggestions[0], 'ko', 'en');
  console.log(result.translationsByType[0].translations[0].translation);
  // Output: "How are you?"
}

// Find Arabic word from romanization
const arabicSuggestions = await translator.searchByTransliteration('shukran', 'ar');
// Returns: ['شكرا', ...]

// Find Japanese word from romanization
const japaneseSuggestions = await translator.searchByTransliteration('konnichiwa', 'ja');
// Returns: ['こんにちは', ...]

// Works for any romanization
const search = await translator.searchByTransliteration('marhaban');
// Returns suggestions for any language
```

**Limitations:**
- Accuracy depends on Wiktionary's search indexing
- Some romanizations may not return results even if the word exists on Wiktionary
- Works best with standard romanizations (Revised Romanization for Korean, Pinyin for Chinese)
- Arabic may require diacritics for better results (e.g., "salām" works better than "salam")
- Returns empty array if no matches found in the target language's script

### Accent Correction

Wikiglot automatically corrects missing accents and handles common misspellings. This is especially useful when users search from external platforms where typing accents is difficult.

```typescript
// All of these work, even without perfect spelling:
const result1 = await translator.translate('azucar', 'es', 'en');      // → finds "azúcar"
const result2 = await translator.translate('revolucion', 'es', 'en');  // → finds "revolución"
const result3 = await translator.translate('ecole', 'fr', 'en');       // → finds "école"
const result4 = await translator.translate('cafe', 'pt', 'en');        // → finds "café"

// Check if a correction was made and notify users
if (result1.searchedFor) {
  console.log(`Searched for "${result1.searchedFor}", showing results for "${result1.foundAs}"`);
  // Output: Searched for "azucar", showing results for "azúcar"
}
```

**How it works:**

1. **Fast path:** Direct lookup with your exact query
2. **Smart fallback:** If the page doesn't exist OR exists but has no content in your target language:
   - Queries Wiktionary's search API for suggestions
   - Filters to single-word matches
   - Prefers accented versions when the original has no accents
   - Retries with the best match
3. **Transparent:** Returns correction metadata (`searchedFor`, `foundAs`) so you can inform users

**Real-world cases this solves:**

| Query | Issue | Solution |
|-------|-------|----------|
| `azucar` | Page doesn't exist | Finds `azúcar` (Spanish) |
| `revolucion` | Exists for Esperanto, not Spanish | Finds `revolución` (Spanish) |
| `cafe` | Exists for English, not Portuguese | Finds `café` (Portuguese) |
| `ecole` | Page doesn't exist | Finds `école` (French) |

**Performance:**
- ✅ **Zero overhead** for exact matches (no extra API calls)
- ✅ **1 extra API call** only when corrections are needed
- ✅ **Automatic** - works out of the box, no configuration required

**Use case:**
Perfect for search interfaces where users might:
- Type on mobile keyboards without easy accent access
- Copy/paste from platforms that strip accents
- Simply forget or not know the correct accents

### Rate Limiting

```typescript
const translator = new Wikiglot({
  rateLimit: {
    maxRequests: 1,
    perMilliseconds: 1000
  }
});

// Requests will be automatically rate-limited
await translator.translate('hello', 'en', 'fr');
await translator.translate('world', 'en', 'fr');
```

## Supported Languages

- English (`en`)
- Spanish (`es`)
- French (`fr`)
- Italian (`it`)
- German (`de`)
- Portuguese (`pt`)
- Swedish (`sv`)
- Indonesian (`id`)
- Swahili (`sw`)
- Turkish (`tr`)
- Arabic (`ar`) - with automatic romanization
- Korean (`ko`) - with automatic romanization
- Mandarin Chinese (`zh`) - with automatic Pinyin romanization
- Japanese (`ja`) - with automatic romaji romanization
- **Latin (`la`)** - with automatic extraction of verb principal parts, noun declensions, and adjective forms

**Note:** Currently, one of the languages must be English (source or target) as the library uses English Wiktionary.

**Chinese Language Notes:**
- ✅ Chinese → English works for both individual characters and phrases (e.g., 狗 → "dog", 你好 → "hello", 谢谢 → "thanks", 爱 → "love")
- ✅ English → Chinese works well for all words with Pinyin transliterations
- ✅ Pinyin search is functional for common words
- ✅ Automatic Pinyin extraction from both traditional and simplified characters
- ✅ Robust parsing handles various page formats and structures
- Note: Chinese character pages use a "Definitions" section without word type categorization, so word type defaults to "noun"
- Note: Pinyin search accuracy depends on Wiktionary's search algorithm; some words may not be found via romanization

## Error Handling

```typescript
import { WikiglotError, WikiglotNotFoundError, WikiglotTimeoutError } from 'wikiglot';

try {
  const result = await translator.translate('xyz', 'en', 'es');
} catch (error) {
  if (error instanceof WikiglotNotFoundError) {
    console.log('Word not found');
  } else if (error instanceof WikiglotTimeoutError) {
    console.log('Request timed out');
  } else if (error instanceof WikiglotError) {
    console.log('Translation error:', error.message);
  }
}
```

## License

MIT

## Credits

Uses data from [English Wiktionary](https://en.wiktionary.org/) licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
