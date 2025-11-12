import { openai } from "../../../../../server/utils/openai-client";
import { ContentWriterState } from "../types";
import { loggedOpenAICall } from "../../../../../server/utils/ai-logger";

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

    const prompt = `You are a fact-checking analyst. Analyze the following article for factual accuracy and logical consistency.

ARTICLE:
${article}

Check for:
1. Factual inaccuracies - Claims that are demonstrably false or misleading
2. Unverifiable claims - Statements that cannot be reasonably verified or lack proper context
3. Logical inconsistencies - Contradictions or flawed reasoning within the article

Provide your response in the following JSON format:
{
  "score": <number between 0-100, where 100 is completely accurate with no issues>,
  "issues": [
    "<specific issue 1>",
    "<specific issue 2>",
    ...
  ]
}

Be conservative but fair. Minor subjective statements are acceptable. Focus on clear factual errors, unsupported claims, and logical problems. If the article is well-written and accurate, the issues array should be empty.`;

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
