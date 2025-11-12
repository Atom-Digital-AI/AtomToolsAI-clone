import { openai } from "../../../../server/utils/openai-client";
import type { ContentWriterState } from "../../../../tools/headline-tools/content-writer-v2/server/langgraph/types";
import { loggedOpenAICall } from "../../../../server/utils/ai-logger";
import { storage } from "../../../../server/storage";
import { formatBrandGuidelines } from "../../../../server/utils/format-guidelines";
import { loadPrompt } from "../../../shared/prompt-loader";
import path from "path";

export async function checkBrandMatch(
  state: ContentWriterState
): Promise<Partial<ContentWriterState>> {
  try {
    const { userId, guidelineProfileId, articleDraft } = state;

    if (!articleDraft?.finalArticle) {
      return {
        brandScore: 100,
        metadata: {
          ...state.metadata,
          brandIssues: [],
        },
      };
    }

    const article = articleDraft.finalArticle;

    let brandGuidelines = "";
    if (guidelineProfileId) {
      const profile = await storage.getGuidelineProfile(
        guidelineProfileId,
        userId
      );
      if (profile) {
        brandGuidelines = formatBrandGuidelines(profile.content);
      }
    }

    if (!brandGuidelines) {
      return {
        brandScore: 100,
        metadata: {
          ...state.metadata,
          brandIssues: [],
        },
      };
    }

    const toolPath = path.join(__dirname, "..");
    const prompt = await loadPrompt(toolPath, "brand-analysis", {
      article,
      brandGuidelines,
    });

    const completion = await loggedOpenAICall(
      {
        userId,
        guidelineProfileId: guidelineProfileId || undefined,
        endpoint: "content-writer-brand-check",
        metadata: { hasGuidelines: !!brandGuidelines },
      },
      async () => {
        return await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          response_format: { type: "json_object" },
        });
      }
    );

    const responseText = completion.choices[0]?.message?.content || "{}";
    const result = JSON.parse(responseText);

    const brandScore = Math.max(0, Math.min(100, result.score || 100));
    const brandIssues = Array.isArray(result.issues) ? result.issues : [];

    return {
      brandScore,
      metadata: {
        ...state.metadata,
        brandIssues,
      },
    };
  } catch (error) {
    console.error("Error in checkBrandMatch:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      brandScore: 100,
      errors: [
        ...state.errors,
        {
          step: "checkBrandMatch",
          message: errorMessage,
          timestamp: new Date().toISOString(),
        },
      ],
      metadata: {
        ...state.metadata,
        brandIssues: [],
      },
    };
  }
}
