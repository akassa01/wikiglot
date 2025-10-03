# Wikiglot

Simple, fast translation library using English Wiktionary for English, French, and Spanish.

## Features

- ✅ Translate between English, French, and Spanish
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
- `sourceLanguage: 'en' | 'es' | 'fr'` - Source language code
- `targetLanguage: 'en' | 'es' | 'fr'` - Target language code

**Returns:** `Promise<TranslationResult>`

```typescript
interface TranslationResult {
  word: string;
  sourceLanguage: string;
  targetLanguage: string;
  translationsByType: WordTypeTranslations[];
  pronunciation?: string;
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
