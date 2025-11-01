import { getOpenAIClient } from "../../../utils/openai-client";
import { nanoid } from "nanoid";
import type { QCState, QCAgentReport } from "../types";
import { loggedOpenAICall } from "../../../utils/ai-logger";
import { storage } from "../../../storage";
import { formatBrandGuidelines } from "../../../utils/format-guidelines";
import { ragService } from "../../../utils/rag-service";
import type { QCChange, QCIssue } from "@shared/schema";

// Lazy-loaded OpenAI client
const getOpenai = () => getOpenAIClient();

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
    
    const prompt = `You are The Brand Guardian - an expert at ensuring content strictly adheres to brand guidelines.

BRAND GUIDELINES:
${brandGuidelines}

${brandContext ? `BRAND STYLE EXAMPLES:\n${brandContext}\n` : ''}

CONTENT TO REVIEW:
${state.content}

Analyze the content for:
1. **Tone consistency** - Does it match the brand's tone of voice?
2. **Brand voice** - Does it reflect the brand's personality and communication style?
3. **Visual/verbal identity** - Are brand-specific terms used correctly?
4. **Style consistency** - Does writing style align with brand examples?
5. **Brand asset usage** - Are logos, colours, imagery mentioned correctly?
6. **Brand messaging** - Does it align with core brand themes and values?

Provide your analysis in JSON format:
{
  "score": <0-100, where 100 is perfect brand match>,
  "issues": [
    {
      "id": "<unique-id>",
      "type": "tone|voice|terminology|style|branding",
      "severity": "critical|high|medium|low",
      "message": "<description of brand guideline violation>",
      "location": { "start": <char index>, "end": <char index> },
      "affectedText": "<text that violates guidelines>",
      "suggestedFix": "<brand-compliant alternative>"
    }
  ],
  "suggestions": [
    {
      "id": "<unique-id>",
      "type": "tone|voice|terminology|style|branding",
      "severity": "critical|high|medium|low",
      "original": "<original text>",
      "suggested": "<brand-aligned text>",
      "reason": "<how this aligns with brand guidelines>",
      "confidence": <0-100>,
      "location": { "start": <char index>, "end": <char index> }
    }
  ]
}

Rules:
- All brand names, marks, and symbols must match exactly as specified - CRITICAL severity
- Tone and voice deviations are HIGH severity
- Style suggestions should reference specific brand guidelines
- Only suggest changes that improve brand consistency
- Include precise character positions`;

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
