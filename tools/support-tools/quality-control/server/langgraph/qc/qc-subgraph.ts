import { StateGraph, Annotation, END } from "@langchain/langgraph";
import type { QCState, QCExecutionConfig } from "./types";
import { runProofreader } from "./agents/proofreader";
import { runBrandGuardian } from "./agents/brand-guardian";
import { runFactChecker } from "./agents/fact-checker";
import { runRegulatory } from "./agents/regulatory";
import { detectConflicts } from "./nodes/detect-conflicts";
import { resolveConflicts } from "./nodes/resolve-conflicts";
import { applyChanges } from "./nodes/apply-changes";
import { calculateOverallScore } from "./nodes/calculate-score";
import { storage } from "../../../../../../../server/storage";

/**
 * QC Annotation - Defines the state shape for the QC subgraph
 */
const QCAnnotation = Annotation.Root({
  // Input
  content: Annotation<string>(),
  contentType: Annotation<'html' | 'markdown' | 'plaintext'>(),
  userId: Annotation<string>(),
  guidelineProfileId: Annotation<string | undefined>(),
  regulatoryRulesetIds: Annotation<string[] | undefined>(),
  
  // Configuration
  enabledAgents: Annotation<string[]>(),
  autoApplyThreshold: Annotation<number>(),
  
  // Agent reports
  proofreaderReport: Annotation<any>(),
  brandGuardianReport: Annotation<any>(),
  factCheckerReport: Annotation<any>(),
  regulatoryReport: Annotation<any>(),
  
  // Aggregated results
  allSuggestions: Annotation<any[]>({
    reducer: (existing, update) => [...(existing || []), ...(update || [])],
  }),
  conflicts: Annotation<any[]>({
    reducer: (existing, update) => [...(existing || []), ...(update || [])],
  }),
  resolvedChanges: Annotation<any[]>(),
  unresolvedConflicts: Annotation<any[]>(),
  
  // Output
  processedContent: Annotation<string | undefined>(),
  overallScore: Annotation<number>(),
  requiresHumanReview: Annotation<boolean>(),
  
  // Metadata
  metadata: Annotation<any>({
    reducer: (existing, update) => ({ ...(existing || {}), ...(update || {}) }),
  }),
  
  errors: Annotation<any[]>({
    reducer: (existing, update) => [...(existing || []), ...(update || [])],
  }),
});

/**
 * Create the QC subgraph workflow
 */
function createQCSubgraph() {
  const workflow = new StateGraph(QCAnnotation);
  
  // Add agent nodes (sequential execution)
  workflow.addNode("proofreader", runProofreader as any);
  workflow.addNode("brandGuardian", runBrandGuardian as any);
  workflow.addNode("factChecker", runFactChecker as any);
  workflow.addNode("regulatory", runRegulatory as any);
  
  // Add processing nodes
  workflow.addNode("detectConflicts", detectConflicts as any);
  workflow.addNode("resolveConflicts", resolveConflicts as any);
  workflow.addNode("applyChanges", applyChanges as any);
  workflow.addNode("calculateScore", calculateOverallScore as any);
  
  // Sequential agent execution: Proofreader ? Brand Guardian ? Fact Checker ? Regulatory
  (workflow as any).setEntryPoint("proofreader");
  (workflow as any).addEdge("proofreader", "brandGuardian");
  (workflow as any).addEdge("brandGuardian", "factChecker");
  (workflow as any).addEdge("factChecker", "regulatory");
  
  // Processing pipeline
  (workflow as any).addEdge("regulatory", "detectConflicts");
  (workflow as any).addEdge("detectConflicts", "resolveConflicts");
  (workflow as any).addEdge("resolveConflicts", "applyChanges");
  (workflow as any).addEdge("applyChanges", "calculateScore");
  (workflow as any).addEdge("calculateScore", END);
  
  return workflow;
}

/**
 * Execute QC subgraph with given state
 */
export async function executeQCSubgraph(
  initialState: Partial<QCState>,
  config?: QCExecutionConfig
): Promise<QCState> {
  try {
    const workflow = createQCSubgraph();
    const graph = workflow.compile();
    
    // Build full initial state with defaults
    const fullState: QCState = {
      content: initialState.content || '',
      contentType: initialState.contentType || 'plaintext',
      userId: initialState.userId || '',
      guidelineProfileId: initialState.guidelineProfileId,
      regulatoryRulesetIds: initialState.regulatoryRulesetIds,
      
      enabledAgents: initialState.enabledAgents || ['proofreader', 'brand_guardian', 'fact_checker', 'regulatory'],
      autoApplyThreshold: initialState.autoApplyThreshold || 90,
      
      allSuggestions: [],
      conflicts: [],
      resolvedChanges: [],
      unresolvedConflicts: [],
      
      overallScore: 0,
      requiresHumanReview: false,
      
      metadata: {
        ...initialState.metadata,
        startedAt: new Date().toISOString(),
      },
      
      errors: [],
    };
    
    // Execute graph
    const result = await graph.invoke(fullState);
    
    // Save QC reports to database if we have a threadId or contentId
    if (config?.threadId && result.userId) {
      await saveQCReports(result as QCState, config.threadId);
    }
    
    return result as QCState;
  } catch (error) {
    console.error("Error executing QC subgraph:", error);
    throw error;
  }
}

/**
 * Save QC reports to database
 */
async function saveQCReports(state: QCState, threadId: string): Promise<void> {
  try {
    const reports = [
      state.proofreaderReport,
      state.brandGuardianReport,
      state.factCheckerReport,
      state.regulatoryReport,
    ];
    
    let executionOrder = 1;
    
    for (const report of reports) {
      if (report) {
        await storage.createQCReport({
          userId: state.userId,
          threadId,
          contentId: undefined,
          agentType: report.agentType,
          score: report.score,
          issues: report.issues,
          suggestions: report.suggestions,
          appliedChanges: [],
          executionOrder: executionOrder++,
          executionTimeMs: report.executionTimeMs,
          metadata: report.metadata,
        });
      }
    }
  } catch (error) {
    console.error("Error saving QC reports:", error);
    // Don't throw - this is non-critical
  }
}

/**
 * Get or create default QC configuration for a user
 */
export async function getQCConfig(
  userId: string,
  guidelineProfileId?: string,
  toolType?: string
): Promise<{ enabled: boolean; enabledAgents: string[]; autoApplyThreshold: number }> {
  try {
    // Try to get existing configuration
    let config = await storage.getQCConfiguration(userId, guidelineProfileId, toolType);
    
    // If no config, try tool-level config
    if (!config && toolType) {
      config = await storage.getQCConfiguration(userId, guidelineProfileId, undefined);
    }
    
    // If still no config, try global config
    if (!config) {
      config = await storage.getQCConfiguration(userId, undefined, undefined);
    }
    
    // Return config or defaults
    if (config) {
      return {
        enabled: config.enabled || false,
        enabledAgents: config.enabledAgents || [],
        autoApplyThreshold: config.autoApplyThreshold || 90,
      };
    }
    
    // Default configuration
    return {
      enabled: false, // Disabled by default
      enabledAgents: ['proofreader', 'brand_guardian', 'fact_checker', 'regulatory'],
      autoApplyThreshold: 90,
    };
  } catch (error) {
    console.error("Error getting QC config:", error);
    // Return safe defaults
    return {
      enabled: false,
      enabledAgents: [],
      autoApplyThreshold: 90,
    };
  }
}
