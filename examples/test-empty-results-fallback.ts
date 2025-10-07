import { Wikiglot } from '../src/index';

async function testEmptyResultsFallback() {
  const translator = new Wikiglot({ timeout: 15000 });

  console.log('=== Testing Empty Results Fallback ===\n');

  const tests = [
    {
      name: 'revolucion → revolución (page exists but wrong language)',
      word: 'revolucion',
      from: 'es',
      to: 'en',
      shouldFindTranslations: true,
      shouldCorrect: true
    },
    {
      name: 'cafe → café (page exists but wrong language for Portuguese)',
      word: 'cafe',
      from: 'pt',
      to: 'en',
      shouldFindTranslations: true,
      shouldCorrect: true
    },
    {
      name: 'azucar → azúcar (page doesn\'t exist)',
      word: 'azucar',
      from: 'es',
      to: 'en',
      shouldFindTranslations: true,
      shouldCorrect: true
    },
    {
      name: 'revolución → (exact match)',
      word: 'revolución',
      from: 'es',
      to: 'en',
      shouldFindTranslations: true,
      shouldCorrect: false
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    process.stdout.write(`${test.name}... `);

    try {
      const result = await translator.translate(test.word, test.from, test.to);

      const hasTranslations = result.translationsByType.length > 0;
      const wasCorrected = !!result.searchedFor;

      if (hasTranslations === test.shouldFindTranslations && wasCorrected === test.shouldCorrect) {
        console.log('✓ PASS');
        if (wasCorrected) {
          console.log(`  → Corrected "${result.searchedFor}" to "${result.foundAs}"`);
          console.log(`  → Found ${result.translationsByType.length} word type(s)`);
        }
        passed++;
      } else {
        console.log('✗ FAIL');
        console.log(`  Expected translations: ${test.shouldFindTranslations}, got: ${hasTranslations}`);
        console.log(`  Expected correction: ${test.shouldCorrect}, got: ${wasCorrected}`);
        if (wasCorrected) {
          console.log(`  Correction: "${result.searchedFor}" → "${result.foundAs}"`);
        }
        failed++;
      }
    } catch (error: any) {
      if (!test.shouldFindTranslations) {
        console.log('✓ PASS (correctly failed)');
        passed++;
      } else {
        console.log('✗ ERROR');
        console.log(`  ${error.message}`);
        failed++;
      }
    }

    console.log();
  }

  console.log(`=== Results: ${passed} passed, ${failed} failed ===`);
}

testEmptyResultsFallback().catch(console.error);
