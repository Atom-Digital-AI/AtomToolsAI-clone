import {
  StateGraph,
  Annotation,
  END,
  Checkpoint,
  CheckpointMetadata,
} from "@langchain/langgraph";
import { PostgresCheckpointer } from "./postgres-checkpointer";
import { ContentWriterState, contentWriterStateSchema } from "./types";
import { generateConcepts } from "./nodes/generateConcepts";
import { setAwaitConceptApproval } from "./nodes/setAwaitConceptApproval";
import { awaitConceptApproval } from "./nodes/awaitConceptApproval";
import { generateSubtopics } from "./nodes/generateSubtopics";
import { setAwaitSubtopicApproval } from "./nodes/setAwaitSubtopicApproval";
import { awaitSubtopicApproval } from "./nodes/awaitSubtopicApproval";
import { generateArticle } from "./nodes/generateArticle";
import { checkBrandMatch } from "./nodes/checkBrandMatch";
import { verifyFacts } from "./nodes/verifyFacts";
import { shouldRegenerate } from "./nodes/shouldRegenerate";
import { nanoid } from "nanoid";
import { executeQCSubgraph, getQCConfig } from "./qc/qc-subgraph";

const ContentWriterAnnotation = Annotation.Root({
  topic: Annotation<string>(),
  guidelineProfileId: Annotation<string | undefined>(),
  userId: Annotation<string>(),
  sessionId: Annotation<string | undefined>(),
  threadId: Annotation<string | undefined>(),

  concepts: Annotation<ContentWriterState["concepts"]>({
    reducer: (existing, update) => update ?? existing ?? [],
  }),
  selectedConceptId: Annotation<string | undefined>(),

  subtopics: Annotation<ContentWriterState["subtopics"]>({
    reducer: (existing, update) => update ?? existing ?? [],
  }),
  selectedSubtopicIds: Annotation<string[]>({
    reducer: (existing, update) => update ?? existing ?? [],
  }),

  articleDraft: Annotation<ContentWriterState["articleDraft"] | undefined>(),

  objective: Annotation<string | undefined>(),
  targetLength: Annotation<number | undefined>(),
  toneOfVoice: Annotation<string | undefined>(),
  language: Annotation<string | undefined>(),
  internalLinks: Annotation<string[] | undefined>(),
  useBrandGuidelines: Annotation<boolean | undefined>(),
  selectedTargetAudiences: Annotation<
    "all" | "none" | number[] | null | undefined
  >(),
  styleMatchingMethod: Annotation<"continuous" | "end-rewrite" | undefined>(),
  matchStyle: Annotation<boolean | undefined>(),

  brandScore: Annotation<number | undefined>(),
  factScore: Annotation<number | undefined>(),

  errors: Annotation<ContentWriterState["errors"]>({
    reducer: (existing, update) => [...(existing ?? []), ...(update ?? [])],
  }),

  metadata: Annotation<ContentWriterState["metadata"]>({
    reducer: (existing, update) => ({ ...(existing ?? {}), ...(update ?? {}) }),
  }),

  status: Annotation<
    "pending" | "processing" | "completed" | "failed" | undefined
  >(),
});

// Cache the workflow definition to avoid recreating it on every execution
// The workflow structure is stateless and can be reused
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedWorkflow: any = null;

