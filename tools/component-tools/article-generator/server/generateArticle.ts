import { openai } from "../../../../../server/utils/openai-client";
import type { ContentWriterState } from "../../../../headline-tools/content-writer-v2/server/langgraph/types";
import { loggedOpenAICall } from "../../../../../server/utils/ai-logger";
import { ragService } from "../../../../../server/utils/rag-service";
import { storage } from "../../../../../server/storage";
import { formatSelectedTargetAudiences } from "../../../../../server/utils/format-guidelines";
import { getLanguageInstruction, getWebArticleStyleInstructions, getAntiFabricationInstructions } from "../../../../../server/utils/language-helpers";
import { loadPrompt } from "../../../shared/prompt-loader";
import path from "path";

export async function generateArticle(state: ContentWriterState): Promise<Partial<ContentWriterState>> {
  try {
    const {
      userId,
      guidelineProfileId,
      selectedConceptId,
      concepts,
      subtopics,
      selectedSubtopicIds,
      objective,
      targetLength,
      toneOfVoice,
      language,
      useBrandGuidelines,
      selectedTargetAudiences,
      styleMatchingMethod = 'continuous',
      matchStyle = false,
    } = state;

    if (!selectedConceptId) {
      throw new Error("No concept selected for article generation");
    }

    if (!selectedSubtopicIds || selectedSubtopicIds.length === 0) {
      throw new Error("No subtopics selected for article generation");
    }

    const chosenConcept = concepts.find(c => c.id === selectedConceptId);
    if (!chosenConcept) {
      throw new Error("Selected concept not found");
    }

    const selectedSubtopics = subtopics.filter(s => 
      s.id && selectedSubtopicIds.includes(s.id)
    );

    if (selectedSubtopics.length === 0) {
      throw new Error("Selected subtopics not found in state");
    }

    const brandContext = (useBrandGuidelines && guidelineProfileId && styleMatchingMethod === 'continuous')
      ? await ragService.getBrandContextForPrompt(userId, guidelineProfileId, `Article for: ${chosenConcept.title}`, { matchStyle })
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

    const toolPath = path.join(__dirname, '..');
    const mainBriefPrompt = await loadPrompt(toolPath, '../outline-builder/main-brief', {
      conceptTitle: chosenConcept.title,
      conceptSummary: chosenConcept.summary,
      objective,
      targetLength,
      targetAudienceContext,
      brandContext: brandContext || ''
    });

    const briefCompletion = await loggedOpenAICall({
      userId,
      guidelineProfileId: guidelineProfileId || undefined,
      endpoint: 'content-writer-main-brief',
      metadata: { conceptTitle: chosenConcept.title }
    }, async () => {
      return await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: mainBriefPrompt }],
        temperature: 0.5,
      });
    });

    const mainBrief = briefCompletion.choices[0]?.message?.content || '';

    const subtopicBriefs = [];
    for (const subtopic of selectedSubtopics) {
      const subtopicBriefPrompt = await loadPrompt(outlineToolPath, 'subtopic-brief', {
        subtopicTitle: subtopic.title,
        subtopicSummary: subtopic.summary,
        conceptTitle: chosenConcept.title
      });

      const subtopicBriefCompletion = await loggedOpenAICall({
        userId,
        guidelineProfileId: guidelineProfileId || undefined,
        endpoint: 'content-writer-subtopic-brief',
        metadata: { subtopicTitle: subtopic.title }
      }, async () => {
        return await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: subtopicBriefPrompt }],
          temperature: 0.5,
        });
      });

      subtopicBriefs.push({
        subtopicId: subtopic.id!,
        brief: subtopicBriefCompletion.choices[0]?.message?.content || ''
      });
    }

    const subtopicContents = [];
    const languageInstruction = language ? getLanguageInstruction(language) : getLanguageInstruction('en-US');
    
    for (const subtopic of selectedSubtopics) {
      const brief = subtopicBriefs.find(b => b.subtopicId === subtopic.id)?.brief || '';
      const contentPrompt = await loadPrompt(toolPath, 'subtopic-content', {
        subtopicTitle: subtopic.title,
        brief,
        targetAudienceContext,
        brandContext: brandContext || '',
        toneOfVoice: toneOfVoice || '',
        languageInstruction,
        webArticleStyleInstructions: getWebArticleStyleInstructions(),
        antiFabricationInstructions: getAntiFabricationInstructions(),
        targetWordCount: Math.floor((targetLength || 1000) / selectedSubtopics.length)
      });

      const contentCompletion = await loggedOpenAICall({
        userId,
        guidelineProfileId: guidelineProfileId || undefined,
        endpoint: 'content-writer-subtopic-content',
        metadata: { subtopicTitle: subtopic.title }
      }, async () => {
        return await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: contentPrompt }],
          temperature: 0.7,
        });
      });

      subtopicContents.push({
        subtopicId: subtopic.id!,
        content: contentCompletion.choices[0]?.message?.content || ''
      });
    }

    const topTailPrompt = await loadPrompt(articleToolPath, 'intro-conclusion', {
      conceptTitle: chosenConcept.title,
      mainBrief,
      targetAudienceContext,
      brandContext: brandContext || '',
      languageInstruction,
      webArticleStyleInstructions: getWebArticleStyleInstructions(),
      antiFabricationInstructions: getAntiFabricationInstructions()
    });

    const topTailCompletion = await loggedOpenAICall({
      userId,
      guidelineProfileId: guidelineProfileId || undefined,
      endpoint: 'content-writer-intro-conclusion',
      metadata: { conceptTitle: chosenConcept.title }
    }, async () => {
      return await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: topTailPrompt }],
        temperature: 0.7,
      });
    });

    const topAndTail = topTailCompletion.choices[0]?.message?.content || '';

    const introduction = topAndTail.split('Conclusion')[0] || topAndTail;
    const conclusion = topAndTail.split('Conclusion')[1] || '';

    let fullArticle = `# ${chosenConcept.title}\n\n${introduction}\n\n`;
    
    for (const subtopic of selectedSubtopics) {
      const content = subtopicContents.find(sc => sc.subtopicId === subtopic.id)?.content || '';
      fullArticle += `## ${subtopic.title}\n\n${content}\n\n`;
    }
    
    fullArticle += `## Conclusion\n\n${conclusion}`;

    const wordCount = fullArticle.split(/\s+/).length;

    return {
      articleDraft: {
        mainBrief,
        subtopicBriefs,
        subtopicContents,
        topAndTail,
        finalArticle: fullArticle,
        metadata: {
          wordCount,
          generatedAt: new Date().toISOString(),
        },
      },
      metadata: {
        ...state.metadata,
        currentStep: 'article',
        completedAt: new Date().toISOString(),
      },
      status: 'completed',
    };
  } catch (error) {
    console.error("Error in generateArticle:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      errors: [
        ...state.errors,
        {
          step: 'generateArticle',
          message: errorMessage,
          timestamp: new Date().toISOString(),
        },
      ],
      status: 'failed',
    };
  }
}
