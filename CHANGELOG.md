# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
