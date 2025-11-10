import Anthropic from "@anthropic-ai/sdk";
import { BrandGuidelineContent, AI_MODELS } from "@shared/schema";
import { loggedAnthropicCall } from "../../../../../server/utils/ai-logger";
import { loadPrompt } from "../../../shared/prompt-loader";
import path from "path";

export async function analyzePdfForBrandGuidelines(pdfBase64: string, userId?: string): Promise<BrandGuidelineContent> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY environment variable is required for PDF analysis. " +
      "Please add your Anthropic API key to use the auto-populate feature."
    );
  }

  const anthropic = new Anthropic({ apiKey });

  const toolPath = path.join(__dirname, '../prompts');
  const prompt = await loadPrompt(toolPath, 'pdf-brand-analysis');

  // Try with the latest model first, fallback to older stable model if needed
  const models = [AI_MODELS.ANTHROPIC.CLAUDE_SONNET_4, AI_MODELS.ANTHROPIC.CLAUDE_3_5_SONNET];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const message = await loggedAnthropicCall({
        userId,
        endpoint: 'brand-guidelines-pdf-auto-populate',
        model,
        metadata: { pdfSize: pdfBase64.length }
      }, async () => {
        return await anthropic.messages.create({
          model,
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "document",
                  source: {
                    type: "base64",
                    media_type: "application/pdf",
                    data: pdfBase64,
                  },
                },
                {
                  type: "text",
                  text: prompt,
                },
              ],
            },
          ],
        });
      });

      // Extract text content from response
      const textContent = message.content.find((block) => block.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text response from Claude AI");
      }

      let responseText = textContent.text.trim();

      // Remove markdown code blocks if present
      if (responseText.startsWith("```json")) {
        responseText = responseText.replace(/^```json\n/, "").replace(/\n```$/, "");
      } else if (responseText.startsWith("```")) {
        responseText = responseText.replace(/^```\n/, "").replace(/\n```$/, "");
      }

      // Parse JSON response
      const brandData = JSON.parse(responseText) as BrandGuidelineContent;

      return brandData;
    } catch (error) {
      console.error(`PDF brand analysis error with model ${model}:`, error);
      lastError = error instanceof Error ? error : new Error("Unknown error");
      
      // If it's a model not found error, try the next model
      if (error instanceof Error && error.message.includes("not_found")) {
        continue;
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }

  // If all models failed, throw the last error
  if (lastError) {
    throw new Error(`Failed to analyze PDF with any available model: ${lastError.message}`);
  }
  
  throw new Error("Failed to analyze PDF brand guidelines");
}
