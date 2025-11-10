import { nanoid } from "nanoid";
import type { QCState } from "../types";
import type { QCConflict, QCChange, QCSeverity } from "@shared/schema";

/**
 * Detect Conflicts Node - Identifies overlapping suggestions from different agents
 */
export async function detectConflicts(state: QCState): Promise<Partial<QCState>> {
  const conflicts: QCConflict[] = [];
  const suggestions = state.allSuggestions || [];
  
  if (suggestions.length === 0) {
    return { conflicts: [] };
  }
  
  // Group suggestions by location overlap
  const locationGroups = new Map<string, QCChange[]>();
  
  for (const suggestion of suggestions) {
    if (!suggestion.location) continue;
    
    // Find overlapping suggestions
    let foundGroup = false;
    
    for (const [groupKey, group] of locationGroups.entries()) {
      const [start, end] = groupKey.split('-').map(Number);
      
      // Check if locations overlap
      if (
        (suggestion.location.start >= start && suggestion.location.start <= end) ||
        (suggestion.location.end >= start && suggestion.location.end <= end) ||
        (suggestion.location.start <= start && suggestion.location.end >= end)
      ) {
        group.push(suggestion);
        foundGroup = true;
        break;
      }
    }
    
    if (!foundGroup) {
      const key = `${suggestion.location.start}-${suggestion.location.end}`;
      locationGroups.set(key, [suggestion]);
    }
  }
  
  // Identify conflicts within groups
  for (const [location, group] of locationGroups.entries()) {
    if (group.length > 1) {
      // Check if suggestions are actually conflicting
      const uniqueSuggestions = new Set(group.map(s => s.suggested));
      
      if (uniqueSuggestions.size > 1) {
        // Real conflict - different agents want different changes
        const conflict: QCConflict = {
          id: nanoid(),
          type: determineConflictType(group),
          description: `${group.length} agents suggest different changes for the same text`,
          severity: getHighestSeverity(group),
          conflictingChanges: group,
        };
        
        conflicts.push(conflict);
      }
    }
  }
  
  return {
    conflicts,
    metadata: {
      ...state.metadata,
      conflictCount: conflicts.length,
      totalLocationGroups: locationGroups.size,
    },
  };
}

/**
 * Determine conflict type based on agents involved
 */
function determineConflictType(changes: QCChange[]): string {
  const agents = [...new Set(changes.map(c => c.agentType))].sort();
  return agents.join('_vs_');
}

/**
 * Get the highest severity from a group of changes
 */
function getHighestSeverity(changes: QCChange[]): QCSeverity {
  const severityOrder: QCSeverity[] = ['critical', 'high', 'medium', 'low'];
  
  for (const severity of severityOrder) {
    if (changes.some(c => c.severity === severity)) {
      return severity;
    }
  }
  
  return 'low';
}
