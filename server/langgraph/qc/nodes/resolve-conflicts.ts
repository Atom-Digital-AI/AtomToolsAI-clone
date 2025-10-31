import type { QCState, ConflictResolutionResult } from "../types";
import type { QCConflict, QCChange } from "@shared/schema";
import { storage } from "../../../storage";

/**
 * Resolve Conflicts Node - Attempts to automatically resolve conflicts using various strategies
 */
export async function resolveConflicts(state: QCState): Promise<Partial<QCState>> {
  const conflicts = state.conflicts || [];
  const resolved: QCChange[] = [];
  const unresolved: QCConflict[] = [];
  
  // Try to resolve each conflict
  for (const conflict of conflicts) {
    const resolution = await resolveConflict(conflict, state);
    
    if (resolution.resolved && resolution.selectedChange) {
      resolved.push(resolution.selectedChange);
    } else {
      unresolved.push(conflict);
    }
  }
  
  // Add non-conflicting suggestions to resolved
  const allSuggestions = state.allSuggestions || [];
  const conflictedChangeIds = new Set(
    conflicts.flatMap(c => c.conflictingChanges.map(ch => ch.id))
  );
  
  for (const suggestion of allSuggestions) {
    if (!conflictedChangeIds.has(suggestion.id)) {
      resolved.push(suggestion);
    }
  }
  
  return {
    resolvedChanges: resolved,
    unresolvedConflicts: unresolved,
    requiresHumanReview: unresolved.length > 0,
    metadata: {
      ...state.metadata,
      resolvedConflicts: conflicts.length - unresolved.length,
      unresolvedConflicts: unresolved.length,
      totalResolvedChanges: resolved.length,
    },
  };
}

/**
 * Attempt to resolve a single conflict using multiple strategies
 */
async function resolveConflict(
  conflict: QCConflict,
  state: QCState
): Promise<ConflictResolutionResult> {
  
  // Strategy 1: Check user's saved preferences
  const userDecision = await checkUserDecisions(conflict, state.userId, state.guidelineProfileId);
  if (userDecision) {
    return { resolved: true, selectedChange: userDecision, reason: 'user_preference' };
  }
  
  // Strategy 2: Priority-based resolution for specific conflict types
  const priorityResolution = resolveBySeverityAndPriority(conflict);
  if (priorityResolution) {
    return { resolved: true, selectedChange: priorityResolution, reason: 'priority_based' };
  }
  
  // Strategy 3: Auto-resolve if one change has significantly higher confidence
  const confidenceResolution = resolveByConfidence(conflict, state.autoApplyThreshold);
  if (confidenceResolution) {
    return { resolved: true, selectedChange: confidenceResolution, reason: 'high_confidence' };
  }
  
  // Unable to auto-resolve - requires human review
  return { resolved: false };
}

/**
 * Check if user has a saved decision for this type of conflict
 */
async function checkUserDecisions(
  conflict: QCConflict,
  userId: string,
  guidelineProfileId?: string
): Promise<QCChange | null> {
  try {
    // Query for matching user decisions
    const decisions = await storage.getQCUserDecisions(userId, guidelineProfileId, {
      conflictType: conflict.type,
      applyToFuture: true,
    });
    
    if (decisions.length === 0) {
      return null;
    }
    
    // Use the most frequently applied decision
    const decision = decisions[0];
    
    // Determine which agent was preferred
    const preferredAgentType = decision.selectedOption === 1
      ? decision.option1.agentType
      : decision.option2.agentType;
    
    // Find matching change from current conflict
    const matchingChange = conflict.conflictingChanges.find(
      c => c.agentType === preferredAgentType
    );
    
    if (matchingChange) {
      // Update usage count
      await storage.incrementQCDecisionUsage(decision.id);
      return matchingChange;
    }
  } catch (error) {
    console.error("Error checking user decisions:", error);
  }
  
  return null;
}

/**
 * Resolve conflict based on severity and agent priority
 * Priority: Regulatory (critical) > Brand (critical) > Any critical > High severity
 */
function resolveBySeverityAndPriority(conflict: QCConflict): QCChange | null {
  const changes = conflict.conflictingChanges;
  
  // 1. CRITICAL regulatory violations always win
  const criticalRegulatory = changes.find(
    c => c.agentType === 'regulatory' && c.severity === 'critical'
  );
  if (criticalRegulatory) return criticalRegulatory;
  
  // 2. CRITICAL brand violations
  const criticalBrand = changes.find(
    c => c.agentType === 'brand_guardian' && c.severity === 'critical'
  );
  if (criticalBrand) return criticalBrand;
  
  // 3. Any CRITICAL issue
  const anyCritical = changes.find(c => c.severity === 'critical');
  if (anyCritical) return anyCritical;
  
  // 4. HIGH severity regulatory
  const highRegulatory = changes.find(
    c => c.agentType === 'regulatory' && c.severity === 'high'
  );
  if (highRegulatory) return highRegulatory;
  
  // 5. HIGH severity brand
  const highBrand = changes.find(
    c => c.agentType === 'brand_guardian' && c.severity === 'high'
  );
  if (highBrand) return highBrand;
  
  // 6. Any HIGH severity
  const anyHigh = changes.find(c => c.severity === 'high');
  if (anyHigh) return anyHigh;
  
  // Cannot resolve based on priority alone
  return null;
}

/**
 * Resolve by confidence if one change is significantly more confident
 */
function resolveByConfidence(conflict: QCConflict, threshold: number): QCChange | null {
  const changes = conflict.conflictingChanges;
  const highConfidence = changes.filter(c => c.confidence >= threshold);
  
  // Only auto-resolve if exactly one change meets the threshold
  if (highConfidence.length === 1) {
    return highConfidence[0];
  }
  
  // If multiple have high confidence, can't auto-resolve
  return null;
}
