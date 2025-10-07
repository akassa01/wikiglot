import { Wikiglot } from "../src/index";

/**
 * Test script for new language support
 * Tests Italian, German, Portuguese, Swedish, Indonesian, Swahili, Turkish
 */

async function testNewLanguages() {
  const wikiglot = new Wikiglot({
    timeout: 15000,
    userAgent: "wikiglot-test/1.0.0"
  });

  const tests = [
    // Italian
    { word: "hello", source: "en", target: "it", language: "Italian" },
    { word: "ciao", source: "it", target: "en", language: "Italian" },

    // German
    { word: "hello", source: "en", target: "de", language: "German" },
    { word: "hallo", source: "de", target: "en", language: "German" },

    // Portuguese
    { word: "hello", source: "en", target: "pt", language: "Portuguese" },
    { word: "olá", source: "pt", target: "en", language: "Portuguese" },

    // Swedish
    { word: "hello", source: "en", target: "sv", language: "Swedish" },
    { word: "hej", source: "sv", target: "en", language: "Swedish" },

    // Indonesian
    { word: "hello", source: "en", target: "id", language: "Indonesian" },
    { word: "halo", source: "id", target: "en", language: "Indonesian" },

    // Swahili
    { word: "hello", source: "en", target: "sw", language: "Swahili" },
    { word: "jambo", source: "sw", target: "en", language: "Swahili" },

    // Turkish
    { word: "hello", source: "en", target: "tr", language: "Turkish" },
    { word: "merhaba", source: "tr", target: "en", language: "Turkish" }
  ];

  console.log("Testing new language support...\n");

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await wikiglot.translate(test.word, test.source, test.target);

      const hasTranslations = result.translationsByType.length > 0 &&
                             result.translationsByType.some(t => t.translations.length > 0);

      if (hasTranslations) {
        console.log(`✓ ${test.language} (${test.source} → ${test.target}): "${test.word}"`);
        console.log(`  Found ${result.translationsByType.length} word type(s)`);
        result.translationsByType.forEach(wt => {
          console.log(`  - ${wt.wordType}: ${wt.translations.slice(0, 3).map(t => t.translation).join(", ")}`);
        });
        passed++;
      } else {
        console.log(`✗ ${test.language} (${test.source} → ${test.target}): "${test.word}" - No translations found`);
        failed++;
      }

      console.log();

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      console.log(`✗ ${test.language} (${test.source} → ${test.target}): "${test.word}" - ${error.message}`);
      console.log();
      failed++;
    }
  }

  console.log("=" .repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed out of ${tests.length} tests`);
  console.log("=" .repeat(50));
}

testNewLanguages().catch(console.error);
