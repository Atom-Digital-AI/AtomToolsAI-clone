import OpenAI from "openai";
import { nanoid } from "nanoid";
import type { QCState, QCAgentReport } from "../types";
import { loggedOpenAICall } from "../../../utils/ai-logger";
import type { QCChange, QCIssue } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Proofreader Agent - Checks for grammar, spelling, punctuation, and style issues
 */
export async function runProofreader(state: QCState): Promise<Partial<QCState>> {
  // Skip if agent not enabled
  if (!state.enabledAgents.includes('proofreader')) {
    return {};
  }
  
  const startTime = Date.now();
  
  try {
    const prompt = `You are a professional proofreader and copy editor.

CONTENT TO REVIEW:
${state.content}

Analyze the content for:
1. Grammar errors (subject-verb agreement, tense consistency, etc.)
2. Spelling mistakes
3. Punctuation errors
4. Typographical inconsistencies
5. Sentence structure issues
6. Clarity and readability improvements

Provide your analysis in JSON format:
{
  "score": <0-100, where 100 is perfect>,
  "issues": [
    {
      "id": "<unique-id>",
      "type": "grammar|spelling|punctuation|style",
      "severity": "critical|high|medium|low",
      "message": "<description of issue>",
      "location": { "start": <char index>, "end": <char index> },
      "affectedText": "<text with issue>",
      "suggestedFix": "<corrected text>"
    }
  ],
  "suggestions": [
    {
      "id": "<unique-id>",
      "type": "grammar|spelling|punctuation|style",
      "severity": "critical|high|medium|low",
      "original": "<original text>",
      "suggested": "<improved text>",
      "reason": "<why this change improves the content>",
      "confidence": <0-100>,
      "location": { "start": <char index>, "end": <char index> }
    }
  ]
}

Rules:
- Only suggest changes that improve correctness or clarity
- Be conservative with style suggestions
- High confidence (>90) only for clear errors
- Include precise character positions for all changes
- Grammar and spelling errors are HIGH severity
- Style improvements are MEDIUM or LOW severity`;

    const completion = await loggedOpenAICall({
      userId: state.userId,
      guidelineProfileId: state.guidelineProfileId,
      endpoint: 'qc-proofreader',
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
      agentId: 'proofreader',
      agentType: 'proofreader',
    }));
    
    // Ensure issues have IDs
    const issues: QCIssue[] = (result.issues || []).map((i: any) => ({
      ...i,
      id: i.id || nanoid(),
    }));
    
    const report: QCAgentReport = {
      agentType: 'proofreader',
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
      errors: [{
        agent: 'proofreader',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }],
    };
  }
}
