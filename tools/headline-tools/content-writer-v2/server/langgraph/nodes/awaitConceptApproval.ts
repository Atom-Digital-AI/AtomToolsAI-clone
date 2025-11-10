import { interrupt } from "@langchain/langgraph";
import { ContentWriterState } from "../types";

export async function awaitConceptApproval(state: ContentWriterState): Promise<Partial<ContentWriterState>> {
  try {
    const { selectedConceptId, concepts } = state;

    // If no concept selected, interrupt for user input
    if (!selectedConceptId) {
      await interrupt({
        message: "Please select a concept to continue",
        concepts: concepts,
        step: "awaitConceptApproval"
      });

      return {};
    }

    // Validate selected concept exists in current concepts array
    // This handles cases where concepts were regenerated and IDs changed
    const conceptExists = concepts.find(c => c.id === selectedConceptId);
    if (!conceptExists) {
      // Clear invalid selectedConceptId and interrupt again with current concepts
      // This prevents workflow failure when concepts are regenerated
      console.warn(`Selected concept ID ${selectedConceptId} not found in available concepts. Available IDs: ${concepts.map(c => c.id).join(', ')}`);
      
      await interrupt({
        message: "The previously selected concept is no longer available. Please select a concept from the updated list.",
        concepts: concepts,
        step: "awaitConceptApproval"
      });

      return {
        selectedConceptId: undefined, // Clear invalid selection
      };
    }

    return {};
  } catch (error) {
    console.error("Error in awaitConceptApproval:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      errors: [
        ...state.errors,
        {
          step: 'awaitConceptApproval',
          message: errorMessage,
          timestamp: new Date().toISOString(),
        },
      ],
      status: 'failed',
    };
  }
}
