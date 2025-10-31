import type { QCState } from "../types";

/**
 * Calculate Overall Score Node - Computes final QC score and marks completion
 */
export async function calculateOverallScore(state: QCState): Promise<Partial<QCState>> {
  const reports = [
    state.proofreaderReport,
    state.brandGuardianReport,
    state.factCheckerReport,
    state.regulatoryReport,
  ].filter(Boolean);
  
  if (reports.length === 0) {
    return {
      overallScore: 100,
      metadata: {
        ...state.metadata,
        completedAt: new Date().toISOString(),
        totalExecutionTimeMs: state.metadata.startedAt 
          ? Date.now() - new Date(state.metadata.startedAt).getTime()
          : 0,
      },
    };
  }
  
  // Calculate weighted average score
  // Regulatory and Brand get higher weight if they ran
  const weights: Record<string, number> = {
    regulatory: 2.0,
    brand_guardian: 1.5,
    fact_checker: 1.0,
    proofreader: 1.0,
  };
  
  let totalScore = 0;
  let totalWeight = 0;
  
  for (const report of reports) {
    if (report) {
      const weight = weights[report.agentType] || 1.0;
      totalScore += report.score * weight;
      totalWeight += weight;
    }
  }
  
  const overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 100;
  
  // Aggregate execution times
  const totalExecutionTimeMs = reports.reduce((sum, r) => sum + (r?.executionTimeMs || 0), 0);
  
  // Count total issues and suggestions
  const totalIssues = reports.reduce((sum, r) => sum + (r?.issues.length || 0), 0);
  const totalSuggestions = reports.reduce((sum, r) => sum + (r?.suggestions.length || 0), 0);
  
  return {
    overallScore,
    metadata: {
      ...state.metadata,
      completedAt: new Date().toISOString(),
      totalExecutionTimeMs,
      agentExecutionTimes: reports.reduce((acc, r) => {
        if (r) {
          acc[r.agentType] = r.executionTimeMs;
        }
        return acc;
      }, {} as Record<string, number>),
      totalIssues,
      totalSuggestions,
      agentScores: reports.reduce((acc, r) => {
        if (r) {
          acc[r.agentType] = r.score;
        }
        return acc;
      }, {} as Record<string, number>),
    },
  };
}
