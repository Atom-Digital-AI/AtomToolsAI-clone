import type { SocialContentState, ScrapedUrl } from "../social-content-types";
import { crawlWebsite } from "../../utils/web-crawler";
import Anthropic from "@anthropic-ai/sdk";
import { AI_MODELS } from "@shared/schema";
import { loggedAnthropicCall } from "../../utils/ai-logger";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

/**
 * Scrape URLs Node
 * Scrapes provided URLs and extracts key information for content generation
 */
export async function scrapeUrls(state: SocialContentState): Promise<Partial<SocialContentState>> {
  console.log('[scrapeUrls] Starting URL scraping...');
  
  if (!state.urls || state.urls.length === 0) {
    console.log('[scrapeUrls] No URLs provided, skipping');
    return {
      metadata: {
        ...state.metadata,
        currentStep: 'wireframes',
      },
    };
  }
  
  const scrapedUrlData: ScrapedUrl[] = [];
  const errors: typeof state.errors = [...state.errors];
  
  for (const url of state.urls) {
    try {
      console.log(`[scrapeUrls] Scraping ${url}`);
      
      // Crawl the URL (1 page only)
      const crawlResult = await crawlWebsite(url, 1);
      
      if (crawlResult.pages.length === 0) {
        throw new Error('Failed to crawl URL');
      }
      
      const page = crawlResult.pages[0];
      const htmlContent = page.html.substring(0, 8000); // Limit content
      
      // Use Claude to extract key information
      const prompt = `Analyze this webpage and extract key information for social media content creation.

URL: ${url}
Title: ${page.title}

HTML Content (first 8000 chars):
${htmlContent}

Extract and return in JSON format:
{
  "summary": "Brief 2-3 sentence summary of the page",
  "keyPoints": ["Array of 3-5 key points, facts, or selling points from the page"],
  "title": "Page title or main heading"
}

Focus on:
- Main products/services offered
- Key benefits or features
- Calls to action
- Special offers or unique selling propositions
- Target audience insights

Return ONLY the JSON object, no additional text.`;

      const message = await loggedAnthropicCall({
        userId: state.userId,
        endpoint: 'social-content-scrape-urls',
        model: AI_MODELS.ANTHROPIC.CLAUDE_SONNET_4,
        metadata: { url, sessionId: state.sessionId }
      }, async () => {
        return await anthropic.messages.create({
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
          model: AI_MODELS.ANTHROPIC.CLAUDE_SONNET_4,
        });
      });
      
      let responseText = message.content[0].type === "text" ? message.content[0].text : "";
      
      // Clean up response
      responseText = responseText.trim();
      if (responseText.startsWith("```json")) {
        responseText = responseText.replace(/^```json\n/, "").replace(/\n```$/, "");
      } else if (responseText.startsWith("```")) {
        responseText = responseText.replace(/^```\n/, "").replace(/\n```$/, "");
      }
      
      const extracted = JSON.parse(responseText);
      
      scrapedUrlData.push({
        url,
        summary: extracted.summary,
        keyPoints: extracted.keyPoints,
        title: extracted.title,
      });
      
      console.log(`[scrapeUrls] Successfully scraped ${url}`);
    } catch (error) {
      console.error(`[scrapeUrls] Error scraping ${url}:`, error);
      errors.push({
        step: 'scrapeUrls',
        message: `Failed to scrape ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  return {
    scrapedUrlData,
    errors,
    metadata: {
      ...state.metadata,
      currentStep: 'wireframes',
    },
  };
}
