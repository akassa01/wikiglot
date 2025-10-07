# Wikiglot

Simple, fast translation library using English Wiktionary with support for 10 languages.

## Features

- ✅ Translate between English and 9 other languages (Spanish, French, Italian, German, Portuguese, Swedish, Indonesian, Swahili, Turkish)
- ✅ **Automatic accent correction** - Forgiving search that finds "azúcar" when you type "azucar"
- ✅ Automatic verb form detection and base verb translation
- ✅ Pronunciation (IPA) extraction
- ✅ Organized by word type (noun, verb, adjective, etc.)
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
  translation: string;
  transliteration?: string;
  meaning: string;
}
```

## Examples

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

**Note:** Currently, one of the languages must be English (source or target) as the library uses English Wiktionary.

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
