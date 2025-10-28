/**
 * Comprehensive Latin Test Suite
 * Tests all parts of speech to validate full Latin support
 */

import { Wikiglot } from '../src/index';

const translator = new Wikiglot({
  rateLimit: { maxRequests: 1, perMilliseconds: 1000 }
});

interface TestResult {
  word: string;
  type: string;
  success: boolean;
  hasInflections: boolean;
  translations: string[];
  inflectionData?: any;
  error?: string;
}

const results: TestResult[] = [];

async function testVerb(english: string, expectedLatin?: string) {
  console.log(`\nTesting VERB: "${english}" → Latin`);
  try {
    const result = await translator.translate(english, 'en', 'la');
    const verbGroup = result.translationsByType.find(t => t.wordType === 'verb');

    if (!verbGroup || verbGroup.translations.length === 0) {
      results.push({
        word: english,
        type: 'verb',
        success: false,
        hasInflections: false,
        translations: [],
        error: 'No verb translations found'
      });
      console.log('  ❌ FAIL: No verb translations found');
      return;
    }

    const firstTrans = verbGroup.translations[0];
    console.log(`  → ${firstTrans.translation}`);

    if (firstTrans.latinVerbForms) {
      console.log(`  ✅ Principal Parts:`);
      console.log(`     Present: ${firstTrans.latinVerbForms.firstPersonPresent}`);
      console.log(`     Infinitive: ${firstTrans.latinVerbForms.infinitive}`);
      console.log(`     Perfect: ${firstTrans.latinVerbForms.firstPersonPerfect}`);
      console.log(`     Supine: ${firstTrans.latinVerbForms.supine}`);

      results.push({
        word: english,
        type: 'verb',
        success: true,
        hasInflections: true,
        translations: verbGroup.translations.map(t => t.translation),
        inflectionData: firstTrans.latinVerbForms
      });
    } else {
      console.log(`  ⚠️  No principal parts extracted`);
      results.push({
        word: english,
        type: 'verb',
        success: true,
        hasInflections: false,
        translations: verbGroup.translations.map(t => t.translation)
      });
    }
  } catch (error: any) {
    console.log(`  ❌ ERROR: ${error.message}`);
    results.push({
      word: english,
      type: 'verb',
      success: false,
      hasInflections: false,
      translations: [],
      error: error.message
    });
  }
}

async function testNoun(english: string, expectedLatin?: string) {
  console.log(`\nTesting NOUN: "${english}" → Latin`);
  try {
    const result = await translator.translate(english, 'en', 'la');
    const nounGroup = result.translationsByType.find(t => t.wordType === 'noun');

    if (!nounGroup || nounGroup.translations.length === 0) {
      results.push({
        word: english,
        type: 'noun',
        success: false,
        hasInflections: false,
        translations: [],
        error: 'No noun translations found'
      });
      console.log('  ❌ FAIL: No noun translations found');
      return;
    }

    const firstTrans = nounGroup.translations[0];
    console.log(`  → ${firstTrans.translation}`);

    if (firstTrans.latinNounForms) {
      console.log(`  ✅ Noun Forms:`);
      console.log(`     Nominative: ${firstTrans.latinNounForms.nominative}`);
      console.log(`     Genitive: ${firstTrans.latinNounForms.genitive}`);
      console.log(`     Gender: ${firstTrans.latinNounForms.gender}`);

      results.push({
        word: english,
        type: 'noun',
        success: true,
        hasInflections: true,
        translations: nounGroup.translations.map(t => t.translation),
        inflectionData: firstTrans.latinNounForms
      });
    } else {
      console.log(`  ⚠️  No noun forms extracted`);
      results.push({
        word: english,
        type: 'noun',
        success: true,
        hasInflections: false,
        translations: nounGroup.translations.map(t => t.translation)
      });
    }
  } catch (error: any) {
    console.log(`  ❌ ERROR: ${error.message}`);
    results.push({
      word: english,
      type: 'noun',
      success: false,
      hasInflections: false,
      translations: [],
      error: error.message
    });
  }
}

async function testAdjective(english: string, expectedLatin?: string) {
  console.log(`\nTesting ADJECTIVE: "${english}" → Latin`);
  try {
    const result = await translator.translate(english, 'en', 'la');
    const adjGroup = result.translationsByType.find(t => t.wordType === 'adjective');

    if (!adjGroup || adjGroup.translations.length === 0) {
      results.push({
        word: english,
        type: 'adjective',
        success: false,
        hasInflections: false,
        translations: [],
        error: 'No adjective translations found'
      });
      console.log('  ❌ FAIL: No adjective translations found');
      return;
    }

    const transWithForms = adjGroup.translations.find(t => t.latinAdjectiveForms);

    if (transWithForms?.latinAdjectiveForms) {
      console.log(`  → ${transWithForms.translation}`);
      console.log(`  ✅ Adjective Forms:`);
      console.log(`     Masculine: ${transWithForms.latinAdjectiveForms.masculine}`);
      console.log(`     Feminine: ${transWithForms.latinAdjectiveForms.feminine}`);
      console.log(`     Neuter: ${transWithForms.latinAdjectiveForms.neuter}`);

      results.push({
        word: english,
        type: 'adjective',
        success: true,
        hasInflections: true,
        translations: adjGroup.translations.map(t => t.translation),
        inflectionData: transWithForms.latinAdjectiveForms
      });
    } else {
      console.log(`  → ${adjGroup.translations[0].translation}`);
      console.log(`  ⚠️  No adjective forms extracted`);
      results.push({
        word: english,
        type: 'adjective',
        success: true,
        hasInflections: false,
        translations: adjGroup.translations.map(t => t.translation)
      });
    }
  } catch (error: any) {
    console.log(`  ❌ ERROR: ${error.message}`);
    results.push({
      word: english,
      type: 'adjective',
      success: false,
      hasInflections: false,
      translations: [],
      error: error.message
    });
  }
}

