import { Wikiglot } from '../src/index';

async function testJapanese() {
  const translator = new Wikiglot({ timeout: 15000 });

  console.log('=== Japanese Translation Tests ===\n');

  try {
    // Test 1: Japanese to English
    console.log('Test 1: Japanese → English (こんにちは)');
    const result1 = await translator.translate('こんにちは', 'ja', 'en');
    console.log('Headword transliteration:', result1.headwordTransliteration);
    console.log('Translations:', JSON.stringify(result1.translationsByType, null, 2));
    console.log();

    // Test 2: English to Japanese
    console.log('Test 2: English → Japanese (hello)');
    const result2 = await translator.translate('hello', 'en', 'ja');
    console.log('Translations:', JSON.stringify(result2.translationsByType, null, 2));
    console.log();

    // Test 3: Another common Japanese word
    console.log('Test 3: Japanese → English (ありがとう)');
    const result3 = await translator.translate('ありがとう', 'ja', 'en');
    console.log('Headword transliteration:', result3.headwordTransliteration);
    console.log('Translations:', JSON.stringify(result3.translationsByType, null, 2));
    console.log();

    // Test 4: Transliteration search
    console.log('Test 4: Transliteration search (konnichiwa)');
    const suggestions = await translator.searchByTransliteration('konnichiwa', 'ja');
    console.log('Suggestions:', suggestions);
    console.log();

    console.log('✅ All Japanese tests completed successfully!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testJapanese().catch(console.error);
