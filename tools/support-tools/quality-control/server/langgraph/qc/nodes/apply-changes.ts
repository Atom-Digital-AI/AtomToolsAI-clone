import type { QCState } from "../types";
import type { QCChange } from "@shared/schema";

/**
 * Apply Changes Node - Applies resolved changes to the content
 */
export async function applyChanges(state: QCState): Promise<Partial<QCState>> {
  let processedContent = state.content;
  const resolvedChanges = state.resolvedChanges || [];
  
  if (resolvedChanges.length === 0) {
    return {
      processedContent: state.content,
    };
  }
  
  // Sort changes by location (reverse order to maintain indices)
  const sortedChanges = [...resolvedChanges].sort(
    (a, b) => (b.location?.start || 0) - (a.location?.start || 0)
  );
  
  // Track applied changes
  const appliedChanges: QCChange[] = [];
  
  // Apply changes that meet auto-apply threshold
  for (const change of sortedChanges) {
    // Only apply if confidence meets threshold and has location
    if (change.confidence >= state.autoApplyThreshold && change.location) {
      const { start, end } = change.location;
      
      // Apply the change
      processedContent =
        processedContent.slice(0, start) +
        change.suggested +
        processedContent.slice(end);
      
      // Mark as applied
      appliedChanges.push({
        ...change,
        appliedAt: new Date().toISOString(),
      });
    }
  }
  
  return {
    processedContent,
    metadata: {
      ...state.metadata,
      appliedChangesCount: appliedChanges.length,
      totalChangesConsidered: resolvedChanges.length,
      autoApplyThreshold: state.autoApplyThreshold,
    },
  };
}
