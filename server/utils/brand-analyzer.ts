import Anthropic from '@anthropic-ai/sdk';
import type { BrandGuidelineContent } from '@shared/schema';
import { crawlWebsite } from './web-crawler';

/*
<important_code_snippet_instructions>
The newest Anthropic model is "claude-sonnet-4-20250514", not "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022" nor "claude-3-sonnet-20240229". 
If the user doesn't specify a model, always prefer using "claude-sonnet-4-20250514" as it is the latest model.
</important_code_snippet_instructions>
*/

const DEFAULT_MODEL_STR = "claude-sonnet-4-20250514";

/**
 * Analyzes a website and extracts brand guidelines using Claude AI
 */
export async function analyzeBrandGuidelines(domainUrl: string): Promise<BrandGuidelineContent> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured. Please add your API key to continue.');
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Step 1: Crawl the website
  console.log(`Crawling website: ${domainUrl}`);
  const crawlResult = await crawlWebsite(domainUrl, 5);
  
  if (crawlResult.pages.length === 0) {
    throw new Error('Unable to crawl any pages from the provided URL');
  }

  // Step 2: Prepare content for AI analysis
  const pagesContent = crawlResult.pages.map((page, index) => {
    return `
=== PAGE ${index + 1}: ${page.title || page.url} ===
URL: ${page.url}

HTML (first 3000 chars):
${page.html.substring(0, 3000)}

CSS:
${page.css.join('\n\n').substring(0, 2000)}
`;
  }).join('\n\n');

  // Step 3: Call Claude AI to analyze
  const prompt = `You are a brand analysis expert. Analyze the following website pages and extract comprehensive brand guidelines.

${pagesContent}

Based on the above website content, extract the following brand guideline information in JSON format:

{
  "domain_url": "the main domain URL",
  "color_palette": ["array of hex colors found in the design, limit to 5-8 main colors"],
  "tone_of_voice": "describe the overall tone and voice (professional, friendly, authoritative, casual, etc.)",
  "style_preferences": "describe the visual and design style preferences",
  "target_audience": [
    {
      "gender": "All/Male/Female or leave empty",
      "age_range": { "from_age": 25, "to_age": 45 },
      "profession": "target profession if evident",
      "interests": ["array of interests"],
      "other_keywords": ["B2B", "SaaS", etc.]
    }
  ],
  "brand_personality": ["array of personality traits like Innovative, Trustworthy, Bold"],
  "content_themes": ["array of main content themes"],
  "visual_style": "describe the visual style (minimalist, bold, playful, corporate, etc.)",
  "language_style": "describe the language and writing style used"
}

Guidelines for extraction:
1. Extract actual hex colors from CSS (look for color properties, background-color, etc.)
2. Infer tone of voice from the copy and messaging
3. Identify target audience from content, imagery, and messaging
4. Extract brand personality from how the brand presents itself
5. Identify content themes from the topics and messaging
6. Be specific and accurate based on actual content
7. If information is not available, use null or empty array

Return ONLY the JSON object, no additional text.`;

  const message = await anthropic.messages.create({
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
    model: DEFAULT_MODEL_STR,
  });

  // Step 4: Parse and return the result
  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  
  try {
    const guidelines = JSON.parse(responseText);
    return guidelines as BrandGuidelineContent;
  } catch (error) {
    console.error('Failed to parse AI response:', responseText);
    throw new Error('Failed to parse brand guidelines from AI response');
  }
}
