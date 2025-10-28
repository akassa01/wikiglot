/**
 * Latin Headword Parser
 * Extracts inflection information from Latin Wiktionary headword lines
 *
 * Examples:
 * - Verb: "amō (present infinitive amāre, perfect active amāvī, supine amātum)"
 * - Noun: "hūmānus m (genitive hūmānī)"
 * - Adjective: "hūmānus (feminine hūmāna, neuter hūmānum)"
 */

/**
 * Helper function to decode HTML entities
 */
function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Remove HTML tags from text
 */
function stripHTMLTags(text: string): string {
  return text.replace(/<[^>]+>/g, '');
}

export interface LatinVerbForms {
  firstPersonPresent: string;   // amō - 1st person singular present
  infinitive?: string;           // amāre - present infinitive
  firstPersonPerfect?: string;   // amāvī - 1st person singular perfect
  supine?: string;               // amātum - supine
}

export interface LatinNounForms {
  nominative: string;
  genitive?: string;
  gender?: string;  // m, f, n, or combinations like "m or f"
}

export interface LatinAdjectiveForms {
  masculine: string;
  feminine?: string;
  neuter?: string;
}

/**
 * Extract Latin verb principal parts (4 principal parts) from headword line
 *
 * Pattern: "amō (present infinitive amāre, perfect active amāvī, supine amātum)"
 *
 * The four principal parts are:
 * 1. First person singular present (amō) - the headword
 * 2. Present infinitive (amāre)
 * 3. First person singular perfect (amāvī)
 * 4. Supine (amātum)
 *
 * @param html - HTML content containing the headword section
 * @param word - The Latin word being searched
 * @returns LatinVerbForms or null if not found/not applicable
 */
export function extractLatinVerbForms(html: string, word: string): LatinVerbForms | null {
  // Find the headword line for Latin verbs
  // Pattern: <span class="headword-line"><strong class="Latn headword" lang="la">WORD</strong>
  // Note: Don't require exact word match since the headword may have macrons (amō vs amo)
  const headwordPattern = /<span[^>]*class="[^"]*headword-line[^"]*"[^>]*>[\s\S]{0,500}?<strong[^>]*class="[^"]*headword[^"]*"[^>]*lang="la"[^>]*>([^<]+)<\/strong>([\s\S]{0,1000}?)<\/span>/i;

  const match = html.match(headwordPattern);
  if (!match) return null;

  const firstPersonPresent = stripHTMLTags(match[1]).trim();
  const headwordContent = match[2];

  // Look for: present infinitive WORD, perfect active WORD, supine WORD
  // Pattern: <i>present infinitive</i> <b ...>WORD</b>
  const infinitiveMatch = headwordContent.match(/(?:present\s+)?infinitive[\s\S]*?<[^>]+>([^<]+)<\/[^>]+>/i);
  const perfectMatch = headwordContent.match(/perfect(?:\s+active)?[\s\S]*?<[^>]+>([^<]+)<\/[^>]+>/i);
  const supineMatch = headwordContent.match(/supine[\s\S]*?<[^>]+>([^<]+)<\/[^>]+>/i);

  const result: LatinVerbForms = {
    firstPersonPresent: decodeHTMLEntities(firstPersonPresent)
  };

  if (infinitiveMatch) {
    result.infinitive = decodeHTMLEntities(stripHTMLTags(infinitiveMatch[1]).trim());
  }

  if (perfectMatch) {
    result.firstPersonPerfect = decodeHTMLEntities(stripHTMLTags(perfectMatch[1]).trim());
  }

  if (supineMatch) {
    result.supine = decodeHTMLEntities(stripHTMLTags(supineMatch[1]).trim());
  }

  // Only return if we found at least one additional form beyond the headword
  if (result.infinitive || result.firstPersonPerfect || result.supine) {
    return result;
  }

  return null;
}

/**
 * Extract Latin noun forms (nominative, genitive, gender) from headword line
 *
 * Pattern: "hūmānus m (genitive hūmānī)"
 * or: "rēs f (genitive reī)"
 *
 * @param html - HTML content containing the headword section
 * @param word - The Latin word being searched
 * @returns LatinNounForms or null if not found/not applicable
 */
export function extractLatinNounForms(html: string, word: string): LatinNounForms | null {
  // Find the headword line for this word in a Noun section
  // Pattern: <strong class="Latn headword" lang="la">WORD</strong> GENDER (genitive GENFORM)
  // Example: <strong ...>aqua</strong> <span class="gender"><abbr>f</abbr></span> (<i>genitive</i> <b>aquae</b>)
  const headwordPattern = /<strong[^>]*class="[^"]*headword[^"]*"[^>]*lang="la"[^>]*>([^<]+)<\/strong>[\s\S]{0,200}?<span[^>]*class="[^"]*gender[^"]*"[^>]*>(?:<abbr[^>]*>)?([mfn]|[mfn]\s+or\s+[mfn])(?:<\/abbr>)?<\/span>[\s\S]{0,500}?genitive[\s\S]*?<[^>]+>([^<]+)<\/[^>]+>/i;

  const match = html.match(headwordPattern);
  if (!match) {
    // Try simpler pattern without genitive
    const simplePattern = /<strong[^>]*class="[^"]*headword[^"]*"[^>]*lang="la"[^>]*>([^<]+)<\/strong>[\s\S]{0,200}?<span[^>]*class="[^"]*gender[^"]*"[^>]*>(?:<abbr[^>]*>)?([mfn]|[mfn]\s+or\s+[mfn])(?:<\/abbr>)?<\/span>/i;

    const simpleMatch = html.match(simplePattern);
    if (!simpleMatch) return null;

    return {
      nominative: decodeHTMLEntities(stripHTMLTags(simpleMatch[1]).trim()),
      gender: simpleMatch[2].trim()
    };
  }

  return {
    nominative: decodeHTMLEntities(stripHTMLTags(match[1]).trim()),
    gender: match[2].trim(),
    genitive: decodeHTMLEntities(stripHTMLTags(match[3]).trim())
  };
}

/**
 * Extract Latin adjective forms (masculine, feminine, neuter) from headword line
 *
 * Pattern: "hūmānus (feminine hūmāna, neuter hūmānum)"
 * or: "bonus (feminine bona, neuter bonum)"
 *
 * @param html - HTML content containing the headword section
 * @param word - The Latin word being searched (masculine form)
 * @returns LatinAdjectiveForms or null if not found/not applicable
 */
export function extractLatinAdjectiveForms(html: string, word: string): LatinAdjectiveForms | null {
  // Find the headword line for this word in an Adjective section
  // Pattern: <strong class="Latn headword" lang="la">WORD</strong> (feminine WORD, neuter WORD)
  // Example: <strong ...>hūmānus</strong> (<i>feminine</i> <b>hūmāna</b>, <i>neuter</i> <b>hūmānum</b>)
  const headwordPattern = /<strong[^>]*class="[^"]*headword[^"]*"[^>]*lang="la"[^>]*>([^<]+)<\/strong>[\s\S]{0,100}?\([\s\S]{0,50}?feminine[\s\S]*?<[^>]+>([^<]+)<\/[^>]+>[\s\S]{0,100}?neuter[\s\S]*?<[^>]+>([^<]+)<\/[^>]+>/i;

  const match = html.match(headwordPattern);
  if (!match) return null;

  return {
    masculine: decodeHTMLEntities(stripHTMLTags(match[1]).trim()),
    feminine: decodeHTMLEntities(stripHTMLTags(match[2]).trim()),
    neuter: decodeHTMLEntities(stripHTMLTags(match[3]).trim())
  };
}
