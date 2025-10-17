/**
 * Language helpers for converting language codes to AI-friendly instructions
 */

export interface LanguageInstruction {
  code: string;
  instruction: string;
  spellingVariant?: string;
}

const LANGUAGE_MAP: Record<string, LanguageInstruction> = {
  'en-US': {
    code: 'en-US',
    instruction: 'Write in English using US spelling (e.g., "color", "organize", "analyze")',
    spellingVariant: 'US'
  },
  'en-GB': {
    code: 'en-GB',
    instruction: 'Write in English using UK spelling (e.g., "colour", "organise", "analyse")',
    spellingVariant: 'UK'
  },
  'de-DE': {
    code: 'de-DE',
    instruction: 'Write in German (Deutsch)',
  },
  'fr-FR': {
    code: 'fr-FR',
    instruction: 'Write in French (Français)',
  },
  'es-ES': {
    code: 'es-ES',
    instruction: 'Write in Spanish (Español)',
  },
  'it-IT': {
    code: 'it-IT',
    instruction: 'Write in Italian (Italiano)',
  },
  'pt-BR': {
    code: 'pt-BR',
    instruction: 'Write in Portuguese (Brazilian Portuguese)',
  },
  'nl-NL': {
    code: 'nl-NL',
    instruction: 'Write in Dutch (Nederlands)',
  },
  'pl-PL': {
    code: 'pl-PL',
    instruction: 'Write in Polish (Polski)',
  },
  'ru-RU': {
    code: 'ru-RU',
    instruction: 'Write in Russian (Русский)',
  },
  'ja-JP': {
    code: 'ja-JP',
    instruction: 'Write in Japanese (日本語)',
  },
  'zh-CN': {
    code: 'zh-CN',
    instruction: 'Write in Simplified Chinese (简体中文)',
  },
  'ko-KR': {
    code: 'ko-KR',
    instruction: 'Write in Korean (한국어)',
  },
};

/**
 * Convert a language code to an AI instruction
 */
export function getLanguageInstruction(languageCode: string): string {
  const lang = LANGUAGE_MAP[languageCode];
  if (!lang) {
    console.warn(`Unknown language code: ${languageCode}, defaulting to US English`);
    return LANGUAGE_MAP['en-US'].instruction;
  }
  return lang.instruction;
}

/**
 * Get web article writing style instructions
 */
export function getWebArticleStyleInstructions(): string {
  return `
WRITING STYLE REQUIREMENTS:
- Write in a clear, engaging web article style - NOT academic or essay-like
- Use short paragraphs (2-4 sentences each) for readability
- Write conversationally and directly to the reader
- Use active voice and concrete examples
- Break up text with subheadings for scannability
- Avoid overly complex jargon unless necessary for the topic
- Focus on practical, actionable insights
- Use transitions to maintain flow between sections`.trim();
}

/**
 * Get anti-fabrication instructions
 */
export function getAntiFabricationInstructions(): string {
  return `
CRITICAL - DO NOT FABRICATE:
- DO NOT invent statistics, percentages, or numerical data
- DO NOT create fake case studies, company examples, or customer stories
- DO NOT make up quotes from experts, leaders, or studies
- DO NOT cite non-existent research, surveys, or reports
- If you don't have specific data, write generally without inventing numbers
- If suggesting case studies could be valuable, note that as a suggestion WITHOUT creating fake ones
- Only include verifiable, well-known industry facts or general knowledge`.trim();
}
