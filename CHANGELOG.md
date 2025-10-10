# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.2] - 2025-10-10

### Fixed
- **Korean Romanization**: Fixed extraction to use Revised Romanization from pronunciation tables instead of grammatical terms
  - Now correctly extracts "annyeonghaseyo" instead of "haeyoche" for 안녕하세요
  - Added specific pattern for Korean `<th>Revised Romanization</th>` table structure
  - Excluded Korean from `lang="ko-Latn"` fallback to prevent extracting grammar terminology
- **Arabic Romanization**: Fixed bullet point pattern to handle linked bullets (`<a>•</a>`)
  - Now correctly extracts "marḥaban" for مرحبا
  - Increased header section limit from 10,000 to 30,000 characters to find romanization in pages with phrasebook boxes
- **Chinese Romanization**: Added pinyin extraction from Chinese pronunciation sections
  - New pattern extracts pinyin from `<span class="...pinyin..."><a>pinyin</a></span>` structure
  - Automatically removes spaces between syllables (e.g., "nǐ hǎo" → "nǐhǎo")
  - Works for traditional Chinese characters (e.g., 你好 → "nǐhǎo", 朋友 → "péngyou")
  - Note: Simplified characters that redirect to traditional forms won't have romanization
- **Japanese Romanization**: Added extraction from `<span class="mention-tr tr">` tags
  - Now extracts romanization for Japanese words (e.g., こんにちは → "konnichiha")
  - Uses strict Hepburn romanization as provided by English Wiktionary

### Changed
- Increased header section scanning from 10,000 to 30,000 characters to accommodate pages with large infoboxes and tables
- Enhanced bullet point pattern to match both plain bullets (•) and linked bullets (`<a>•</a>`)
- Improved regex patterns to handle nested HTML tags in pronunciation sections

### Technical Details
- Added Pattern 2a: Korean Revised Romanization table extraction
- Added Pattern 2b: Chinese pinyin extraction with space normalization
- Added Pattern 3: `mention-tr` tag extraction for Japanese
- Updated Pattern 1: Bullet point pattern now handles linked bullets
- Updated Pattern 5: Removed Korean from lang-Latn fallback

### Examples
```typescript
// Korean - now extracts correct Revised Romanization
const ko = await translator.translate('안녕하세요', 'ko', 'en');
console.log(ko.headwordTransliteration); // "annyeonghaseyo" (was "haeyoche")

// Arabic - now finds romanization in pages with long headers
const ar = await translator.translate('مرحبا', 'ar', 'en');
console.log(ar.headwordTransliteration); // "marḥaban"

// Chinese - extracts pinyin for traditional characters
const zh = await translator.translate('你好', 'zh', 'en');
console.log(zh.headwordTransliteration); // "nǐhǎo"

// Japanese - extracts romaji from mention tags
const ja = await translator.translate('こんにちは', 'ja', 'en');
console.log(ja.headwordTransliteration); // "konnichiha"
```

## [1.2.1] - 2025-10-09

### Added
- **Japanese Language Support** (`ja`): Full translation support between Japanese and English
  - Automatic romaji romanization extraction (e.g., こんにちは → "konnichiwa")
  - Transliterations available in translation objects
  - Script detection for Hiragana, Katakana, and Kanji
  - Pronunciation support
  - Reverse transliteration search (romaji → Japanese)

### Changed
- Increased supported languages from 13 to 14
- Updated headword parser to handle Japanese page structure with kanji tables
- Improved transliteration extraction regex for better handling of nested HTML tags
- Increased header section scanning size to accommodate Japanese pages

### Fixed
- Improved regex pattern in headword parser to correctly match transliterations with nested anchor tags
- Fixed word boundary detection in language code matching

### Examples
```typescript
// Japanese to English with romaji
const result = await translator.translate('こんにちは', 'ja', 'en');
// Returns: { headwordTransliteration: 'konnichiwa', translations: [{ translation: 'hello', ... }] }

// English to Japanese with transliteration
const result = await translator.translate('hello', 'en', 'ja');
// Returns: { translations: [{ translation: 'こんにちは', transliteration: 'konnichiwa', ... }] }

// Reverse search: Find Japanese word from romaji
const suggestions = await translator.searchByTransliteration('konnichiwa', 'ja');
// Returns: ['こんにちは', '今日は', ...]
```

## [1.2.0] - 2025-10-09

### Added
- **Arabic Language Support** (`ar`): Full translation support between Arabic and English
  - Automatic romanization extraction (e.g., مرحبا → "marḥaban")
  - Transliterations available in translation objects
  - Pronunciation (IPA) support
- **Korean Language Support** (`ko`): Full translation support between Korean and English
  - Automatic romanization extraction (e.g., 안녕하세요 → "annyeonghaseyo")
  - Transliterations available in translation objects
  - Pronunciation support
