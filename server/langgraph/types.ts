import { z } from "zod";

export interface ArticleConcept {
  id?: string;
  title: string;
  summary: string;
  rankOrder: number;
  userAction?: string;
  feedbackId?: string;
}

export interface ArticleSubtopic {
  id?: string;
  title: string;
  summary: string;
  rankOrder: number;
  isSelected: boolean;
  userAction?: string;
  feedbackId?: string;
}

export interface ArticleDraft {
  mainBrief?: string;
  subtopicBriefs?: Array<{ subtopicId: string; brief: string }>;
  subtopicContents?: Array<{ subtopicId: string; content: string }>;
  topAndTail?: string;
  finalArticle?: string;
  metadata?: {
    wordCount?: number;
    generatedAt?: string;
    brandScore?: number;
    factScore?: number;
  };
}

export interface ContentWriterState {
  topic: string;
  guidelineProfileId?: string;
  userId: string;
  sessionId?: string;
  threadId?: string;
  
  concepts: ArticleConcept[];
  selectedConceptId?: string;
  
  subtopics: ArticleSubtopic[];
  selectedSubtopicIds: string[];
  
  articleDraft?: ArticleDraft;
  
  objective?: string;
  targetLength?: number;
  toneOfVoice?: string;
  language?: string;
  internalLinks?: string[];
  useBrandGuidelines?: boolean;
  selectedTargetAudiences?: "all" | "none" | number[] | null;
  styleMatchingMethod?: 'continuous' | 'end-rewrite';
  matchStyle?: boolean;
  
  brandScore?: number;
  factScore?: number;
  
  errors: Array<{
    step: string;
    message: string;
    timestamp: string;
  }>;
  
  metadata: {
    currentStep?: 'concepts' | 'awaitConceptApproval' | 'conceptApproved' | 'subtopics' | 'awaitSubtopicApproval' | 'subtopicsApproved' | 'article' | 'completed';
    regenerationCount?: number;
    qualityDecision?: 'regenerate' | 'human_review' | 'complete';
    humanApprovalPending?: boolean;
    brandIssues?: string[];
    factIssues?: string[];
    startedAt?: string;
    completedAt?: string;
    [key: string]: any;
  };
  
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}

export const articleConceptSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  summary: z.string(),
  rankOrder: z.number(),
  userAction: z.string().optional(),
  feedbackId: z.string().optional(),
});

export const articleSubtopicSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  summary: z.string(),
  rankOrder: z.number(),
  isSelected: z.boolean(),
  userAction: z.string().optional(),
  feedbackId: z.string().optional(),
});

export const articleDraftSchema = z.object({
  mainBrief: z.string().optional(),
  subtopicBriefs: z.array(z.object({
    subtopicId: z.string(),
    brief: z.string(),
  })).optional(),
  subtopicContents: z.array(z.object({
    subtopicId: z.string(),
    content: z.string(),
  })).optional(),
  topAndTail: z.string().optional(),
  finalArticle: z.string().optional(),
  metadata: z.object({
    wordCount: z.number().optional(),
    generatedAt: z.string().optional(),
    brandScore: z.number().optional(),
    factScore: z.number().optional(),
  }).optional(),
});

export const contentWriterStateSchema = z.object({
  topic: z.string(),
  guidelineProfileId: z.string().optional(),
  userId: z.string(),
  sessionId: z.string().optional(),
  threadId: z.string().optional(),
  
  concepts: z.array(articleConceptSchema),
  selectedConceptId: z.string().optional(),
  
  subtopics: z.array(articleSubtopicSchema),
  selectedSubtopicIds: z.array(z.string()),
  
  articleDraft: articleDraftSchema.optional(),
  
  objective: z.string().optional(),
  targetLength: z.number().optional(),
  toneOfVoice: z.string().optional(),
  language: z.string().optional(),
  internalLinks: z.array(z.string()).optional(),
  useBrandGuidelines: z.boolean().optional(),
  selectedTargetAudiences: z.union([
    z.literal("all"),
    z.literal("none"),
    z.array(z.number()),
    z.null(),
  ]).optional(),
  styleMatchingMethod: z.enum(['continuous', 'end-rewrite']).optional(),
  matchStyle: z.boolean().optional(),
  
  brandScore: z.number().optional(),
  factScore: z.number().optional(),
  
  errors: z.array(z.object({
    step: z.string(),
    message: z.string(),
    timestamp: z.string(),
  })),
  
  metadata: z.object({
    currentStep: z.enum(['concepts', 'awaitConceptApproval', 'conceptApproved', 'subtopics', 'awaitSubtopicApproval', 'subtopicsApproved', 'article', 'completed']).optional(),
    regenerationCount: z.number().optional(),
    qualityDecision: z.enum(['regenerate', 'human_review', 'complete']).optional(),
    humanApprovalPending: z.boolean().optional(),
    brandIssues: z.array(z.string()).optional(),
    factIssues: z.array(z.string()).optional(),
    startedAt: z.string().optional(),
    completedAt: z.string().optional(),
  }).catchall(z.any()),
  
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});

export type ValidatedContentWriterState = z.infer<typeof contentWriterStateSchema>;
