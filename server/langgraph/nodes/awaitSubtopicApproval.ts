import { interrupt } from "@langchain/langgraph";
import { ContentWriterState } from "../types";

export async function awaitSubtopicApproval(state: ContentWriterState): Promise<Partial<ContentWriterState>> {
  try {
    const { selectedSubtopicIds, subtopics } = state;

    if (!selectedSubtopicIds || selectedSubtopicIds.length === 0) {
      await interrupt({
        message: "Please select subtopics to continue",
        subtopics: subtopics,
        step: "awaitSubtopicApproval"
      });

      return {};
    }

    const invalidSubtopics = selectedSubtopicIds.filter(
      id => !subtopics.find(s => s.id === id)
    );
    
    if (invalidSubtopics.length > 0) {
      // Clear invalid subtopic IDs and interrupt again with current subtopics
      // This prevents workflow failure when subtopics are regenerated
      console.warn(`Selected subtopic IDs not found: ${invalidSubtopics.join(', ')}. Available IDs: ${subtopics.map(s => s.id).join(', ')}`);
      
      await interrupt({
        message: "Some previously selected subtopics are no longer available. Please select subtopics from the updated list.",
        subtopics: subtopics,
        step: "awaitSubtopicApproval"
      });

      return {
        selectedSubtopicIds: [], // Clear invalid selections
      };
    }

    return {};
  } catch (error) {
    console.error("Error in awaitSubtopicApproval:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      errors: [
        ...state.errors,
        {
          step: 'awaitSubtopicApproval',
          message: errorMessage,
          timestamp: new Date().toISOString(),
        },
      ],
      status: 'failed',
    };
  }
}
