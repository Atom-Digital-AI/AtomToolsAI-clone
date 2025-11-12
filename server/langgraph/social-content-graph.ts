import { StateGraph, END } from "@langchain/langgraph";
import type { SocialContentState } from "./social-content-types";
import { scrapeUrls } from "./social-content-nodes/scrapeUrls";
import { generateWireframes } from "./social-content-nodes/generateWireframes";
import {
  awaitApproval,
  hasApprovals,
} from "./social-content-nodes/awaitApproval";
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

// Create the graph (cast to any to bypass strict type checking for channels API)
const workflow = new (StateGraph as any)({
  channels: {
    sessionId: {
      value: (x: string | undefined, y?: string) => y ?? x ?? undefined,
    },
    userId: { value: (x: string, y?: string) => y ?? x },
    threadId: {
      value: (x: string | undefined, y?: string) => y ?? x ?? undefined,
    },

    subject: { value: (x: string, y?: string) => y ?? x },
    objective: {
      value: (x: string | undefined, y?: string) => y ?? x ?? undefined,
    },
    urls: {
      value: (x: string[] | undefined, y?: string[]) => y ?? x ?? undefined,
    },
    selectedPlatforms: {
      value: (x: string[] | undefined, y?: string[]) => y ?? x,
    },
    selectedFormats: {
      value: (x: string[] | undefined, y?: string[]) => y ?? x,
    },

    guidelineProfileId: {
      value: (x: string | undefined, y?: string) => y ?? x ?? undefined,
    },
    useBrandGuidelines: {
      value: (x: boolean | undefined, y?: boolean) => y ?? x,
    },
    selectedTargetAudiences: {
      value: (x: string[] | undefined, y?: string[]) => y ?? x ?? undefined,
    },

    scrapedUrlData: { value: (x: any, y?: any) => y ?? x ?? undefined },

    wireframes: {
      value: (x: any[], y?: any[]) => y ?? x ?? [],
      default: () => [],
    },
    approvedWireframeIds: {
      value: (x: string[] | undefined, y?: string[]) => y ?? x ?? [],
      default: () => [],
    },

    metadata: {
      value: (x: any, y?: any) => ({ ...x, ...y }),
      default: () => ({
        currentStep: "intake",
        totalFormats: 0,
        generatedFormats: 0,
        approvedFormats: 0,
        startedAt: new Date().toISOString(),
      }),
    },

    errors: {
      value: (x: any[] | undefined, y?: any[]) => [...(x ?? []), ...(y ?? [])],
      default: () => [],
    },

    status: {
      value: (x: string | undefined, y?: string) => y ?? x ?? "pending",
    },
  },
});

// Add nodes (cast to any to bypass strict type checking)
(workflow as any).addNode("scrapeUrls", scrapeUrls);
(workflow as any).addNode("generateWireframes", generateWireframes);
(workflow as any).addNode("awaitApproval", awaitApproval);
(workflow as any).addNode("handleApproval", handleApproval);

// Set entry point
(workflow as any).setEntryPoint("scrapeUrls");

// Add edges
(workflow as any).addEdge("scrapeUrls", "generateWireframes");
(workflow as any).addEdge("generateWireframes", "awaitApproval");

// Conditional edge: wait for approval or proceed
(workflow as any).addConditionalEdges("awaitApproval", hasApprovals, {
  awaitApproval: "awaitApproval", // Loop back and wait
  approved: "handleApproval",
});

(workflow as any).addEdge("handleApproval", END);

// Compile graph (checkpointer will be created per-request with userId)
// Note: This creates a graph that expects checkpointer to be provided at invoke time
export const socialContentGraph = (workflow as any).compile({
  interruptBefore: ["awaitApproval"], // Pause before awaiting approval
});

export type SocialContentGraph = typeof socialContentGraph;
