import { openai } from "../../../../../server/utils/openai-client";
import { nanoid } from "nanoid";
import type { ContentWriterState } from "../../../../headline-tools/content-writer-v2/server/langgraph/types";
import { loggedOpenAICall } from "../../../../../server/utils/ai-logger";
import { ragService } from "../../../../../server/utils/rag-service";
import { storage } from "../../../../../server/storage";
import { formatSelectedTargetAudiences } from "../../../../../server/utils/format-guidelines";
import { getLanguageInstruction, getWebArticleStyleInstructions, getAntiFabricationInstructions } from "../../../../../server/utils/language-helpers";
import { loadPrompt } from "../../../shared/prompt-loader";
import path from "path";

function stripMarkdownCodeBlocks(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
}

export async function generateSubtopics(state: ContentWriterState): Promise<Partial<ContentWriterState>> {
  try {
    const {
      userId,
      guidelineProfileId,
      selectedConceptId,
      concepts,
      objective,
      targetLength,
      toneOfVoice,
      language,
      internalLinks,
      useBrandGuidelines,
      selectedTargetAudiences,
      styleMatchingMethod = 'continuous',
      matchStyle = false,
    } = state;

    if (!selectedConceptId) {
      throw new Error("No concept selected for subtopic generation");
    }

    const chosenConcept = concepts.find(c => c.id === selectedConceptId);
    if (!chosenConcept) {
      throw new Error("Selected concept not found");
    }

    const ragContext = await ragService.retrieveUserFeedback(userId, 'content-writer', guidelineProfileId);
    
    const brandContext = (useBrandGuidelines && guidelineProfileId && styleMatchingMethod === 'continuous')
      ? await ragService.getBrandContextForPrompt(userId, guidelineProfileId, `Subtopics for: ${chosenConcept.title}`, { matchStyle })
      : '';

    let targetAudienceContext = '';
    if (useBrandGuidelines && guidelineProfileId) {
      const guidelineProfile = await storage.getGuidelineProfile(guidelineProfileId, userId);
      if (guidelineProfile) {
        targetAudienceContext = formatSelectedTargetAudiences(guidelineProfile.content, selectedTargetAudiences);
      }
    } else {
      targetAudienceContext = formatSelectedTargetAudiences('', selectedTargetAudiences);
    }

    const languageInstruction = language ? getLanguageInstruction(language) : getLanguageInstruction('en-US');
    
    const toolPath = path.join(__dirname, '..');
    const subtopicPrompt = await loadPrompt(toolPath, 'subtopic-generation', {
      conceptTitle: chosenConcept.title,
      conceptSummary: chosenConcept.summary,
      objective: objective || 'Inform and engage readers',
      targetLength: targetLength || 1000,
      toneOfVoice: toneOfVoice || '',
      languageInstruction,
      internalLinks: internalLinks && internalLinks.length > 0 ? internalLinks.join(', ') : '',
      targetAudienceContext,
      brandContext: brandContext || '',
      ragContext: ragContext || '',
      webArticleStyleInstructions: getWebArticleStyleInstructions(),
      antiFabricationInstructions: getAntiFabricationInstructions()
    });

    const completion = await loggedOpenAICall({
      userId,
      guidelineProfileId: guidelineProfileId || undefined,
      endpoint: 'content-writer-subtopics',
      metadata: { conceptTitle: chosenConcept.title, targetLength, objective }
    }, async () => {
      return await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: subtopicPrompt }],
        temperature: 0.7,
      });
    });

    const subtopicsText = completion.choices[0]?.message?.content || '[]';
    const subtopicsData = JSON.parse(stripMarkdownCodeBlocks(subtopicsText));

    const subtopics = subtopicsData.map((s: any, index: number) => ({
      id: nanoid(),
      title: s.title,
      summary: s.summary,
      rankOrder: index + 1,
      isSelected: false,
    }));

    return {
      subtopics,
      metadata: {
        ...state.metadata,
        currentStep: 'subtopics',
      },
      status: 'processing',
    };
  } catch (error) {
    console.error("Error in generateSubtopics:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      errors: [
        ...state.errors,
        {
          step: 'generateSubtopics',
          message: errorMessage,
          timestamp: new Date().toISOString(),
        },
      ],
      status: 'failed',
    };
  }
}
