import type { SocialContentState } from "../social-content-types";
import { calculateTotalFormats } from "../social-content-types";

/**
 * Handle Approval Node
 * Processes user-approved wireframes and finalizes the session
 */
export async function handleApproval(state: SocialContentState): Promise<Partial<SocialContentState>> {
  console.log('[handleApproval] Processing approved wireframes...');
  
  const approvedCount = state.approvedWireframeIds.length;
  const totalFormats = calculateTotalFormats(state.selectedFormats);
  
  console.log(`[handleApproval] User approved ${approvedCount} of ${totalFormats} formats`);
  
  // In the future, this node could trigger actual media generation
  // For now, we just mark the session as complete
  
  return {
    metadata: {
      ...state.metadata,
      currentStep: 'completed',
      approvedFormats: approvedCount,
      humanApprovalPending: false,
      completedAt: new Date().toISOString(),
    },
    status: 'completed',
  };
}
