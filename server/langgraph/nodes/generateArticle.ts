import { openai } from "../../utils/openai-client";
import { ContentWriterState } from "../types";
import { loggedOpenAICall } from "../../utils/ai-logger";
import { ragService } from "../../utils/rag-service";
import { storage } from "../../storage";
import { formatSelectedTargetAudiences } from "../../utils/format-guidelines";
import { getLanguageInstruction, getWebArticleStyleInstructions, getAntiFabricationInstructions } from "../../utils/language-helpers";

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

    const mainBriefPrompt = `Create a detailed content brief for: "${chosenConcept.title}"

Summary: ${chosenConcept.summary}
Objective: ${objective}
Target Length: ${targetLength} words
${targetAudienceContext}

${brandContext}

Provide a comprehensive brief covering:
1. Main message and key takeaways
2. Target audience
3. Content structure
4. SEO considerations
5. Call to action`;

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
      const subtopicBriefPrompt = `Create a brief for this subtopic: "${subtopic.title}"
Summary: ${subtopic.summary}
This is part of the main article: "${chosenConcept.title}"

Provide guidance on key points to cover.`;

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
      const contentPrompt = `Write detailed content for: "${subtopic.title}"

Brief: ${brief}
${targetAudienceContext}

${brandContext}
${toneOfVoice ? `Tone: ${toneOfVoice}` : ''}
${languageInstruction}

${getWebArticleStyleInstructions()}

${getAntiFabricationInstructions()}

Write approximately ${Math.floor((targetLength || 1000) / selectedSubtopics.length)} words.`;

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

    const topTailPrompt = `Write an engaging introduction and conclusion for: "${chosenConcept.title}"

Main Brief: ${mainBrief}
${targetAudienceContext}

${brandContext}
${languageInstruction}

${getWebArticleStyleInstructions()}

${getAntiFabricationInstructions()}

Provide:
1. A compelling introduction (2-3 paragraphs)
2. A strong conclusion with call to action`;

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
