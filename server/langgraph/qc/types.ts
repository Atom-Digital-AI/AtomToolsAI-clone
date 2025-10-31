import { type QCAgentType, type QCSeverity, type QCIssue, type QCChange, type QCConflict } from "@shared/schema";

/**
 * QC Agent Report - Result from a single quality control agent
 */
export interface QCAgentReport {
  agentType: QCAgentType;
  score: number; // 0-100
  executionTimeMs: number;
  issues: QCIssue[];
  suggestions: QCChange[];
  metadata?: Record<string, any>;
}

/**
 * QC State - Complete state for quality control subgraph
 */
export interface QCState {
  // Input
  content: string;
  contentType: 'html' | 'markdown' | 'plaintext';
  userId: string;
  guidelineProfileId?: string;
  regulatoryRulesetIds?: string[]; // Override which regulatory guidelines to use
  
  // Configuration
  enabledAgents: QCAgentType[];
  autoApplyThreshold: number;
  
  // Agent results (populated by each agent node)
  proofreaderReport?: QCAgentReport;
  brandGuardianReport?: QCAgentReport;
  factCheckerReport?: QCAgentReport;
  regulatoryReport?: QCAgentReport;
  
  // Aggregated results
  allSuggestions: QCChange[];
  conflicts: QCConflict[];
  resolvedChanges: QCChange[];
  unresolvedConflicts: QCConflict[];
  
  // Output
  processedContent?: string;
  overallScore: number;
  requiresHumanReview: boolean;
  
  // Metadata
  metadata: {
    startedAt?: string;
    completedAt?: string;
    totalExecutionTimeMs?: number;
    [key: string]: any;
  };
  
  errors: Array<{
    agent: string;
    message: string;
    timestamp: string;
  }>;
}

/**
 * Helper type for conflict resolution
 */
export interface ConflictResolutionResult {
  resolved: boolean;
  selectedChange?: QCChange;
  reason?: string;
}

/**
 * QC Execution Config
 */
export interface QCExecutionConfig {
  userId: string;
  sessionId?: string;
  threadId?: string;
}
