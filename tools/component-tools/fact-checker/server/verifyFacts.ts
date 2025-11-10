import { openai } from "../../../../../server/utils/openai-client";
import type { ContentWriterState } from "../../../../headline-tools/content-writer-v2/server/langgraph/types";
import { loggedOpenAICall } from "../../../../../server/utils/ai-logger";
import { loadPrompt } from "../../../shared/prompt-loader";
import path from "path";

export async function verifyFacts(state: ContentWriterState): Promise<Partial<ContentWriterState>> {
  try {
    const {
      userId,
      guidelineProfileId,
      articleDraft,
    } = state;

    if (!articleDraft?.finalArticle) {
      return {
        factScore: 100,
        metadata: {
          ...state.metadata,
          factIssues: [],
        },
      };
    }

    const article = articleDraft.finalArticle;

    const toolPath = path.join(__dirname, '..');
    const prompt = await loadPrompt(toolPath, 'fact-checking', {
      article
    });

    const completion = await loggedOpenAICall({
      userId,
      guidelineProfileId: guidelineProfileId || undefined,
      endpoint: 'content-writer-fact-check',
      metadata: { articleLength: article.length }
    }, async () => {
      return await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        response_format: { type: "json_object" },
      });
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(responseText);

    const factScore = Math.max(0, Math.min(100, result.score || 100));
    const factIssues = Array.isArray(result.issues) ? result.issues : [];

    return {
      factScore,
      metadata: {
        ...state.metadata,
        factIssues,
      },
    };
  } catch (error) {
    console.error("Error in verifyFacts:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      factScore: 100,
      errors: [
        ...state.errors,
        {
          step: 'verifyFacts',
          message: errorMessage,
          timestamp: new Date().toISOString(),
        },
      ],
      metadata: {
        ...state.metadata,
        factIssues: [],
      },
    };
  }
}
