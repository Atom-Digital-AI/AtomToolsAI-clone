import { openai } from "../../../../../../../server/utils/openai-client";
import { nanoid } from "nanoid";
import type { QCState, QCAgentReport } from "../types";
import { loggedOpenAICall } from "../../../../../../../server/utils/ai-logger";
import { storage } from "../../../../../../../server/storage";
import { formatBrandGuidelines } from "../../../../../../../server/utils/format-guidelines";
import { ragService } from "../../../../../../../server/utils/rag-service";
import type { QCChange, QCIssue } from "@shared/schema";
import { loadPrompt } from "../../../../shared/prompt-loader";
import path from "path";

/**
 * Brand Guardian Agent - Ensures content adheres to brand guidelines
 */
export async function runBrandGuardian(state: QCState): Promise<Partial<QCState>> {
  // Skip if agent not enabled or no brand guidelines
  if (!state.enabledAgents.includes('brand_guardian') || !state.guidelineProfileId) {
    return {};
  }
  
  const startTime = Date.now();
  
  try {
    // Get brand guidelines
    const profile = await storage.getGuidelineProfile(state.guidelineProfileId, state.userId);
    if (!profile) {
      return {
        errors: [{
          agent: 'brand_guardian',
          message: 'Brand guideline profile not found',
          timestamp: new Date().toISOString(),
        }],
      };
    }
    
    const brandGuidelines = formatBrandGuidelines(profile.content);
    
    // Get RAG context for style matching
    const brandContext = await ragService.getBrandContextForPrompt(
      state.userId,
      state.guidelineProfileId,
      `Quality check content`,
      { matchStyle: true }
    );
    
    const toolPath = path.join(__dirname, '../../../../component-tools/brand-guardian');
    const prompt = await loadPrompt(toolPath, 'brand-analysis', {
      brandGuidelines,
      brandContext: brandContext || '',
      content: state.content
    });

    const completion = await loggedOpenAICall({
      userId: state.userId,
      guidelineProfileId: state.guidelineProfileId,
      endpoint: 'qc-brand-guardian',
      metadata: { hasBrandContext: !!brandContext }
    }, async () => {
      return await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        response_format: { type: "json_object" },
      });
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    
    // Add agent metadata to suggestions
    const suggestions: QCChange[] = (result.suggestions || []).map((s: any) => ({
      ...s,
      id: s.id || nanoid(),
      agentId: 'brand_guardian',
      agentType: 'brand_guardian',
    }));
    
    // Ensure issues have IDs
    const issues: QCIssue[] = (result.issues || []).map((i: any) => ({
      ...i,
      id: i.id || nanoid(),
    }));
    
    const report: QCAgentReport = {
      agentType: 'brand_guardian',
      score: Math.max(0, Math.min(100, result.score || 100)),
      executionTimeMs: Date.now() - startTime,
      issues,
      suggestions,
      metadata: {
        totalIssues: issues.length,
        totalSuggestions: suggestions.length,
        hasBrandContext: !!brandContext,
      },
    };
    
    return {
      brandGuardianReport: report,
      allSuggestions: suggestions,
    };
  } catch (error) {
    console.error("Error in brand guardian agent:", error);
    return {
      errors: [{
        agent: 'brand_guardian',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }],
    };
  }
}
