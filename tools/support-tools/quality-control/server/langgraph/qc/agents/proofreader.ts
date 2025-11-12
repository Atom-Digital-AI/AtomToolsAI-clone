import { openai } from "../../../../../../../server/utils/openai-client";
import { nanoid } from "nanoid";
import type { QCState, QCAgentReport } from "../types";
import { loggedOpenAICall } from "../../../../../../../server/utils/ai-logger";
import type { QCChange, QCIssue } from "@shared/schema";
import { loadPrompt } from "../../../../../../shared/prompt-loader";
import path from "path";

/**
 * Proofreader Agent - Checks for grammar, spelling, punctuation, and style issues
 */
export async function runProofreader(
  state: QCState
): Promise<Partial<QCState>> {
  // Skip if agent not enabled
  if (!state.enabledAgents.includes("proofreader")) {
    return {};
  }

  const startTime = Date.now();

  try {
    const toolPath = path.join(__dirname, "../prompts");
    const prompt = await loadPrompt(toolPath, "proofreading", {
      content: state.content,
    });

    const completion = await loggedOpenAICall(
      {
        userId: state.userId,
        guidelineProfileId: state.guidelineProfileId,
        endpoint: "qc-proofreader",
        metadata: { contentLength: state.content.length },
      },
      async () => {
        return await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          response_format: { type: "json_object" },
        });
      }
    );

    const result = JSON.parse(completion.choices[0]?.message?.content || "{}");

    // Add agent metadata to suggestions
    const suggestions: QCChange[] = (result.suggestions || []).map(
      (s: any) => ({
        ...s,
        id: s.id || nanoid(),
        agentId: "proofreader",
        agentType: "proofreader",
      })
    );

    // Ensure issues have IDs
    const issues: QCIssue[] = (result.issues || []).map((i: any) => ({
      ...i,
      id: i.id || nanoid(),
    }));

    const report: QCAgentReport = {
      agentType: "proofreader",
      score: Math.max(0, Math.min(100, result.score || 100)),
      executionTimeMs: Date.now() - startTime,
      issues,
      suggestions,
      metadata: {
        totalIssues: issues.length,
        totalSuggestions: suggestions.length,
      },
    };

    return {
      proofreaderReport: report,
      allSuggestions: suggestions,
    };
  } catch (error) {
    console.error("Error in proofreader agent:", error);
    return {
      errors: [
        {
          agent: "proofreader",
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
