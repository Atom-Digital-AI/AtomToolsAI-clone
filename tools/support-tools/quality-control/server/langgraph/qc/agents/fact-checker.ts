import { openai } from "../../../../../../../server/utils/openai-client";
import { nanoid } from "nanoid";
import type { QCState, QCAgentReport } from "../types";
import { loggedOpenAICall } from "../../../../../../../server/utils/ai-logger";
import type { QCChange, QCIssue } from "@shared/schema";
import { loadPrompt } from "../../../../../shared/prompt-loader";
import path from "path";

/**
 * Fact Checker Agent - Verifies factual accuracy and logical consistency
 */
export async function runFactChecker(state: QCState): Promise<Partial<QCState>> {
  // Skip if agent not enabled
  if (!state.enabledAgents.includes('fact_checker')) {
    return {};
  }
  
  const startTime = Date.now();
  
  try {
    const toolPath = path.join(__dirname, '../prompts');
    const prompt = await loadPrompt(toolPath, 'fact-checking', {
      content: state.content
    });

    const completion = await loggedOpenAICall({
      userId: state.userId,
      guidelineProfileId: state.guidelineProfileId,
      endpoint: 'qc-fact-checker',
      metadata: { contentLength: state.content.length }
    }, async () => {
      return await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        response_format: { type: "json_object" },
      });
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    
    // Add agent metadata to suggestions
    const suggestions: QCChange[] = (result.suggestions || []).map((s: any) => ({
      ...s,
      id: s.id || nanoid(),
      agentId: 'fact_checker',
      agentType: 'fact_checker',
    }));
    
    // Ensure issues have IDs
    const issues: QCIssue[] = (result.issues || []).map((i: any) => ({
      ...i,
      id: i.id || nanoid(),
    }));
    
    const report: QCAgentReport = {
      agentType: 'fact_checker',
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
      factCheckerReport: report,
      allSuggestions: suggestions,
    };
  } catch (error) {
    console.error("Error in fact checker agent:", error);
    return {
      errors: [{
        agent: 'fact_checker',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }],
    };
  }
}
