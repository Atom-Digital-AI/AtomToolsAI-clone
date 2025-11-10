import type { SocialContentState } from "../social-content-types";

/**
 * Await Approval Node
 * Pauses execution and waits for user to approve wireframes
 */
export async function awaitApproval(state: SocialContentState): Promise<Partial<SocialContentState>> {
  console.log('[awaitApproval] Waiting for user approval...');
  
  // This node just marks the state as waiting
  // The graph will pause here until the user provides feedback
  return {
    metadata: {
      ...state.metadata,
      currentStep: 'awaitApproval',
      humanApprovalPending: true,
    },
  };
}

/**
 * Check if user has approved wireframes
 * Used as a conditional edge in the graph
 */
export function hasApprovals(state: SocialContentState): "approved" | "awaitApproval" {
  if (state.approvedWireframeIds && state.approvedWireframeIds.length > 0) {
    return "approved";
  }
  return "awaitApproval";
}
