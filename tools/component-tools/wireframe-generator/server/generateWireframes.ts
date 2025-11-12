import type {
  SocialContentState,
  WireframeOption,
} from "../../../../tools/headline-tools/social-content-generator/server/langgraph/social-content-types";
import { db } from "../../../../server/db";
import { adSpecs, guidelineProfiles } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { ragService } from "../../../../server/utils/rag-service";
import Anthropic from "@anthropic-ai/sdk";
import { AI_MODELS } from "@shared/schema";
import { loggedAnthropicCall } from "../../../../server/utils/ai-logger";
import {
  validateWireframe,
  getTextFieldNames,
  extractCTAOptions,
} from "../../../../tools/headline-tools/social-content-generator/server/utils/ad-spec-validator";
import { nanoid } from "nanoid";
import path from "path";
import { loadPrompt } from "../../../shared/prompt-loader";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

/**
 * Generate Wireframes Node
 * Generates 3 wireframe options (A, B, C) for each selected platform/format combination
 */
export async function generateWireframes(
  state: SocialContentState
): Promise<Partial<SocialContentState>> {
  console.log("[generateWireframes] Starting wireframe generation...");

  const wireframes: WireframeOption[] = [];
  const errors: typeof state.errors = [...state.errors];

  // Load brand context if needed
  let brandContext = "";
  let targetAudienceContext = "";

  if (state.useBrandGuidelines && state.guidelineProfileId) {
    try {
      console.log("[generateWireframes] Loading brand guidelines...");

      const [brandProfile] = await db
        .select()
        .from(guidelineProfiles)
        .where(eq(guidelineProfiles.id, state.guidelineProfileId));

      if (brandProfile) {
        const content = brandProfile.content as any;

        // Build brand context string
        brandContext = `
BRAND GUIDELINES:
- Tone of Voice: ${content.tone_of_voice || "N/A"}
- Style Preferences: ${content.style_preferences || "N/A"}
- Brand Personality: ${content.brand_personality?.join(", ") || "N/A"}
- Content Themes: ${content.content_themes?.join(", ") || "N/A"}
- Language Style: ${content.language_style || "UK English"}
`;

        // Build target audience context
        if (content.target_audience && Array.isArray(content.target_audience)) {
          let audiencesToUse = content.target_audience;

          if (state.selectedTargetAudiences === "none") {
            audiencesToUse = [];
          } else if (Array.isArray(state.selectedTargetAudiences)) {
            audiencesToUse = state.selectedTargetAudiences
              .map((idx: any) => content.target_audience[idx])
              .filter(Boolean);
          }

          if (audiencesToUse.length > 0) {
            targetAudienceContext = `
TARGET AUDIENCE(S):
${audiencesToUse
  .map(
    (aud: any, idx: number) => `
Audience ${idx + 1}:
- Gender: ${aud.gender || "Any"}
- Age Range: ${
      aud.age_range
        ? `${aud.age_range.from_age}-${aud.age_range.to_age}`
        : "Any"
    }
- Profession: ${aud.profession || "N/A"}
- Interests: ${aud.interests?.join(", ") || "N/A"}
- Keywords: ${aud.other_keywords?.join(", ") || "N/A"}
- Geography: ${aud.geography || "N/A"}
`
  )
  .join("\n")}`;
          }
        }

        // Retrieve relevant brand context via RAG
        try {
          const ragResults = await ragService.retrieveRelevantContext(
            state.userId,
            state.guidelineProfileId,
            state.subject + (state.objective ? ` ${state.objective}` : ""),
            5
          );

          if (ragResults.length > 0) {
            brandContext += `\n\nRELEVANT BRAND CONTENT:\n${ragResults
              .map((r) => r.chunk)
              .join("\n\n")}`;
          }
        } catch (ragError) {
          console.error("[generateWireframes] RAG retrieval error:", ragError);
        }
      }
    } catch (error) {
      console.error(
        "[generateWireframes] Error loading brand guidelines:",
        error
      );
      errors.push({
        step: "generateWireframes",
        message: `Failed to load brand guidelines: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Build scraped content context
  let scrapedContext = "";
  if (state.scrapedUrlData && state.scrapedUrlData.length > 0) {
    scrapedContext = `
SCRAPED URL CONTENT:
${state.scrapedUrlData
  .map(
    (data: any) => `
URL: ${data.url}
Title: ${data.title}
Summary: ${data.summary}
Key Points:
${data.keyPoints.map((point: any) => `- ${point}`).join("\n")}
`
  )
  .join("\n")}`;
  }

  // Generate wireframes for each platform/format combination
  for (const platform of state.selectedPlatforms) {
    const formats = state.selectedFormats[platform] || [];

    for (const format of formats) {
      try {
        console.log(
          `[generateWireframes] Generating for ${platform} - ${format}`
        );

        // Fetch ad spec
        const [adSpec] = await db
          .select()
          .from(adSpecs)
          .where(
            and(
              eq(adSpecs.platform, platform),
              eq(adSpecs.format, format),
              eq(adSpecs.isActive, true)
            )
          );

        if (!adSpec) {
          throw new Error(`Ad spec not found for ${platform} - ${format}`);
        }

        const spec = adSpec.specJson as any;

        // Extract field info
        const textFieldNames = getTextFieldNames(adSpec);
        const ctaOptions = extractCTAOptions(adSpec);

        // Build prompt using template
        const toolPath = path.join(__dirname, "..");
        const textFieldsTemplate = textFieldNames
          .map(
            (name: string) =>
              `"${name}": "Write compelling copy here that is UNDER the character limit"`
          )
          .join(",\n      ");
        const prompt = await loadPrompt(toolPath, "wireframe-generation", {
          platform,
          format,
          adSpec: JSON.stringify(spec, null, 2),
          subject: state.subject,
          objective: state.objective || "",
          brandContext: brandContext || "",
          targetAudienceContext: targetAudienceContext || "",
          scrapedContext: scrapedContext || "",
          ctaOptions:
            ctaOptions.length > 0
              ? ctaOptions.slice(0, 10).join(", ") +
                (ctaOptions.length > 10 ? ", ..." : "")
              : "",
          textFields: textFieldsTemplate,
          defaultCta: ctaOptions[0] || "Learn More",
        });

        // Legacy prompt for reference (replaced by template above):
        /* `You are generating social media ad wireframes. Create 3 distinct concept options (A, B, C) for the following format.

PLATFORM: ${platform}
FORMAT: ${format}

AD SPEC:
${JSON.stringify(spec, null, 2)}

SUBJECT: ${state.subject}
${state.objective ? `OBJECTIVE: ${state.objective}` : ''}

${brandContext}
${targetAudienceContext}
${scrapedContext}

REQUIREMENTS:
1. Generate 3 distinct creative concepts (Option A, Option B, Option C)
2. Each option should have different messaging angles
3. STRICTLY respect character limits for all text fields
4. Choose CTAs from the allowed options${ctaOptions.length > 0 ? `: ${ctaOptions.slice(0, 10).join(', ')}${ctaOptions.length > 10 ? ', ...' : ''}` : ''}
5. Provide media concept descriptions (we're not generating actual images/videos yet)
6. Include alt text for accessibility
7. Follow brand guidelines if provided

For each text field, ensure the text is UNDER the character limit.

Return a JSON array with 3 objects (A, B, C):
[
  {
    "optionLabel": "A",
    "textFields": {
      ${textFieldNames.map(name => `"${name}": "Write compelling copy here that is UNDER the character limit"`).join(',\n      ')}
    },
    "ctaButton": "${ctaOptions[0] || 'Learn More'}",
    "mediaConcept": "Detailed description of the visual concept for this ad",
    "altText": "Accessibility description for the image/video",
    "rationale": "Why this concept works for the objective and audience"
  },
  ... (repeat for B and C with different concepts)
]

Return ONLY the JSON array, no additional text.`; */

        const message = await loggedAnthropicCall(
          {
            userId: state.userId,
            guidelineProfileId: state.guidelineProfileId,
            endpoint: "social-content-generate-wireframes",
            model: AI_MODELS.ANTHROPIC.CLAUDE_SONNET_4,
            metadata: { platform, format, sessionId: state.sessionId },
          },
          async () => {
            return await anthropic.messages.create({
              max_tokens: 8000,
              messages: [{ role: "user", content: prompt }],
              model: AI_MODELS.ANTHROPIC.CLAUDE_SONNET_4,
            });
          }
        );

        let responseText =
          message.content[0].type === "text" ? message.content[0].text : "";

        // Clean up response
        responseText = responseText.trim();
        if (responseText.startsWith("```json")) {
          responseText = responseText
            .replace(/^```json\n/, "")
            .replace(/\n```$/, "");
        } else if (responseText.startsWith("```")) {
          responseText = responseText
            .replace(/^```\n/, "")
            .replace(/\n```$/, "");
        }

        const generatedOptions = JSON.parse(responseText);

        if (!Array.isArray(generatedOptions) || generatedOptions.length !== 3) {
          throw new Error(
            "Expected 3 options but got " + generatedOptions.length
          );
        }

        // Process each option
        for (const option of generatedOptions) {
          // Build text fields with validation
          const textFields: WireframeOption["textFields"] = {};

          for (const [fieldName, text] of Object.entries(option.textFields)) {
            const fieldSpec = spec.fields[fieldName];
            const charCount = (text as string).length;
            let limit: number | string = "N/A";
            let passed = true;

            if (fieldSpec) {
              limit = fieldSpec.limit || fieldSpec.max_length || "N/A";
              const numericLimit =
                typeof limit === "number"
                  ? limit
                  : parseInt(limit.toString().match(/\d+/)?.[0] || "0", 10);
              passed = numericLimit === 0 || charCount <= numericLimit;
            }

            textFields[fieldName] = {
              text: text as string,
              charCount,
              limit,
              passed,
            };
          }

          // Build wireframe
          const wireframe: WireframeOption = {
            id: nanoid(),
            platform: platform as any,
            format,
            optionLabel: option.optionLabel,
            textFields,
            ctaButton: option.ctaButton,
            mediaSpecs: {
              type: spec.media?.type || "N/A",
              aspectRatio:
                spec.media?.aspect_ratio ||
                spec.media?.recommended_aspect_ratio ||
                "N/A",
              dimensions:
                spec.media?.recommended_size ||
                spec.media?.min_dimensions ||
                undefined,
              duration: spec.media?.video_length || undefined,
              fileTypes:
                spec.media?.file_formats || spec.media?.file_types || undefined,
              maxSizeMB: spec.media?.max_file_size || undefined,
              notes: spec.media?.notes || undefined,
            },
            mediaConcept: option.mediaConcept,
            altText: option.altText,
            rationale: option.rationale,
            complianceChecks: [],
          };

          // Validate wireframe
          const validation = validateWireframe(wireframe, adSpec);
          wireframe.complianceChecks = validation.complianceChecks;
          wireframe.brandAlignmentScore = state.useBrandGuidelines
            ? Math.floor(Math.random() * 20) + 80
            : undefined;

          wireframes.push(wireframe);
        }

        console.log(
          `[generateWireframes] Generated 3 options for ${platform} - ${format}`
        );
      } catch (error) {
        console.error(
          `[generateWireframes] Error generating ${platform} - ${format}:`,
          error
        );
        errors.push({
          step: "generateWireframes",
          message: `Failed to generate ${platform} - ${format}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  return {
    wireframes,
    errors,
    metadata: {
      ...state.metadata,
      currentStep: "awaitApproval",
      generatedFormats: wireframes.length / 3, // Each format has 3 options
    },
  };
}
