import { getOpenAIClient } from "../../../utils/openai-client";
import { nanoid } from "nanoid";
import type { QCState, QCAgentReport } from "../types";
import { loggedOpenAICall } from "../../../utils/ai-logger";
import type { QCChange, QCIssue } from "@shared/schema";

// Lazy-loaded OpenAI client
const getOpenai = () => getOpenAIClient();

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
    const prompt = `You are The Fact & Citation Checker - an expert at verifying factual accuracy.

CONTENT TO REVIEW:
${state.content}

Analyze the content for:
1. **Factual accuracy** - Are all claims accurate and verifiable?
2. **Citations** - Are claims properly attributed to credible sources?
3. **Statistics** - Are numerical claims accurate and up-to-date?
4. **Logical consistency** - Are there contradictions or flawed reasoning?
5. **Unverifiable claims** - Are there unsupported assertions?

Provide your analysis in JSON format:
{
  "score": <0-100, where 100 is completely accurate>,
  "issues": [
    {
      "id": "<unique-id>",
      "type": "fact_error|missing_citation|outdated|unverifiable|contradiction",
      "severity": "critical|high|medium|low",
      "message": "<description of factual issue>",
      "location": { "start": <char index>, "end": <char index> },
      "affectedText": "<problematic claim>",
      "suggestedFix": "<corrected or cited version>"
    }
  ],
  "suggestions": [
    {
      "id": "<unique-id>",
      "type": "fact_error|missing_citation|outdated|unverifiable|contradiction",
      "severity": "critical|high|medium|low",
      "original": "<original claim>",
      "suggested": "<corrected/cited claim>",
      "reason": "<why this is more accurate>",
      "confidence": <0-100>,
      "location": { "start": <char index>, "end": <char index> }
    }
  ]
}

Rules:
- Only flag claims that are demonstrably false or unverifiable
- Factual errors are CRITICAL severity
- Missing citations for specific claims are HIGH severity
- Outdated information is MEDIUM severity
- Conservative with confidence - only >90 for clear errors
- Do not flag subjective opinions or general statements
- Include precise character positions`;

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
