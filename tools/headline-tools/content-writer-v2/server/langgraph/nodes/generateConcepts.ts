import { openai } from "../../../../../server/utils/openai-client";
import { nanoid } from "nanoid";
import { ContentWriterState } from "../types";
import { loggedOpenAICall } from "../../../../../server/utils/ai-logger";
import { ragService } from "../../../../../server/utils/rag-service";
import { getAntiFabricationInstructions } from "../../../../../server/utils/language-helpers";

function stripMarkdownCodeBlocks(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
}

export async function generateConcepts(state: ContentWriterState): Promise<Partial<ContentWriterState>> {
  try {
    const { topic, guidelineProfileId, userId, styleMatchingMethod = 'continuous', matchStyle = false } = state;

    const ragContext = await ragService.retrieveUserFeedback(userId, 'content-writer', guidelineProfileId);
    
    const brandContext = (guidelineProfileId && styleMatchingMethod === 'continuous')
      ? await ragService.getBrandContextForPrompt(userId, guidelineProfileId, `Article concepts for: ${topic}`, { matchStyle })
      : '';

    const conceptPrompt = `Generate 5 unique article concept ideas based on the following topic: "${topic}"

${brandContext}
${ragContext}

${getAntiFabricationInstructions()}

For each concept, provide:
1. A compelling title suitable for a web article
2. A brief 2-3 sentence summary

Return the response as a JSON array with this exact structure:
[
  {
    "title": "Article Title Here",
    "summary": "Brief summary here..."
  }
]`;

    const completion = await loggedOpenAICall({
      userId,
      guidelineProfileId: guidelineProfileId || undefined,
      endpoint: 'content-writer-concepts',
      metadata: { topic }
    }, async () => {
      return await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: conceptPrompt }],
        temperature: 0.8,
      });
    });

    const conceptsText = completion.choices[0]?.message?.content || '[]';
    const conceptsData = JSON.parse(stripMarkdownCodeBlocks(conceptsText));

    const concepts = conceptsData.map((c: any, index: number) => ({
      id: nanoid(),
      title: c.title,
      summary: c.summary,
      rankOrder: index + 1,
    }));

    return {
      concepts,
      metadata: {
        ...state.metadata,
        currentStep: 'concepts',
      },
      status: 'processing',
    };
  } catch (error) {
    console.error("Error in generateConcepts:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      errors: [
        ...state.errors,
        {
          step: 'generateConcepts',
          message: errorMessage,
          timestamp: new Date().toISOString(),
        },
      ],
      status: 'failed',
    };
  }
}
