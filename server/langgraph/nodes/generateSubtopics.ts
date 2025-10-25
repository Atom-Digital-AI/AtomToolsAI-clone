import OpenAI from "openai";
import { nanoid } from "nanoid";
import { ContentWriterState } from "../types";
import { loggedOpenAICall } from "../../utils/ai-logger";
import { ragService } from "../../utils/rag-service";
import { storage } from "../../storage";
import { formatSelectedTargetAudiences } from "../../utils/format-guidelines";
import { getLanguageInstruction, getWebArticleStyleInstructions, getAntiFabricationInstructions } from "../../utils/language-helpers";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    
    const subtopicPrompt = `Generate 10 subtopic ideas for an article about: "${chosenConcept.title}"

Concept Summary: ${chosenConcept.summary}

Article Objectives: ${objective || 'Inform and engage readers'}
Target Length: ${targetLength || 1000} words
${toneOfVoice ? `Tone of Voice: ${toneOfVoice}` : ''}
${languageInstruction}
${internalLinks && internalLinks.length > 0 ? `Internal Links to Include: ${internalLinks.join(', ')}` : ''}
${targetAudienceContext}

${brandContext}
${ragContext}

${getWebArticleStyleInstructions()}

${getAntiFabricationInstructions()}

Provide 10 diverse subtopics that:
1. Cover the main topic comprehensively
2. Flow logically when combined
3. Are specific and actionable
4. Align with the article objectives

Return the response as a JSON array with this exact structure:
[
  {
    "title": "Subtopic Title",
    "summary": "What this subtopic will cover..."
  }
]`;

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
