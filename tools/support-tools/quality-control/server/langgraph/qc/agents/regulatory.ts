import { openai } from "../../../../../../../server/utils/openai-client";
import { nanoid } from "nanoid";
import type { QCState, QCAgentReport } from "../types";
import { loggedOpenAICall } from "../../../../../../../server/utils/ai-logger";
import { storage } from "../../../../../../../server/storage";
import { formatRegulatoryGuidelines } from "../../../../../../../server/utils/format-guidelines";
import type { QCChange, QCIssue } from "@shared/schema";
import { loadPrompt } from "../../../../../../shared/prompt-loader";
import path from "path";

/**
 * Regulatory Compliance Agent - Ensures content complies with regulatory requirements
 */
export async function runRegulatory(state: QCState): Promise<Partial<QCState>> {
  // Skip if agent not enabled
  if (!state.enabledAgents.includes("regulatory")) {
    return {};
  }

  const startTime = Date.now();

  try {
    // Get regulatory guidelines
    const regulatoryGuidelines: string[] = [];
    const rulesetNames: string[] = [];

    // If specific rulesets provided, use those
    if (state.regulatoryRulesetIds && state.regulatoryRulesetIds.length > 0) {
      for (const rulesetId of state.regulatoryRulesetIds) {
        const profile = await storage.getGuidelineProfile(
          rulesetId,
          state.userId
        );
        if (profile && profile.type === "regulatory") {
          regulatoryGuidelines.push(
            formatRegulatoryGuidelines(profile.content)
          );
          rulesetNames.push(profile.name);
        }
      }
    }
    // Otherwise, get all regulatory guidelines attached to brand
    else if (state.guidelineProfileId) {
      const brandProfile = await storage.getGuidelineProfile(
        state.guidelineProfileId,
        state.userId
      );
      if (
        brandProfile &&
        typeof brandProfile.content === "object" &&
        "regulatory_guideline_id" in brandProfile.content
      ) {
        const regId = (brandProfile.content as any).regulatory_guideline_id;
        if (regId) {
          const regProfile = await storage.getGuidelineProfile(
            regId,
            state.userId
          );
          if (regProfile) {
            regulatoryGuidelines.push(
              formatRegulatoryGuidelines(regProfile.content)
            );
            rulesetNames.push(regProfile.name);
          }
        }
      }
    }

    // If no regulatory guidelines to check, return perfect score
    if (regulatoryGuidelines.length === 0) {
      const report: QCAgentReport = {
        agentType: "regulatory",
        score: 100,
        executionTimeMs: Date.now() - startTime,
        issues: [],
        suggestions: [],
        metadata: {
          rulesetCount: 0,
          noRulesetsFound: true,
        },
      };

      return {
        regulatoryReport: report,
      };
    }

    const combinedRegulations = regulatoryGuidelines.join(
      "\n\n--- NEXT RULESET ---\n\n"
    );

    const toolPath = path.join(__dirname, "../prompts");
    const prompt = await loadPrompt(toolPath, "regulatory-compliance", {
      rulesetNames: rulesetNames.join(", "),
      combinedRegulations,
      content: state.content,
    });

    const completion = await loggedOpenAICall(
      {
        userId: state.userId,
        guidelineProfileId: state.guidelineProfileId,
        endpoint: "qc-regulatory",
        metadata: { rulesetCount: regulatoryGuidelines.length, rulesetNames },
      },
      async () => {
        return await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
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
        agentId: "regulatory",
        agentType: "regulatory",
      })
    );

    // Ensure issues have IDs
    const issues: QCIssue[] = (result.issues || []).map((i: any) => ({
      ...i,
      id: i.id || nanoid(),
    }));

    const report: QCAgentReport = {
      agentType: "regulatory",
      score: Math.max(0, Math.min(100, result.score || 100)),
      executionTimeMs: Date.now() - startTime,
      issues,
      suggestions,
      metadata: {
        totalIssues: issues.length,
        totalSuggestions: suggestions.length,
        rulesetCount: regulatoryGuidelines.length,
        rulesetNames,
      },
    };

    return {
      regulatoryReport: report,
      allSuggestions: suggestions,
    };
  } catch (error) {
    console.error("Error in regulatory agent:", error);
    return {
      errors: [
        {
          agent: "regulatory",
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
