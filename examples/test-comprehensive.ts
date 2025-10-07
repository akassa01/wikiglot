import { Wikiglot } from '../src/index';

async function comprehensiveTest() {
  const translator = new Wikiglot({ timeout: 15000 });

  console.log('=== Comprehensive Accent Correction Tests ===\n');

  const tests = [
    {
      name: 'Spanish: azucar → azúcar (missing accent)',
      word: 'azucar',
      from: 'es',
      to: 'en',
      expectCorrection: true,
      expectedFoundAs: 'azúcar'
    },
    {
      name: 'Spanish: azúcar (exact, with accent)',
      word: 'azúcar',
      from: 'es',
      to: 'en',
      expectCorrection: false,
      expectedFoundAs: 'azúcar'
    },
    {
      name: 'French: ecole → école (missing accent)',
      word: 'ecole',
      from: 'fr',
      to: 'en',
      expectCorrection: true,
      expectedFoundAs: 'école'
    },
    {
      name: 'French: école (exact, with accent)',
      word: 'école',
      from: 'fr',
      to: 'en',
      expectCorrection: false,
      expectedFoundAs: 'école'
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    process.stdout.write(`${test.name}... `);

    try {
      const result = await translator.translate(test.word, test.from, test.to);

      const hasCorrection = !!result.searchedFor;
      const foundAs = result.foundAs || result.word;

      if (hasCorrection === test.expectCorrection && foundAs === test.expectedFoundAs) {
        console.log('✓ PASS');
        if (hasCorrection) {
          console.log(`  → Corrected "${result.searchedFor}" to "${result.foundAs}"`);
        }
        passed++;
      } else {
        console.log('✗ FAIL');
        console.log(`  Expected correction: ${test.expectCorrection}, got: ${hasCorrection}`);
        console.log(`  Expected foundAs: ${test.expectedFoundAs}, got: ${foundAs}`);
        failed++;
      }
    } catch (error: any) {
      console.log('✗ ERROR');
      console.log(`  ${error.message}`);
      failed++;
    }

    console.log();
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
}

comprehensiveTest().catch(console.error);
