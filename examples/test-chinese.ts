import { Wikiglot } from "../src/index";

/**
 * Test script for Chinese (Mandarin) language support
 * Tests both directions: Chinese→English and English→Chinese
 * Also tests Pinyin transliteration extraction
 */

async function testChinese() {
  const wikiglot = new Wikiglot({
    timeout: 15000,
    userAgent: "wikiglot-test/1.0.0"
  });

  const tests = [
    // Chinese → English
    { word: "你好", source: "zh", target: "en", language: "Chinese", direction: "ZH→EN", meaning: "hello" },
    { word: "谢谢", source: "zh", target: "en", language: "Chinese", direction: "ZH→EN", meaning: "thank you" },
    { word: "再见", source: "zh", target: "en", language: "Chinese", direction: "ZH→EN", meaning: "goodbye" },
    { word: "爱", source: "zh", target: "en", language: "Chinese", direction: "ZH→EN", meaning: "love" },

    // English → Chinese
    { word: "hello", source: "en", target: "zh", language: "Chinese", direction: "EN→ZH" },
    { word: "thank you", source: "en", target: "zh", language: "Chinese", direction: "EN→ZH" },
    { word: "goodbye", source: "en", target: "zh", language: "Chinese", direction: "EN→ZH" },
  ];

  console.log("Testing Chinese (Mandarin) language support...\n");
  console.log("=" .repeat(70));

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await wikiglot.translate(test.word, test.source, test.target);

      const hasTranslations = result.translationsByType.length > 0 &&
                             result.translationsByType.some(t => t.translations.length > 0);

      if (hasTranslations) {
        console.log(`✓ ${test.language} (${test.direction}): "${test.word}"`);

        // Show headword transliteration if available (for Chinese → English)
        if (result.headwordTransliteration) {
          console.log(`  Pinyin: ${result.headwordTransliteration}`);
        }

        // Show pronunciation if available
        if (result.pronunciation) {
          console.log(`  Pronunciation: ${result.pronunciation}`);
        }

        console.log(`  Found ${result.translationsByType.length} word type(s):`);
        result.translationsByType.forEach(wt => {
          const samples = wt.translations.slice(0, 3);
          const translationsDisplay = samples.map(t => {
            if (t.transliteration) {
              return `${t.translation} (${t.transliteration})`;
            }
            return t.translation;
          }).join(", ");
          console.log(`  - ${wt.wordType}: ${translationsDisplay}`);
        });
        passed++;
      } else {
        console.log(`✗ ${test.language} (${test.direction}): "${test.word}" - No translations found`);
        failed++;
      }

      console.log();

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      console.log(`✗ ${test.language} (${test.direction}): "${test.word}"`);
      console.log(`  Error: ${error.message}`);
      console.log();
      failed++;
    }
  }

  console.log("=" .repeat(70));
  console.log(`Results: ${passed} passed, ${failed} failed out of ${tests.length} tests`);
  console.log("=" .repeat(70));

  // Show a detailed example
  console.log("\nDetailed example: Chinese word '你好' (hello)");
  console.log("=" .repeat(70));
  try {
    const detailedResult = await wikiglot.translate("你好", "zh", "en");
    console.log(JSON.stringify(detailedResult, null, 2));
  } catch (error: any) {
    console.log("Error:", error.message);
  }

  // Test transliteration search
  console.log("\n\nTesting Pinyin search...");
  console.log("=" .repeat(70));

  const pinyinTests = [
    { pinyin: "nihao", expected: "你好" },
    { pinyin: "xiexie", expected: "谢谢" },
    { pinyin: "zaijian", expected: "再见" },
  ];

  for (const test of pinyinTests) {
    console.log(`\nSearching for: "${test.pinyin}"`);
    const suggestions = await wikiglot.searchByTransliteration(test.pinyin, 'zh');

    if (suggestions.length > 0) {
      console.log(`✓ Found ${suggestions.length} result(s):`);
      suggestions.slice(0, 3).forEach((word, i) => {
        console.log(`  ${i + 1}. ${word}`);
      });
    } else {
      console.log(`✗ No results found`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

testChinese().catch(console.error);