function createContentWriterGraph() {
  if (cachedWorkflow) {
    return cachedWorkflow;
  }

  const workflow = new StateGraph(ContentWriterAnnotation);

  workflow.addNode("generateConcepts", generateConcepts as any);
  workflow.addNode("setAwaitConceptApproval", setAwaitConceptApproval as any);
  workflow.addNode("awaitConceptApproval", awaitConceptApproval as any);
  workflow.addNode("generateSubtopics", generateSubtopics as any);
  workflow.addNode("setAwaitSubtopicApproval", setAwaitSubtopicApproval as any);
  workflow.addNode("awaitSubtopicApproval", awaitSubtopicApproval as any);
  workflow.addNode("generateArticle", generateArticle as any);
  workflow.addNode("qualityControl", async (state: ContentWriterState) => {
    // Run QC if article was generated and QC is enabled
    if (!state.articleDraft?.finalArticle) {
      return {
        metadata: {
          ...state.metadata,
          qcEnabled: false,
        },
      };
    }

    // Get user's QC configuration
    const qcConfig = await getQCConfig(
      state.userId,
      state.guidelineProfileId,
      "content-writer"
    );

    if (!qcConfig.enabled || qcConfig.enabledAgents.length === 0) {
      return {
        metadata: {
          ...state.metadata,
          qcEnabled: false,
          currentStep: "article",
        },
      };
    }

    try {
      // Execute QC subgraph
      const qcResult = await executeQCSubgraph(
        {
          content: state.articleDraft.finalArticle,
          contentType: "markdown",
          userId: state.userId,
          guidelineProfileId: state.guidelineProfileId,
          enabledAgents: qcConfig.enabledAgents as any[],
          autoApplyThreshold: qcConfig.autoApplyThreshold,
        },
        {
          userId: state.userId,
          threadId: state.threadId,
        }
      );

      // Update article with QC changes (if any were applied)
      const updatedArticle =
        qcResult.processedContent || state.articleDraft.finalArticle;
      const hasChanges = updatedArticle !== state.articleDraft.finalArticle;

      return {
        articleDraft: {
          ...state.articleDraft,
          finalArticle: updatedArticle,
          metadata: {
            ...state.articleDraft.metadata,
            qcOverallScore: qcResult.overallScore,
            qcRequiresReview: qcResult.requiresHumanReview,
          },
        },
        metadata: {
          ...state.metadata,
          currentStep: "qc",
          qcEnabled: true,
          qcReports: {
            proofreader: qcResult.proofreaderReport,
            brandGuardian: qcResult.brandGuardianReport,
            factChecker: qcResult.factCheckerReport,
            regulatory: qcResult.regulatoryReport,
          },
          qcConflicts: qcResult.unresolvedConflicts,
          qcChangesApplied: hasChanges,
          qcOverallScore: qcResult.overallScore,
        },
      };
    } catch (error) {
      console.error("Error running QC:", error);
      return {
        errors: [
          ...state.errors,
          {
            step: "qualityControl",
            message: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          },
        ],
        metadata: {
          ...state.metadata,
          qcEnabled: true,
          qcError: true,
        },
      };
    }
  });
  workflow.addNode("checkBrandMatch", checkBrandMatch as any);
  workflow.addNode("verifyFacts", verifyFacts as any);
  workflow.addNode("qualityDecision", async (state: ContentWriterState) => {
    const decision = shouldRegenerate(state);

    if (decision === "regenerate") {
      const currentCount = state.metadata?.regenerationCount ?? 0;
      return {
        metadata: {
          ...state.metadata,
          qualityDecision: decision,
          regenerationCount: currentCount + 1,
        },
      };
    } else if (decision === "human_review") {
      return {
        metadata: {
          ...state.metadata,
          qualityDecision: decision,
          humanApprovalPending: true,
        },
      };
    }

    return {
      metadata: {
        ...state.metadata,
        qualityDecision: decision,
      },
    };
  });

  (workflow as any).setEntryPoint("generateConcepts");

  (workflow as any).addEdge("generateConcepts", "setAwaitConceptApproval");
  (workflow as any).addEdge("setAwaitConceptApproval", "awaitConceptApproval");

  // Conditional edge: only proceed if valid concept is selected
  (workflow as any).addConditionalEdges(
    "awaitConceptApproval",
    (state: ContentWriterState) => {
      const { selectedConceptId, concepts } = state;

      // If no concept selected or concept doesn't exist in current list, loop back
      if (
        !selectedConceptId ||
        !concepts.find((c) => c.id === selectedConceptId)
      ) {
        return "waiting";
      }

      return "proceed";
    },
    {
      waiting: "awaitConceptApproval", // Loop back to wait for valid selection
      proceed: "generateSubtopics",
    }
  );

  (workflow as any).addEdge("generateSubtopics", "setAwaitSubtopicApproval");
  (workflow as any).addEdge(
    "setAwaitSubtopicApproval",
    "awaitSubtopicApproval"
  );

  // Conditional edge: only proceed if valid subtopics are selected
  (workflow as any).addConditionalEdges(
    "awaitSubtopicApproval",
    (state: ContentWriterState) => {
      const { selectedSubtopicIds, subtopics } = state;

      // If no subtopics selected or any are invalid, loop back
      if (!selectedSubtopicIds || selectedSubtopicIds.length === 0) {
        return "waiting";
      }

      const invalidSubtopics = selectedSubtopicIds.filter(
        (id) => !subtopics.find((s) => s.id === id)
      );

      if (invalidSubtopics.length > 0) {
        return "waiting";
      }

      return "proceed";
    },
    {
      waiting: "awaitSubtopicApproval", // Loop back to wait for valid selection
      proceed: "generateArticle",
    }
  );
  (workflow as any).addEdge("generateArticle", "qualityControl");
  (workflow as any).addEdge("qualityControl", "checkBrandMatch");
  (workflow as any).addEdge("checkBrandMatch", "verifyFacts");
  (workflow as any).addEdge("verifyFacts", "qualityDecision");

  (workflow as any).addConditionalEdges(
    "qualityDecision",
    (state: ContentWriterState) => {
      return state.metadata?.qualityDecision || "complete";
    },
    {
      regenerate: "generateArticle",
      human_review: END,
      complete: END,
    }
  );

  // Cache the workflow for reuse
  cachedWorkflow = workflow;
  return workflow;
}

