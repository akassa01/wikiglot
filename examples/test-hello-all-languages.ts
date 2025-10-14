/**
 * Test "hello" translation across all 14 supported languages
 */

import { Wikiglot } from '../src/wikiglot';

async function testHelloInAllLanguages() {
  const translator = new Wikiglot();

  // All supported languages (excluding English as source)
  const languages = [
    { code: 'es', name: 'Spanish', hello: 'hola' },
    { code: 'fr', name: 'French', hello: 'bonjour' },
    { code: 'it', name: 'Italian', hello: 'ciao' },
    { code: 'de', name: 'German', hello: 'hallo' },
    { code: 'pt', name: 'Portuguese', hello: 'olá' },
    { code: 'sv', name: 'Swedish', hello: 'hej' },
    { code: 'id', name: 'Indonesian', hello: 'halo' },
    { code: 'sw', name: 'Swahili', hello: 'hujambo' },
    { code: 'tr', name: 'Turkish', hello: 'merhaba' },
    { code: 'ar', name: 'Arabic', hello: 'مرحبا' },
    { code: 'ko', name: 'Korean', hello: '안녕하세요' },
    { code: 'zh', name: 'Chinese', hello: '你好' },
    { code: 'ja', name: 'Japanese', hello: 'こんにちは' }
  ];

  console.log('Testing "hello" → English for all languages:\n');

  for (const lang of languages) {
    try {
      console.log(`\n${lang.name} (${lang.code}): "${lang.hello}" → English`);
      const result = await translator.translate(lang.hello, lang.code, 'en');

      if (result.translationsByType.length === 0) {
        console.log(`  ❌ NO TRANSLATIONS FOUND`);
      } else {
        console.log(`  ✅ Found ${result.translationsByType.length} word type(s)`);
        for (const wordType of result.translationsByType) {
          console.log(`    - ${wordType.wordType}: ${wordType.translations.map(t => t.translation).join(', ')}`);
        }
      }

      if (result.headwordTransliteration) {
        console.log(`  📝 Transliteration: ${result.headwordTransliteration}`);
      }
    } catch (error: any) {
      console.log(`  ❌ ERROR: ${error.message}`);
    }

    // Rate limit to be respectful
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n\nTesting English "hello" → all languages:\n');

  for (const lang of languages) {
    try {
      console.log(`\nEnglish → ${lang.name} (${lang.code}): "hello"`);
      const result = await translator.translate('hello', 'en', lang.code);

      if (result.translationsByType.length === 0) {
        console.log(`  ❌ NO TRANSLATIONS FOUND`);
      } else {
        console.log(`  ✅ Found ${result.translationsByType.length} word type(s)`);
        for (const wordType of result.translationsByType) {
          console.log(`    - ${wordType.wordType}: ${wordType.translations.map(t => t.translation).join(', ')}`);
        }
      }
    } catch (error: any) {
      console.log(`  ❌ ERROR: ${error.message}`);
    }

    // Rate limit to be respectful
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testHelloInAllLanguages().catch(console.error);
