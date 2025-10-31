import { StateGraph, END } from "@langchain/langgraph";
import type { SocialContentState } from "./social-content-types";
import { scrapeUrls } from "./social-content-nodes/scrapeUrls";
import { generateWireframes } from "./social-content-nodes/generateWireframes";
import { awaitApproval, hasApprovals } from "./social-content-nodes/awaitApproval";
import { handleApproval } from "./social-content-nodes/handleApproval";
import { PostgresCheckpointer } from "./postgres-checkpointer";

/**
 * Social Content Generator Graph
 * Multi-stage workflow for generating compliant social media content
 * 
 * Flow:
 * 1. scrapeUrls: Extract content from provided URLs
 * 2. generateWireframes: Create 3 options (A/B/C) for each platform?format
 * 3. awaitApproval: Pause for user feedback
 * 4. handleApproval: Process approved wireframes
 */

// Create the graph
const workflow = new StateGraph<SocialContentState>({
  channels: {
    sessionId: { value: (x: string | undefined, y?: string) => y ?? x ?? undefined },
    userId: { value: (x: string, y?: string) => y ?? x },
    threadId: { value: (x: string | undefined, y?: string) => y ?? x ?? undefined },
    
    subject: { value: (x: string, y?: string) => y ?? x },
    objective: { value: (x: string | undefined, y?: string) => y ?? x ?? undefined },
    urls: { value: (x: string[] | undefined, y?: string[]) => y ?? x ?? undefined },
    selectedPlatforms: { value: (x, y) => y ?? x },
    selectedFormats: { value: (x, y) => y ?? x },
    
    guidelineProfileId: { value: (x, y) => y ?? x ?? undefined },
    useBrandGuidelines: { value: (x, y) => y ?? x },
    selectedTargetAudiences: { value: (x, y) => y ?? x ?? undefined },
    
    scrapedUrlData: { value: (x, y) => y ?? x ?? undefined },
    
    wireframes: {
      value: (x, y) => y ?? x ?? [],
      default: () => [],
    },
    approvedWireframeIds: {
      value: (x, y) => y ?? x ?? [],
      default: () => [],
    },
    
    metadata: {
      value: (x, y) => ({ ...x, ...y }),
      default: () => ({
        currentStep: 'intake',
        totalFormats: 0,
        generatedFormats: 0,
        approvedFormats: 0,
        startedAt: new Date().toISOString(),
      }),
    },
    
    errors: {
      value: (x, y) => [...(x ?? []), ...(y ?? [])],
      default: () => [],
    },
    
    status: { value: (x, y) => y ?? x ?? 'pending' },
  },
});

// Add nodes
workflow.addNode("scrapeUrls", scrapeUrls);
workflow.addNode("generateWireframes", generateWireframes);
workflow.addNode("awaitApproval", awaitApproval);
workflow.addNode("handleApproval", handleApproval);

// Set entry point
workflow.setEntryPoint("scrapeUrls");

// Add edges
workflow.addEdge("scrapeUrls", "generateWireframes");
workflow.addEdge("generateWireframes", "awaitApproval");

// Conditional edge: wait for approval or proceed
workflow.addConditionalEdges(
  "awaitApproval",
  hasApprovals,
  {
    awaitApproval: "awaitApproval", // Loop back and wait
    approved: "handleApproval",
  }
);

workflow.addEdge("handleApproval", END);

// Compile with checkpointer
let checkpointer: PostgresCheckpointer;

try {
  checkpointer = new PostgresCheckpointer();
} catch (error) {
  console.error("Failed to initialize PostgresCheckpointer:", error);
  throw error;
}

export const socialContentGraph = workflow.compile({
  checkpointer,
  interruptBefore: ["awaitApproval"], // Pause before awaiting approval
});

export type SocialContentGraph = typeof socialContentGraph;
