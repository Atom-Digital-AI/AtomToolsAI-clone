import { openai } from "../../../../../server/utils/openai-client";
import { ContentWriterState } from "../types";
import { loggedOpenAICall } from "../../../../../server/utils/ai-logger";
import { storage } from "../../../../../server/storage";
import { formatBrandGuidelines } from "../../../../../server/utils/format-guidelines";

export async function checkBrandMatch(state: ContentWriterState): Promise<Partial<ContentWriterState>> {
  try {
    const {
      userId,
      guidelineProfileId,
      articleDraft,
    } = state;

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

    let brandGuidelines = '';
    if (guidelineProfileId) {
      const profile = await storage.getGuidelineProfile(guidelineProfileId, userId);
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

    const prompt = `You are a brand consistency analyst. Analyze the following article against the brand guidelines and provide a comprehensive assessment.

ARTICLE:
${article}

BRAND GUIDELINES:
${brandGuidelines}

Analyze the article and check for:
1. Tone consistency - Does the article match the brand's tone and voice?
2. Target audience alignment - Is the content appropriate for the brand's target audience?
3. Brand voice match - Does the writing style align with the brand's voice and messaging?

Provide your response in the following JSON format:
{
  "score": <number between 0-100, where 100 is perfect brand match>,
  "issues": [
    "<specific issue 1>",
    "<specific issue 2>",
    ...
  ]
}

Be specific about issues found. If the article is excellent, the issues array should be empty.`;

    const completion = await loggedOpenAICall({
      userId,
      guidelineProfileId: guidelineProfileId || undefined,
      endpoint: 'content-writer-brand-check',
      metadata: { hasGuidelines: !!brandGuidelines }
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
          step: 'checkBrandMatch',
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