async function testPronoun(english: string, expectedLatin?: string) {
  console.log(`\nTesting PRONOUN: "${english}" → Latin`);
  try {
    const result = await translator.translate(english, 'en', 'la');
    const pronounGroup = result.translationsByType.find(t => t.wordType === 'pronoun');

    if (!pronounGroup || pronounGroup.translations.length === 0) {
      results.push({
        word: english,
        type: 'pronoun',
        success: false,
        hasInflections: false,
        translations: [],
        error: 'No pronoun translations found'
      });
      console.log('  ❌ FAIL: No pronoun translations found');
      return;
    }

    console.log(`  → ${pronounGroup.translations.map(t => t.translation).join(', ')}`);
    console.log(`  ✅ Found ${pronounGroup.translations.length} translation(s)`);

    results.push({
      word: english,
      type: 'pronoun',
      success: true,
      hasInflections: false, // Pronouns don't have the same inflection extraction yet
      translations: pronounGroup.translations.map(t => t.translation)
    });
  } catch (error: any) {
    console.log(`  ❌ ERROR: ${error.message}`);
    results.push({
      word: english,
      type: 'pronoun',
      success: false,
      hasInflections: false,
      translations: [],
      error: error.message
    });
  }
}

async function testOther(english: string, expectedType: string) {
  console.log(`\nTesting ${expectedType.toUpperCase()}: "${english}" → Latin`);
  try {
    const result = await translator.translate(english, 'en', 'la');
    const group = result.translationsByType.find(t => t.wordType === expectedType);

    if (!group || group.translations.length === 0) {
      results.push({
        word: english,
        type: expectedType,
        success: false,
        hasInflections: false,
        translations: [],
        error: `No ${expectedType} translations found`
      });
      console.log(`  ❌ FAIL: No ${expectedType} translations found`);
      return;
    }

    console.log(`  → ${group.translations.map(t => t.translation).join(', ')}`);
    console.log(`  ✅ Found ${group.translations.length} translation(s)`);

    results.push({
      word: english,
      type: expectedType,
      success: true,
      hasInflections: false,
      translations: group.translations.map(t => t.translation)
    });
  } catch (error: any) {
    console.log(`  ❌ ERROR: ${error.message}`);
    results.push({
      word: english,
      type: expectedType,
      success: false,
      hasInflections: false,
      translations: [],
      error: error.message
    });
  }
}

async function runComprehensiveTest() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  COMPREHENSIVE LATIN TEST SUITE');
  console.log('═══════════════════════════════════════════════════════\n');

  // VERBS (3)
  console.log('\n━━━ VERBS ━━━');
  await testVerb('love');      // amo - 1st conjugation
  await testVerb('see');       // video - 2nd conjugation
  await testVerb('lead');      // duco - 3rd conjugation

  // NOUNS (3)
  console.log('\n━━━ NOUNS ━━━');
  await testNoun('water');     // aqua - 1st declension feminine
  await testNoun('war');       // bellum - 2nd declension neuter
  await testNoun('king');      // rex - 3rd declension

  // ADJECTIVES (3)
  console.log('\n━━━ ADJECTIVES ━━━');
  await testAdjective('good');     // bonus - 1st/2nd declension
  await testAdjective('great');    // magnus - 1st/2nd declension
  await testAdjective('happy');    // felix - 3rd declension

  // PRONOUNS (3)
  console.log('\n━━━ PRONOUNS ━━━');
  await testPronoun('I');          // ego
  await testPronoun('you');        // tu
  await testPronoun('this');       // hic/haec/hoc

  // OTHER PARTS OF SPEECH
  console.log('\n━━━ OTHER PARTS OF SPEECH ━━━');
  await testOther('hello', 'interjection');  // salve
  await testOther('quickly', 'adverb');      // celeriter
  await testOther('and', 'conjunction');     // et

  // SUMMARY
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');

  const total = results.length;
  const successful = results.filter(r => r.success).length;
  const withInflections = results.filter(r => r.hasInflections).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`Total Tests: ${total}`);
  console.log(`Successful: ${successful} (${((successful/total)*100).toFixed(1)}%)`);
  console.log(`With Inflections: ${withInflections}`);
  console.log(`Failed: ${failed}`);

  // Breakdown by type
  console.log('\n📊 BY PART OF SPEECH:');
  const types = ['verb', 'noun', 'adjective', 'pronoun', 'interjection', 'adverb', 'conjunction'];
  for (const type of types) {
    const typeResults = results.filter(r => r.type === type);
    const typeSuccess = typeResults.filter(r => r.success).length;
    const typeInflections = typeResults.filter(r => r.hasInflections).length;
    console.log(`  ${type.padEnd(12)}: ${typeSuccess}/${typeResults.length} success, ${typeInflections} with inflections`);
  }

  // Show failures
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.word} (${r.type}): ${r.error}`);
    });
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
}

runComprehensiveTest();
