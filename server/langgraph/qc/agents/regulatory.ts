import { openai } from "../../../utils/openai-client";
import { nanoid } from "nanoid";
import type { QCState, QCAgentReport } from "../types";
import { loggedOpenAICall } from "../../../utils/ai-logger";
import { storage } from "../../../storage";
import { formatRegulatoryGuidelines } from "../../../utils/format-guidelines";
import type { QCChange, QCIssue } from "@shared/schema";

/**
 * Regulatory Compliance Agent - Ensures content complies with regulatory requirements
 */
export async function runRegulatory(state: QCState): Promise<Partial<QCState>> {
  // Skip if agent not enabled
  if (!state.enabledAgents.includes('regulatory')) {
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
        const profile = await storage.getGuidelineProfile(rulesetId, state.userId);
        if (profile && profile.type === 'regulatory') {
          regulatoryGuidelines.push(formatRegulatoryGuidelines(profile.content));
          rulesetNames.push(profile.name);
        }
      }
    }
    // Otherwise, get all regulatory guidelines attached to brand
    else if (state.guidelineProfileId) {
      const brandProfile = await storage.getGuidelineProfile(state.guidelineProfileId, state.userId);
      if (brandProfile && typeof brandProfile.content === 'object' && 'regulatory_guideline_id' in brandProfile.content) {
        const regId = (brandProfile.content as any).regulatory_guideline_id;
        if (regId) {
          const regProfile = await storage.getGuidelineProfile(regId, state.userId);
          if (regProfile) {
            regulatoryGuidelines.push(formatRegulatoryGuidelines(regProfile.content));
            rulesetNames.push(regProfile.name);
          }
        }
      }
    }
    
    // If no regulatory guidelines to check, return perfect score
    if (regulatoryGuidelines.length === 0) {
      const report: QCAgentReport = {
        agentType: 'regulatory',
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
    
    const combinedRegulations = regulatoryGuidelines.join('\n\n--- NEXT RULESET ---\n\n');
    
    const prompt = `You are The Regulatory Compliance Officer - an expert at ensuring content complies with all relevant regulatory rules.

REGULATORY RULES (${rulesetNames.join(', ')}):
${combinedRegulations}

CONTENT TO REVIEW:
${state.content}

Analyze the content for:
1. **Regulatory breaches** - Does content violate any specified rules?
2. **Required disclaimers** - Are mandatory disclosures present?
3. **Prohibited claims** - Are there any forbidden statements?
4. **Compliance requirements** - Are all regulatory obligations met?

Provide your analysis in JSON format:
{
  "score": <0-100, where 100 is fully compliant>,
  "issues": [
    {
      "id": "<unique-id>",
      "type": "breach|missing_disclaimer|prohibited_claim|non_compliance",
      "severity": "critical|high|medium|low",
      "message": "<description of violation with rule reference>",
      "location": { "start": <char index>, "end": <char index> },
      "affectedText": "<non-compliant text>",
      "suggestedFix": "<compliant alternative>"
    }
  ],
  "suggestions": [
    {
      "id": "<unique-id>",
      "type": "breach|missing_disclaimer|prohibited_claim|non_compliance",
      "severity": "critical|high|medium|low",
      "original": "<non-compliant text>",
      "suggested": "<compliant text>",
      "reason": "<which rule requires this change>",
      "confidence": <0-100>,
      "location": { "start": <char index>, "end": <char index> }
    }
  ]
}

CRITICAL RULES:
- ALL regulatory violations are CRITICAL severity
- Every compliance issue MUST reference the specific rule violated
- Only flag clear breaches - external standards should not influence assessment
- Regulatory requirements override all other considerations
- If a disclaimer is required, specify exactly where and what it should say
- Include precise character positions`;

    const completion = await loggedOpenAICall({
      userId: state.userId,
      guidelineProfileId: state.guidelineProfileId,
      endpoint: 'qc-regulatory',
      metadata: { rulesetCount: regulatoryGuidelines.length, rulesetNames }
    }, async () => {
      return await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" },
      });
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    
    // Add agent metadata to suggestions
    const suggestions: QCChange[] = (result.suggestions || []).map((s: any) => ({
      ...s,
      id: s.id || nanoid(),
      agentId: 'regulatory',
      agentType: 'regulatory',
    }));
    
    // Ensure issues have IDs
    const issues: QCIssue[] = (result.issues || []).map((i: any) => ({
      ...i,
      id: i.id || nanoid(),
    }));
    
    const report: QCAgentReport = {
      agentType: 'regulatory',
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
      errors: [{
        agent: 'regulatory',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }],
    };
  }
}