- **Chinese/Mandarin Language Support** (`zh`): Translation support between Chinese and English
  - Automatic Pinyin romanization extraction (e.g., 你好 → "nǐhǎo")
  - Transliterations available in translation objects
  - Works with both Simplified and Traditional characters
  - **Note:** Chinese→English currently works best for phrases/expressions; individual character support limited due to Wiktionary structure (planned for future release)
  - English→Chinese works well for all words
- **Phrase Word Type**: Added support for phrase translations (common in Korean and other languages)
- **Headword Transliteration Parser**: New utility to extract romanization from page headers
  - Extracts Latin script representation for character-based languages (Arabic, Korean, Chinese)
  - Pattern: `<native script> • (<romanization>)`
  - Extensible to future languages (Cantonese, Japanese, etc.)
- **New `headwordTransliteration` field**: Added to `TranslationResult` interface
  - Provides page-level romanization when available
  - Complements existing translation-level transliterations
- **Reverse Transliteration Search**: New `searchByTransliteration()` method
  - Search for character-based words using romanization (e.g., "annyeonghaseyo" → "안녕하세요")
  - Language filtering to narrow results to specific scripts
  - Useful for users who only know the romanization

### Changed
- Increased supported languages from 10 to 13
- Updated documentation with transliteration examples
- Enhanced `parseWiktionaryTranslationsByType()` to include phrase word type

### Test Coverage
- Added comprehensive test suite (`examples/test-arabic-korean.ts`)
  - 12 test cases covering Arabic ↔ English and Korean ↔ English
  - All tests passing (12/12)
- Added Chinese test suite (`examples/test-chinese.ts`)
  - 7 test cases covering Chinese ↔ English
  - Pinyin transliteration search tests
- Added transliteration search test suite (`examples/test-transliteration-search.ts`)
  - Tests reverse romanization lookup for Arabic and Korean
- Added deep structure testing (`examples/debug-chinese-structure.ts`)
  - Investigates Chinese page structure and parsing

### Known Limitations
- **Chinese individual characters:** Limited Chinese→English support for individual characters due to Wiktionary's unique page structure for Chinese. Common phrases/expressions work well. Full support planned for future release.
- **Transliteration search accuracy:** Depends on Wiktionary's search indexing; some romanizations may not return results even if the word exists
- **Simplified/Traditional Chinese:** Some simplified characters redirect to traditional character pages, which may have different structures

### Examples
```typescript
// Arabic with transliteration
const result = await translator.translate('مرحبا', 'ar', 'en');
// Returns: { translations: [{ translation: 'hello', ... }], pronunciation: '/mar.ħa.ban/' }

// Korean phrase support
const result = await translator.translate('안녕하세요', 'ko', 'en');
// Returns: { wordType: 'phrase', translations: [{ translation: 'How are you?', ... }] }

// English to Arabic with transliteration
const result = await translator.translate('hello', 'en', 'ar');
// Returns: { translation: 'مَرْحَبًا', transliteration: 'marḥaban', ... }

// Reverse search: Find word from romanization
const suggestions = await translator.searchByTransliteration('annyeonghaseyo', 'ko');
// Returns: ['안녕하세요', '안녕', ...]
const translation = await translator.translate(suggestions[0], 'ko', 'en');
// Get the English translation
```

## [1.1.0] - 2025-10-07

### Added
- **Automatic Accent Correction**: Wikiglot now automatically corrects missing accents and handles common misspellings
  - Two-stage fallback strategy:
    1. When a word page doesn't exist → searches for accent-corrected version
    2. When a page exists but has no content in the target language → searches for correct version
  - Examples:
    - `azucar` → finds `azúcar` (page doesn't exist)
    - `revolucion` → finds `revolución` (page exists for Esperanto, not Spanish)
    - `cafe` → finds `café` (page exists for English, not Portuguese)
    - `ecole` → finds `école` (page doesn't exist)
  - Returns correction metadata (`searchedFor`, `foundAs`) so apps can inform users
  - Zero overhead for exact matches - only adds 1 API call when corrections are needed
  - Works automatically for all supported languages
  - Smart filtering prefers accented versions when input has no accents

### Changed
- `TranslationResult` interface now includes optional `searchedFor` and `foundAs` fields for correction metadata

### Performance
- No performance impact on successful lookups (exact matches)
- Only 1 additional API call when accent correction is triggered
- ~120 lines of code added
- Zero new dependencies

## [1.0.0] - Initial Release

### Added
- Translation between English and Spanish/French
- Automatic verb form detection and base verb translation
- Pronunciation (IPA) extraction
- Translations organized by word type (noun, verb, adjective, etc.)
- Built-in rate limiting
- TypeScript support
- Zero dependencies (except node-fetch)
