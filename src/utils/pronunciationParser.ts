/**
 * Extract IPA pronunciation from English Wiktionary HTML
 *
 * @param html - The HTML content from English Wiktionary
 * @returns The first IPA pronunciation found, or undefined if none found
 */
export function extractPronunciation(html: string): string | undefined {
  // Find the Pronunciation section
  const pronunciationIdx = html.indexOf('id="Pronunciation"');
  if (pronunciationIdx === -1) {
    return undefined;
  }

  // Extract a reasonable chunk after the Pronunciation heading
  const pronunciationSection = html.substring(pronunciationIdx, pronunciationIdx + 5000);

  // Look for the first IPA span (usually the General/US pronunciation)
  // Pattern: <span class="IPA nowrap">/...pronunciation.../</span>
  const ipaRegex = /<span class="IPA[^"]*"[^>]*>([^<]+)<\/span>/;
  const match = ipaRegex.exec(pronunciationSection);

  if (match && match[1]) {
    return match[1].trim();
  }

  return undefined;
}
