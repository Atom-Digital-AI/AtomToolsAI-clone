import { ContentWriterState } from "../types";

export async function setAwaitSubtopicApproval(state: ContentWriterState): Promise<Partial<ContentWriterState>> {
  try {
    const { selectedSubtopicIds } = state;

    if (!selectedSubtopicIds || selectedSubtopicIds.length === 0) {
      return {
        metadata: {
          ...state.metadata,
          currentStep: 'awaitSubtopicApproval',
        },
      };
    }

    return {
      metadata: {
        ...state.metadata,
        currentStep: 'subtopicsApproved',
      },
    };
  } catch (error) {
    console.error("Error in setAwaitSubtopicApproval:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      errors: [
        ...state.errors,
        {
          step: 'setAwaitSubtopicApproval',
          message: errorMessage,
          timestamp: new Date().toISOString(),
        },
      ],
      status: 'failed',
    };
  }
}