export async function executeContentWriterGraph(
  initialState: Partial<ContentWriterState>,
  config: {
    userId: string;
    sessionId?: string;
    threadId?: string;
  }
): Promise<{ threadId: string; state: ContentWriterState }> {
  try {
    const threadId = config.threadId || nanoid();

    const checkpointer = new PostgresCheckpointer({
      userId: config.userId,
      sessionId: config.sessionId,
    });

    // OPTIMIZATION: Workflow is cached, only compiled graph is created per-user
    // The compiled graph instance will be garbage collected after this function completes
    const workflow = createContentWriterGraph();
    const graph = workflow.compile({ checkpointer });

    const fullInitialState: ContentWriterState = {
      topic: initialState.topic || "",
      userId: config.userId,
      sessionId: config.sessionId,
      threadId,
      guidelineProfileId: initialState.guidelineProfileId,
      concepts: initialState.concepts || [],
      selectedConceptId: initialState.selectedConceptId,
      subtopics: initialState.subtopics || [],
      selectedSubtopicIds: initialState.selectedSubtopicIds || [],
      articleDraft: initialState.articleDraft,
      objective: initialState.objective,
      targetLength: initialState.targetLength,
      toneOfVoice: initialState.toneOfVoice,
      language: initialState.language,
      internalLinks: initialState.internalLinks,
      useBrandGuidelines: initialState.useBrandGuidelines,
      selectedTargetAudiences: initialState.selectedTargetAudiences,
      styleMatchingMethod: initialState.styleMatchingMethod || "continuous",
      matchStyle: initialState.matchStyle,
      brandScore: initialState.brandScore,
      factScore: initialState.factScore,
      errors: initialState.errors || [],
      metadata: {
        ...initialState.metadata,
        startedAt: initialState.metadata?.startedAt || new Date().toISOString(),
      },
      status: initialState.status || "pending",
    };

    const result = await graph.invoke(fullInitialState as any, {
      configurable: {
        thread_id: threadId,
      },
    });

    return {
      threadId,
      state: result as unknown as ContentWriterState,
    };
  } catch (error) {
    console.error("Error executing content writer graph:", error);
    throw error;
  }
}

