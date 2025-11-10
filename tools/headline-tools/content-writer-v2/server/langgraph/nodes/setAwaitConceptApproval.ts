import { ContentWriterState } from "../types";

export async function setAwaitConceptApproval(state: ContentWriterState): Promise<Partial<ContentWriterState>> {
  try {
    const { selectedConceptId } = state;

    if (!selectedConceptId) {
      return {
        metadata: {
          ...state.metadata,
          currentStep: 'awaitConceptApproval',
        },
      };
    }

    return {
      metadata: {
        ...state.metadata,
        currentStep: 'conceptApproved',
      },
    };
  } catch (error) {
    console.error("Error in setAwaitConceptApproval:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      errors: [
        ...state.errors,
        {
          step: 'setAwaitConceptApproval',
          message: errorMessage,
          timestamp: new Date().toISOString(),
        },
      ],
      status: 'failed',
    };
  }
}
