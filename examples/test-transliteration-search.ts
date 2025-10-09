import { Wikiglot } from "../src/index";

/**
 * Test script for reverse transliteration search
 * Demonstrates finding character-based words from their romanization
 */

async function testTransliterationSearch() {
  const wikiglot = new Wikiglot({
    timeout: 15000,
    userAgent: "wikiglot-test/1.0.0"
  });

  console.log("Testing Transliteration Search\n");
  console.log("=".repeat(70));

  // Korean examples
  console.log("\n📝 Korean Transliteration Search\n");

  const koreanTests = [
    { romanization: "annyeonghaseyo", expected: "안녕하세요" },
    { romanization: "gamsahamnida", expected: "감사합니다" },
    { romanization: "annyeong", expected: "안녕" },
  ];

  for (const test of koreanTests) {
    console.log(`Searching for: "${test.romanization}"`);
    const suggestions = await wikiglot.searchByTransliteration(test.romanization, 'ko');

    if (suggestions.length > 0) {
      console.log(`✓ Found ${suggestions.length} result(s):`);
      suggestions.slice(0, 3).forEach((word, i) => {
        console.log(`  ${i + 1}. ${word}`);
      });

      // Try translating the first result
      const firstResult = suggestions[0];
      try {
        const translation = await wikiglot.translate(firstResult, 'ko', 'en');
        if (translation.translationsByType.length > 0) {
          const firstTranslation = translation.translationsByType[0].translations[0];
          console.log(`  → "${firstResult}" means: ${firstTranslation.translation}`);
          if (translation.headwordTransliteration) {
            console.log(`  → Transliteration: ${translation.headwordTransliteration}`);
          }
        }
      } catch (e) {
        console.log(`  → Could not translate result`);
      }
    } else {
      console.log(`✗ No results found`);
    }

    console.log();
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Arabic examples
  console.log("\n📝 Arabic Transliteration Search\n");

  const arabicTests = [
    { romanization: "marhaban", expected: "مرحبا" },
    { romanization: "shukran", expected: "شكرا" },
    { romanization: "salaam", expected: "سلام" },
  ];

  for (const test of arabicTests) {
    console.log(`Searching for: "${test.romanization}"`);
    const suggestions = await wikiglot.searchByTransliteration(test.romanization, 'ar');

    if (suggestions.length > 0) {
      console.log(`✓ Found ${suggestions.length} result(s):`);
      suggestions.slice(0, 3).forEach((word, i) => {
        console.log(`  ${i + 1}. ${word}`);
      });

      // Try translating the first result
      const firstResult = suggestions[0];
      try {
        const translation = await wikiglot.translate(firstResult, 'ar', 'en');
        if (translation.translationsByType.length > 0) {
          const firstTranslation = translation.translationsByType[0].translations[0];
          console.log(`  → "${firstResult}" means: ${firstTranslation.translation}`);
          if (translation.pronunciation) {
            console.log(`  → Pronunciation: ${translation.pronunciation}`);
          }
        }
      } catch (e) {
        console.log(`  → Could not translate result`);
      }
    } else {
      console.log(`✗ No results found`);
    }

    console.log();
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log("=".repeat(70));
  console.log("\n✨ Complete Example Workflow:\n");

  // Show complete workflow
  console.log("User types: 'annyeonghaseyo'");
  const search = await wikiglot.searchByTransliteration('annyeonghaseyo', 'ko');
  if (search.length > 0) {
    console.log(`→ System finds: ${search[0]}`);
    const result = await wikiglot.translate(search[0], 'ko', 'en');
    if (result.translationsByType.length > 0) {
      const translation = result.translationsByType[0].translations[0];
      console.log(`→ Translation: ${translation.translation}`);
      console.log(`→ Full result:`, JSON.stringify(result, null, 2));
    }
  }
}

testTransliterationSearch().catch(console.error);