export async function resumeContentWriterGraph(
  threadId: string,
  config: {
    userId: string;
    sessionId?: string;
  },
  updates?: Partial<ContentWriterState>
): Promise<{ threadId: string; state: ContentWriterState }> {
  try {
    const checkpointer = new PostgresCheckpointer({
      userId: config.userId,
      sessionId: config.sessionId,
    });

    // OPTIMIZATION: Workflow is cached, only compiled graph is created per-user
    // The compiled graph instance will be garbage collected after this function completes
    const workflow = createContentWriterGraph();
    const graph = workflow.compile({ checkpointer });

    const checkpoint = await checkpointer.getTuple({
      configurable: {
        thread_id: threadId,
      },
    });

    if (!checkpoint) {
      throw new Error(`No checkpoint found for thread ${threadId}`);
    }

    const currentState = checkpoint.checkpoint
      .channel_values as unknown as ContentWriterState;

    const updatedState = updates
      ? { ...currentState, ...updates }
      : currentState;

    const result = await graph.invoke(updatedState as any, {
      configurable: {
        thread_id: threadId,
      },
    });

    return {
      threadId,
      state: result as unknown as ContentWriterState,
    };
  } catch (error) {
    console.error("Error resuming content writer graph:", error);
    throw error;
  }
}

export async function getGraphState(
  threadId: string,
  config: {
    userId: string;
    sessionId?: string;
  }
): Promise<ContentWriterState | null> {
  try {
    // OPTIMIZATION: Use checkpointer directly without creating a graph instance
    // This function only reads state, doesn't need to invoke the graph
    const checkpointer = new PostgresCheckpointer({
      userId: config.userId,
      sessionId: config.sessionId,
    });

    const checkpoint = await checkpointer.getTuple({
      configurable: {
        thread_id: threadId,
      },
    });

    if (!checkpoint) {
      return null;
    }

    return checkpoint.checkpoint
      .channel_values as unknown as ContentWriterState;
  } catch (error) {
    console.error("Error getting graph state:", error);
    return null;
  }
}

export async function updateGraphState(
  threadId: string,
  config: {
    userId: string;
    sessionId?: string;
  },
  updates: Partial<ContentWriterState>
): Promise<{ threadId: string; state: ContentWriterState }> {
  try {
    // OPTIMIZATION: Use checkpointer directly without creating a graph instance
    // This function only updates state, doesn't need to invoke the graph
    const checkpointer = new PostgresCheckpointer({
      userId: config.userId,
      sessionId: config.sessionId,
    });

    // Get current checkpoint
    const checkpointTuple = await checkpointer.getTuple({
      configurable: {
        thread_id: threadId,
      },
    });

    if (!checkpointTuple) {
      throw new Error(`No checkpoint found for thread ${threadId}`);
    }

    const currentState = checkpointTuple.checkpoint
      .channel_values as unknown as ContentWriterState;

    // Merge updates with current state
    const updatedState = { ...currentState, ...updates };

    // Create new checkpoint with updated state
    const newCheckpoint: Checkpoint = {
      ...checkpointTuple.checkpoint,
      channel_values: updatedState as any,
    };

    // Create metadata for the update
    const metadata: CheckpointMetadata = {
      ...checkpointTuple.metadata,
      source: "update",
      step: -1, // Indicate this is a manual update, not a graph step
      parents: checkpointTuple.metadata?.parents || {},
    };

    // Save the updated checkpoint
    // Use the current checkpoint's id as the parent for the new checkpoint
    const currentCheckpointId =
      checkpointTuple.config.configurable?.checkpoint_id;
    await checkpointer.put(
      {
        configurable: {
          thread_id: threadId,
          checkpoint_id: currentCheckpointId,
        },
      },
      newCheckpoint,
      metadata
    );

    return {
      threadId,
      state: updatedState,
    };
  } catch (error) {
    console.error("Error updating graph state:", error);
    throw error;
  }
}
