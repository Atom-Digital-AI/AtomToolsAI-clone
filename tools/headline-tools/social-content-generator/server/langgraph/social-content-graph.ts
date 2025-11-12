import { StateGraph, END } from "@langchain/langgraph";
import type {
  SocialContentState,
  WireframeOption,
} from "./social-content-types";
import { scrapeUrls } from "../../../../component-tools/url-scraper/server/scrapeUrls";
import { generateWireframes } from "../../../../component-tools/wireframe-generator/server/generateWireframes";
import {
  awaitApproval,
  hasApprovals,
} from "./social-content-nodes/awaitApproval";
import { handleApproval } from "./social-content-nodes/handleApproval";
import { PostgresCheckpointer } from "../../../../../server/langgraph/postgres-checkpointer";

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
    selectedPlatforms: { value: (x: string[], y?: string[]) => y ?? x },
    selectedFormats: {
      value: (x: Record<string, string[]>, y?: Record<string, string[]>) =>
        y ?? x,
    },

    guidelineProfileId: {
      value: (x: string | undefined, y?: string) => y ?? x ?? undefined,
    },
    useBrandGuidelines: { value: (x: boolean, y?: boolean) => y ?? x },
    selectedTargetAudiences: {
      value: (
        x: "all" | "none" | number[] | null | undefined,
        y?: "all" | "none" | number[] | null
      ) => y ?? x ?? undefined,
    },

    scrapedUrlData: {
      value: (
        x:
          | Array<{ url: string; summary: string; keyPoints: string[] }>
          | undefined,
        y?: Array<{ url: string; summary: string; keyPoints: string[] }>
      ) => y ?? x ?? undefined,
    },

    wireframes: {
      value: (x: WireframeOption[] | undefined, y?: WireframeOption[]) =>
        y ?? x ?? [],
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

// Add nodes
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

// Compile graph (checkpointer is provided at invoke time, not at compile time)
export const socialContentGraph = (workflow as any).compile({
  interruptBefore: ["awaitApproval"], // Pause before awaiting approval
});

export type SocialContentGraph = typeof socialContentGraph;
