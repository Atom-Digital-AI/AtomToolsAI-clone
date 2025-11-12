import type { Express } from "express";
import { storage } from "../../../../server/storage";
import { PRODUCT_IDS } from "@shared/schema";
import { requireAuth } from "../../../../server/auth";
import { logToolError, getErrorTypeFromError } from "../../../../server/errorLogger";
import { formatBrandGuidelines, formatRegulatoryGuidelines, getRegulatoryGuidelineFromBrand } from "../../../../server/utils/format-guidelines";
import { ragService } from "../../../../server/utils/rag-service";
import { loggedOpenAICall } from "../../../../server/utils/ai-logger";
import { getLanguageInstruction } from "../../../../server/utils/language-helpers";
import { openai } from "../../../../server/utils/openai-client";
import { loadPrompt } from "../../../shared/prompt-loader";
import path from "path";
import { fileURLToPath } from "url";

function detectLanguage(text: string): string {
  // Simple language detection - could be enhanced with langdetect library
  // For now, default to English
  return 'en';
}

function getCaseInstruction(caseType: string): string {
  if (caseType === 'title') {
    return "Use Title Case formatting (capitalize the first letter of each major word)";
  }
  return "Use sentence case formatting (capitalize only the first letter and proper nouns)";
}

// Helper function to strip markdown code blocks from AI responses
function stripMarkdownCodeBlocks(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
}

