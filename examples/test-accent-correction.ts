import { Wikiglot } from '../src/index';

async function testAccentCorrection() {
  const translator = new Wikiglot({
    timeout: 15000
  });

  console.log('Testing accent correction feature...\n');

  // Test 1: azucar -> azúcar
  console.log('Test 1: Searching for "azucar" (missing accent)');
  try {
    const result1 = await translator.translate('azucar', 'es', 'en');
    console.log('✓ Success!');
    console.log('  Original query:', result1.searchedFor || 'N/A');
    console.log('  Found as:', result1.foundAs || result1.word);
    console.log('  Translations:', result1.translationsByType.map(t =>
      `${t.wordType}: ${t.translations.map(tr => tr.translation).join(', ')}`
    ).join('; '));
    console.log();
  } catch (error: any) {
    console.log('✗ Failed:', error.message);
    console.log();
  }

  // Test 2: revolucion -> revolución
  console.log('Test 2: Searching for "revolucion" (missing accent)');
  try {
    const result2 = await translator.translate('revolucion', 'es', 'en');
    console.log('✓ Success!');
    console.log('  Original query:', result2.searchedFor || 'N/A');
    console.log('  Found as:', result2.foundAs || result2.word);
    console.log('  Translations:', result2.translationsByType.map(t =>
      `${t.wordType}: ${t.translations.map(tr => tr.translation).join(', ')}`
    ).join('; '));
    console.log();
  } catch (error: any) {
    console.log('✗ Failed:', error.message);
    console.log();
  }

  // Test 3: Exact match (with accent) - should NOT show correction
  console.log('Test 3: Searching for "azúcar" (correct spelling)');
  try {
    const result3 = await translator.translate('azúcar', 'es', 'en');
    console.log('✓ Success!');
    console.log('  Original query:', result3.searchedFor || 'N/A (no correction needed)');
    console.log('  Found as:', result3.foundAs || result3.word);
    console.log('  Translations:', result3.translationsByType.map(t =>
      `${t.wordType}: ${t.translations.map(tr => tr.translation).join(', ')}`
    ).join('; '));
    console.log();
  } catch (error: any) {
    console.log('✗ Failed:', error.message);
    console.log();
  }

  // Test 4: Word that doesn't exist even with correction
  console.log('Test 4: Searching for "xyzabc" (non-existent word)');
  try {
    const result4 = await translator.translate('xyzabc', 'es', 'en');
    console.log('✓ Unexpected success:', result4);
    console.log();
  } catch (error: any) {
    console.log('✓ Correctly failed:', error.message);
    console.log();
  }

  console.log('All tests completed!');
}

testAccentCorrection().catch(console.error);
