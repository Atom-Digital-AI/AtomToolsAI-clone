import { db } from "../db";
import { aiUsageLogs, type InsertAiUsageLog } from "@shared/schema";

// Pricing per 1M tokens (as of latest pricing)
const PRICING = {
  openai: {
    "gpt-4o": { input: 2.50, output: 10.00 },
    "gpt-4o-mini": { input: 0.150, output: 0.600 },
    "gpt-4-turbo": { input: 10.00, output: 30.00 },
    "gpt-4": { input: 30.00, output: 60.00 },
    "gpt-3.5-turbo": { input: 0.50, output: 1.50 },
  },
  anthropic: {
    "claude-opus-4-20250514": { input: 15.00, output: 75.00 },
    "claude-sonnet-4-20250514": { input: 3.00, output: 15.00 },
    "claude-3-5-sonnet-20241022": { input: 3.00, output: 15.00 },
    "claude-3-5-sonnet-20240620": { input: 3.00, output: 15.00 },
    "claude-3-opus-20240229": { input: 15.00, output: 75.00 },
    "claude-3-sonnet-20240229": { input: 3.00, output: 15.00 },
    "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
  },
};

/**
 * Calculate estimated cost for AI API usage
 */
function calculateCost(
  provider: "openai" | "anthropic",
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = PRICING[provider]?.[model as keyof typeof PRICING[typeof provider]];
  
  if (!pricing) {
    console.warn(`No pricing data for ${provider} model: ${model}`);
    return 0;
  }

  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  
  return inputCost + outputCost;
}

/**
 * Log AI API usage to database
 */
export async function logAiUsage(params: {
  userId?: string;
  guidelineProfileId?: string;
  provider: "openai" | "anthropic";
  model: string;
  endpoint: string;
  promptTokens: number;
  completionTokens: number;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
  metadata?: any;
}) {
  try {
    const totalTokens = params.promptTokens + params.completionTokens;
    const estimatedCost = calculateCost(
      params.provider,
      params.model,
      params.promptTokens,
      params.completionTokens
    );

    const logEntry: InsertAiUsageLog = {
      userId: params.userId,
      guidelineProfileId: params.guidelineProfileId,
      provider: params.provider,
      model: params.model,
      endpoint: params.endpoint,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      totalTokens,
      estimatedCost: estimatedCost.toFixed(6),
      durationMs: params.durationMs,
      success: params.success,
      errorMessage: params.errorMessage,
      metadata: params.metadata,
    };

    await db.insert(aiUsageLogs).values(logEntry);

    // Log to console for immediate visibility
    console.log(
      `[AI Usage] ${params.provider}/${params.model} | ${params.endpoint} | ` +
      `${totalTokens} tokens (${params.promptTokens} in / ${params.completionTokens} out) | ` +
      `$${estimatedCost.toFixed(6)} | ${params.durationMs}ms | ` +
      `${params.success ? 'SUCCESS' : 'FAILED'}`
    );
  } catch (error) {
    console.error("Failed to log AI usage:", error);
  }
}

/**
 * Wrapper for OpenAI API calls with automatic logging
 */
export async function loggedOpenAICall<T>(
  params: {
    userId?: string;
    guidelineProfileId?: string;
    endpoint: string;
    metadata?: any;
  },
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let response: any;
  let success = true;
  let errorMessage: string | undefined;

  try {
    response = await apiCall();
    return response;
  } catch (error) {
    success = false;
    errorMessage = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    const durationMs = Date.now() - startTime;

    // Extract usage from response
    if (response?.usage) {
      await logAiUsage({
        ...params,
        provider: "openai",
        model: response.model || "unknown",
        promptTokens: response.usage.prompt_tokens || 0,
        completionTokens: response.usage.completion_tokens || 0,
        durationMs,
        success,
        errorMessage,
      });
    }
  }
}

/**
 * Wrapper for Anthropic API calls with automatic logging
 */
export async function loggedAnthropicCall<T extends { usage?: any; model?: string }>(
  params: {
    userId?: string;
    guidelineProfileId?: string;
    endpoint: string;
    model: string;
    metadata?: any;
  },
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let response: T | undefined;
  let success = true;
  let errorMessage: string | undefined;

  try {
    response = await apiCall();
    return response;
  } catch (error) {
    success = false;
    errorMessage = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    const durationMs = Date.now() - startTime;

    // Extract usage from response
    if (response?.usage) {
      await logAiUsage({
        ...params,
        provider: "anthropic",
        model: response.model || params.model,
        promptTokens: response.usage.input_tokens || 0,
        completionTokens: response.usage.output_tokens || 0,
        durationMs,
        success,
        errorMessage,
      });
    }
  }
}
