import { interrupt } from "@langchain/langgraph";
import { ContentWriterState } from "../types";

export async function awaitConceptApproval(state: ContentWriterState): Promise<Partial<ContentWriterState>> {
  try {
    const { selectedConceptId, concepts } = state;

    if (!selectedConceptId) {
      await interrupt({
        message: "Please select a concept to continue",
        concepts: concepts,
        step: "awaitConceptApproval"
      });

      return {};
    }

    const conceptExists = concepts.find(c => c.id === selectedConceptId);
    if (!conceptExists) {
      throw new Error(`Selected concept with ID ${selectedConceptId} not found in available concepts`);
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
