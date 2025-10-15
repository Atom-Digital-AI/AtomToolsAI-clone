import Anthropic from "@anthropic-ai/sdk";
import { BrandGuidelineContent } from "@shared/schema";

export async function analyzePdfForBrandGuidelines(pdfBase64: string): Promise<BrandGuidelineContent> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY environment variable is required for PDF analysis. " +
      "Please add your Anthropic API key to use the auto-populate feature."
    );
  }

  const anthropic = new Anthropic({ apiKey });

  const prompt = `You are a brand guideline analyzer. Analyze the provided PDF brand guideline document and extract structured brand information.

Please analyze the document and provide a comprehensive JSON response with the following structure:

{
  "color_palette": ["#hexcolor1", "#hexcolor2", ...],
  "tone_of_voice": "Description of brand tone and voice",
  "target_audience": [
    {
      "gender": "male/female/all",
      "age_range": "18-24",
      "profession": "Job title or profession",
      "interests": ["interest1", "interest2", ...]
    }
  ],
  "brand_personality": ["trait1", "trait2", ...],
  "content_themes": ["theme1", "theme2", ...],
  "visual_style": "Description of visual style preferences",
  "language_style": "Description of language and communication style"
}

Guidelines for extraction:
1. **Color Palette**: Extract primary and secondary brand colors in hex format. Look for color swatches, palettes, or color specifications.
2. **Tone of Voice**: Summarize how the brand communicates - formal/casual, friendly/professional, etc.
3. **Target Audience**: Identify demographics and psychographics. Create multiple audience segments if mentioned.
4. **Brand Personality**: List personality traits and characteristics (e.g., innovative, trustworthy, playful).
5. **Content Themes**: Main topics and themes the brand focuses on in their content.
6. **Visual Style**: Design preferences, imagery style, typography preferences.
7. **Language Style**: Writing style, vocabulary level, sentence structure preferences.

If any field cannot be determined from the document, use an empty array [] or empty string "" as appropriate.

Respond ONLY with valid JSON matching the structure above. Do not include any explanatory text outside the JSON.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
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
    console.error("PDF brand analysis error:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to analyze PDF: ${error.message}`);
    }
    throw new Error("Failed to analyze PDF brand guidelines");
  }
}
