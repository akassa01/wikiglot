import { Wikiglot } from "../src/index";

/**
 * Test script for Arabic and Korean language support
 * Tests both directions: foreign→English and English→foreign
 * Also tests headword transliteration extraction
 */

async function testArabicKorean() {
  const wikiglot = new Wikiglot({
    timeout: 15000,
    userAgent: "wikiglot-test/1.0.0"
  });

  const tests = [
    // Arabic → English
    { word: "مرحبا", source: "ar", target: "en", language: "Arabic", direction: "AR→EN" },
    { word: "شكرا", source: "ar", target: "en", language: "Arabic", direction: "AR→EN" },
    { word: "سلام", source: "ar", target: "en", language: "Arabic", direction: "AR→EN" },

    // English → Arabic
    { word: "hello", source: "en", target: "ar", language: "Arabic", direction: "EN→AR" },
    { word: "thank you", source: "en", target: "ar", language: "Arabic", direction: "EN→AR" },
    { word: "peace", source: "en", target: "ar", language: "Arabic", direction: "EN→AR" },

    // Korean → English
    { word: "안녕하세요", source: "ko", target: "en", language: "Korean", direction: "KO→EN" },
    { word: "감사합니다", source: "ko", target: "en", language: "Korean", direction: "KO→EN" },
    { word: "안녕", source: "ko", target: "en", language: "Korean", direction: "KO→EN" },

    // English → Korean
    { word: "hello", source: "en", target: "ko", language: "Korean", direction: "EN→KO" },
    { word: "thank you", source: "en", target: "ko", language: "Korean", direction: "EN→KO" },
    { word: "goodbye", source: "en", target: "ko", language: "Korean", direction: "EN→KO" },
  ];

  console.log("Testing Arabic and Korean language support...\n");
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

        // Show headword transliteration if available (for character-based → English)
        if (result.headwordTransliteration) {
          console.log(`  Transliteration: ${result.headwordTransliteration}`);
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
  console.log("\nDetailed example: Arabic word 'مرحبا' (hello)");
  console.log("=" .repeat(70));
  try {
    const detailedResult = await wikiglot.translate("مرحبا", "ar", "en");
    console.log(JSON.stringify(detailedResult, null, 2));
  } catch (error: any) {
    console.log("Error:", error.message);
  }
}

testArabicKorean().catch(console.error);
