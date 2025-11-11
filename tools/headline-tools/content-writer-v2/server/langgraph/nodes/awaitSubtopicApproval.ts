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
    // GraphInterrupt is expected behavior - it pauses the workflow for user input
    // Re-throw it so LangGraph can handle it properly
    // Check for GraphInterrupt in multiple ways since the error type may vary
    const errorStr = String(error);
    const errorName = error instanceof Error ? error.name : '';
    const errorConstructorName = error?.constructor?.name || '';
    
    if (errorName === 'GraphInterrupt' || 
        errorConstructorName === 'GraphInterrupt' ||
        errorStr.includes('GraphInterrupt') ||
        (error instanceof Error && error.message.includes('GraphInterrupt'))) {
      // Re-throw GraphInterrupt - this is expected behavior, not an error
      throw error;
    }
    
    // Only log actual errors, not expected interrupts
    console.error("Error in awaitSubtopicApproval:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      errors: [
        ...(state.errors || []),
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