export function registerSeoMetaRoutes(app: Express): void {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const toolPath = path.join(__dirname, '..');

  app.post("/api/tools/seo-meta/generate", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const productId = PRODUCT_IDS.SEO_META_GENERATOR;
      
      const {
        url,
        targetKeywords,
        brandName,
        sellingPoints = "",
        numVariations = 3,
        contentType = 'both',
        caseType = "sentence",
        brandGuidelines = "",
        regulatoryGuidelines = "",
        matchStyle = false
      } = req.body;

      // Check user's product access and tier limits
      const accessInfo = await storage.getUserProductAccess(userId, productId);
      if (!accessInfo.hasAccess) {
        return res.status(403).json({
          message: "Access denied. This feature requires an active subscription."
        });
      }

      // Check subfeature permissions
      const subfeatures = accessInfo.tierLimit?.subfeatures as any || {};
      
      // Validate brand guidelines usage
      if (brandGuidelines && !subfeatures.brand_guidelines) {
        return res.status(403).json({
          message: "Brand guidelines feature is not available in your current plan."
        });
      }
      
      // Validate variations usage  
      if (numVariations > 1 && !subfeatures.variations) {
        return res.status(403).json({
          message: "Multiple variations feature is not available in your current plan."
        });
      }

      if (!url && !targetKeywords) {
        return res.status(400).json({
          message: "Either URL or target keywords are required"
        });
      }

      // Detect language from available text
      const contentForDetection = `${targetKeywords} ${brandName} ${sellingPoints}`;
      const detectedLang = detectLanguage(contentForDetection);
      const languageInstruction = getLanguageInstruction(detectedLang === 'en' ? 'en-US' : `${detectedLang}-${detectedLang.toUpperCase()}`);
      const caseInstruction = getCaseInstruction(caseType);

      // Fetch attached regulatory guideline if brand guideline has one
      const attachedRegulatory = await getRegulatoryGuidelineFromBrand(brandGuidelines, userId, storage);
      const finalRegulatoryGuidelines = attachedRegulatory || regulatoryGuidelines;

      // RAG: Retrieve relevant brand context if using a profile
      // SECURITY: Verify profile ownership before RAG retrieval
      let ragContext = '';
      try {
        // Check if brandGuidelines is a profile ID (UUID format)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (brandGuidelines && uuidRegex.test(brandGuidelines.trim())) {
          // SECURITY: Verify the profile belongs to the user
          const profile = await storage.getGuidelineProfile(brandGuidelines.trim(), userId);
          if (!profile) {
            return res.status(403).json({
              message: "Access denied. This brand guideline profile does not belong to you."
            });
          }
          
          const query = `SEO meta content for: ${targetKeywords} ${brandName} ${sellingPoints}`;
          ragContext = await ragService.getBrandContextForPrompt(
            userId, // SECURITY: Pass userId for tenant isolation
            brandGuidelines.trim(),
            query,
            {
              limit: 5,
              minSimilarity: 0.7,
              matchStyle
            }
          );
        }
      } catch (error) {
        console.error("RAG retrieval error:", error);
        // Continue without RAG if it fails
      }

      // Build prompt using template
      const contentTypeInstruction = contentType === 'titles' 
        ? 'only SEO-optimized page titles' 
        : contentType === 'descriptions' 
        ? 'only meta descriptions' 
        : 'both SEO-optimized page titles and meta descriptions';

      const prompt = await loadPrompt(toolPath, 'seo-generation', {
        contentTypeInstruction,
        url: url || '',
        targetKeywords,
        brandName,
        sellingPoints,
        languageInstruction,
        ragContext: ragContext || '',
        brandGuidelines: brandGuidelines ? formatBrandGuidelines(brandGuidelines) : '',
        regulatoryGuidelines: finalRegulatoryGuidelines ? formatRegulatoryGuidelines(finalRegulatoryGuidelines) : '',
        numVariations,
        caseInstruction
      });

      const systemPrompt = await loadPrompt(toolPath, 'system-prompt');

      // Using gpt-4o-mini as requested by the user
      const response = await loggedOpenAICall({
        userId: (req as any).user.id,
        guidelineProfileId: brandGuidelines && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(brandGuidelines.trim()) ? brandGuidelines.trim() : undefined,
        endpoint: 'seo-meta-generate',
        metadata: { contentType, numVariations }
      }, async () => {
        return await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {"role": "system", "content": systemPrompt},
            {"role": "user", "content": prompt}
          ],
          max_tokens: 1000,
          temperature: 0.8
        });
      });

      const content = response.choices[0].message.content?.trim() || "";
      
      // Parse JSON response (exact Python logic)
      let result = null;
      if (content.includes('{') && content.includes('}')) {
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}') + 1;
        const jsonStr = content.substring(start, end);
        try {
          const parsed = JSON.parse(jsonStr);
          
          if (contentType === 'titles' && parsed.titles) {
            result = { titles: parsed.titles, descriptions: [] };
          } else if (contentType === 'descriptions' && parsed.descriptions) {
            result = { titles: [], descriptions: parsed.descriptions };
          } else if (contentType === 'both') {
            result = {
              titles: parsed.titles || [],
              descriptions: parsed.descriptions || []
            };
          }
        } catch (e) {
          console.error("Failed to parse SEO response:", e);
        }
      }

      if (!result) {
        return res.status(500).json({ message: "Failed to generate SEO content" });
      }

      // Increment usage for SEO Meta tool
      const seoMetaProductId = PRODUCT_IDS.SEO_META_GENERATOR;
      const usageAccessInfo = await storage.getUserProductAccess((req as any).user.id, seoMetaProductId);
      if (usageAccessInfo.tierLimit) {
        await storage.incrementUsage((req as any).user.id, seoMetaProductId, usageAccessInfo.tierLimit.periodicity);
      }

      res.json(result);
    } catch (error) {
      console.error("SEO generation error:", error);
      
      // Log error for admin portal
      await logToolError({
        userId: req.user?.id,
        userEmail: req.user?.email,
        toolName: 'SEO Meta Generator',
        errorType: getErrorTypeFromError(error),
        errorMessage: (error as any)?.message || 'Unknown error occurred',
        errorStack: (error as any)?.stack,
        requestData: req.body,
        httpStatus: (error as any)?.status || 500,
        endpoint: '/api/tools/seo-meta/generate',
        req,
        responseHeaders: (error as any)?.headers ? Object.fromEntries((error as any).headers.entries()) : null
      });
      
      res.status(500).json({ message: "Internal server error" });
    }
  });
}

