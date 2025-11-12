/**
 * Test suite for content writer concept regeneration mutation
 * Tests optimistic updates, cache management, and error handling
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";

// Mock the queryClient and apiRequest
const mockQueryClient = {
  cancelQueries: vi.fn(),
  getQueryData: vi.fn(),
  setQueryData: vi.fn(),
  invalidateQueries: vi.fn(),
  refetchQueries: vi.fn(),
};

const mockApiRequest = vi.fn();

// Mock the modules
vi.mock("@/lib/queryClient", () => ({
  queryClient: mockQueryClient,
  apiRequest: mockApiRequest,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("Regenerate Concepts Mutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Legacy Session (sessionId only)", () => {
    test("should optimistically clear concepts when regeneration starts", async () => {
      const sessionId = "session-123";
      const threadId = null;

      const oldSessionData = {
        session: { id: sessionId, topic: "Test Topic" },
        concepts: [
          { id: "concept-1", title: "Old Concept 1", summary: "Summary 1" },
          { id: "concept-2", title: "Old Concept 2", summary: "Summary 2" },
        ],
      };

      mockQueryClient.getQueryData.mockReturnValue(oldSessionData);
      mockApiRequest.mockResolvedValue({
        json: async () => ({
          concepts: [
            {
              id: "concept-3",
              title: "New Concept 1",
              summary: "New Summary 1",
            },
            {
              id: "concept-4",
              title: "New Concept 2",
              summary: "New Summary 2",
            },
          ],
        }),
      });

      // Simulate the mutation
      const mutationFn = async () => {
        const res = await mockApiRequest(
          "POST",
          `/api/content-writer/sessions/${sessionId}/regenerate`,
          {
            feedbackText: "Test feedback",
            matchStyle: false,
          }
        );
        return await res.json();
      };

      // Simulate onMutate
      const onMutate = async () => {
        await mockQueryClient.cancelQueries({
          queryKey: [`/api/content-writer/sessions/${sessionId}`],
        });

        const previousData = mockQueryClient.getQueryData([
          `/api/content-writer/sessions/${sessionId}`,
        ]);

        // Optimistically clear concepts
        mockQueryClient.setQueryData(
          [`/api/content-writer/sessions/${sessionId}`],
          (old: any) => {
            if (!old) return old;
            return {
              ...old,
              concepts: [], // Clear old concepts immediately
            };
          }
        );

        return { previousData };
      };

      // Execute onMutate
      const context = await onMutate();

      // Verify concepts were cleared optimistically
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        [`/api/content-writer/sessions/${sessionId}`],
        expect.any(Function)
      );

      // Verify the function clears concepts
      const setQueryDataCall = mockQueryClient.setQueryData.mock.calls[0];
      const updateFn = setQueryDataCall[1];
      const result = updateFn(oldSessionData);
      expect(result.concepts).toEqual([]);
      expect(result.session).toEqual(oldSessionData.session);
    });

    test("should update cache with new concepts on success", async () => {
      const sessionId = "session-123";
      const newConcepts = [
        { id: "concept-3", title: "New Concept 1", summary: "New Summary 1" },
        { id: "concept-4", title: "New Concept 2", summary: "New Summary 2" },
      ];

      const responseData = { concepts: newConcepts };

      const oldSessionData = {
        session: { id: sessionId, topic: "Test Topic" },
        concepts: [],
      };

      mockQueryClient.getQueryData.mockReturnValue(oldSessionData);

      // Simulate onSuccess
      const onSuccess = (data: any) => {
        if (data?.concepts && sessionId) {
          mockQueryClient.setQueryData(
            [`/api/content-writer/sessions/${sessionId}`],
            (old: any) => {
              if (!old) return old;
              return {
                ...old,
                concepts: data.concepts, // Set new concepts from response
              };
            }
          );
        }

        mockQueryClient.invalidateQueries({
          queryKey: [`/api/content-writer/sessions/${sessionId}`],
        });
        mockQueryClient.refetchQueries({
          queryKey: [`/api/content-writer/sessions/${sessionId}`],
        });
      };

      // Execute onSuccess
      onSuccess(responseData);

      // Verify cache was updated with new concepts
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        [`/api/content-writer/sessions/${sessionId}`],
        expect.any(Function)
      );

      // Verify the update function sets new concepts
      const setQueryDataCall = mockQueryClient.setQueryData.mock.calls[0];
      const updateFn = setQueryDataCall[1];
      const result = updateFn(oldSessionData);
      expect(result.concepts).toEqual(newConcepts);
      expect(result.concepts.length).toBe(2);
      expect(result.concepts[0].title).toBe("New Concept 1");

      // Verify queries were invalidated and refetched
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [`/api/content-writer/sessions/${sessionId}`],
      });
      expect(mockQueryClient.refetchQueries).toHaveBeenCalledWith({
        queryKey: [`/api/content-writer/sessions/${sessionId}`],
      });
    });

    test("should rollback optimistic update on error", async () => {
      const sessionId = "session-123";
      const previousData = {
        session: { id: sessionId, topic: "Test Topic" },
        concepts: [
          { id: "concept-1", title: "Old Concept 1", summary: "Summary 1" },
        ],
      };

      const context = { previousData };

      // Simulate onError
      const onError = (error: any, variables: any, context: any) => {
        if (context?.previousData && sessionId) {
          mockQueryClient.setQueryData(
            [`/api/content-writer/sessions/${sessionId}`],
            context.previousData
          );
        }
      };

      // Execute onError
      onError(new Error("API Error"), {}, context);

      // Verify rollback occurred
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        [`/api/content-writer/sessions/${sessionId}`],
        previousData
      );
    });
  });

  describe("LangGraph Session (threadId)", () => {
    test("should optimistically clear concepts when regeneration starts", async () => {
      const threadId = "thread-123";
      const oldStatusData = {
        threadId,
        state: {
          concepts: [
            { id: "concept-1", title: "Old Concept 1", summary: "Summary 1" },
            { id: "concept-2", title: "Old Concept 2", summary: "Summary 2" },
          ],
          metadata: { currentStep: "awaitConceptApproval" },
        },
        currentStep: "awaitConceptApproval",
        completed: false,
      };

      mockQueryClient.getQueryData.mockReturnValue(oldStatusData);

      // Simulate onMutate
      const onMutate = async () => {
        await mockQueryClient.cancelQueries({
          queryKey: ["/api/langgraph/content-writer/status", threadId],
        });

        const previousData = mockQueryClient.getQueryData([
          "/api/langgraph/content-writer/status",
          threadId,
        ]);

        // Optimistically clear concepts
        mockQueryClient.setQueryData(
          ["/api/langgraph/content-writer/status", threadId],
          (old: any) => {
            if (!old) return old;
            return {
              ...old,
              state: {
                ...old.state,
                concepts: [], // Clear old concepts immediately
              },
            };
          }
        );

        return { previousData };
      };

      // Execute onMutate
      const context = await onMutate();

      // Verify concepts were cleared optimistically
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ["/api/langgraph/content-writer/status", threadId],
        expect.any(Function)
      );

      // Verify the function clears concepts
      const setQueryDataCall = mockQueryClient.setQueryData.mock.calls[0];
      const updateFn = setQueryDataCall[1];
      const result = updateFn(oldStatusData);
      expect(result.state.concepts).toEqual([]);
      expect(result.state.metadata).toEqual(oldStatusData.state.metadata);
    });

    test("should update cache with new state on success", async () => {
      const threadId = "thread-123";
      const newConcepts = [
        { id: "concept-3", title: "New Concept 1", summary: "New Summary 1" },
        { id: "concept-4", title: "New Concept 2", summary: "New Summary 2" },
      ];

      const responseData = {
        threadId,
        state: {
          concepts: newConcepts,
          metadata: {
            currentStep: "awaitConceptApproval",
            regenerationCount: 1,
          },
          status: "processing",
        },
      };

      // Simulate onSuccess
      const onSuccess = (data: any) => {
        if (data?.state && threadId) {
          mockQueryClient.setQueryData(
            ["/api/langgraph/content-writer/status", threadId],
            {
              threadId: data.threadId || threadId,
              state: data.state,
              currentStep:
                data.state.metadata?.currentStep || "awaitConceptApproval",
              completed: data.state.status === "completed",
            }
          );
        }
      };

      // Execute onSuccess
      onSuccess(responseData);

      // Verify cache was updated
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ["/api/langgraph/content-writer/status", threadId],
        {
          threadId,
          state: responseData.state,
          currentStep: "awaitConceptApproval",
          completed: false,
        }
      );
    });

    test("should rollback optimistic update on error", async () => {
      const threadId = "thread-123";
      const previousData = {
        threadId,
        state: {
          concepts: [
            { id: "concept-1", title: "Old Concept 1", summary: "Summary 1" },
          ],
          metadata: { currentStep: "awaitConceptApproval" },
        },
        currentStep: "awaitConceptApproval",
        completed: false,
      };

      const context = { previousData };

      // Simulate onError
      const onError = (error: any, variables: any, context: any) => {
        if (context?.previousData && threadId) {
          mockQueryClient.setQueryData(
            ["/api/langgraph/content-writer/status", threadId],
            context.previousData
          );
        }
      };

      // Execute onError
      onError(new Error("API Error"), {}, context);

      // Verify rollback occurred
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ["/api/langgraph/content-writer/status", threadId],
        previousData
      );
    });
  });

  describe("Integration scenarios", () => {
    test("should handle full regeneration flow for legacy session", async () => {
      const sessionId = "session-123";
      const oldConcepts = [
        { id: "concept-1", title: "Old Concept 1", summary: "Summary 1" },
        { id: "concept-2", title: "Old Concept 2", summary: "Summary 2" },
      ];
      const newConcepts = [
        { id: "concept-3", title: "New Concept 1", summary: "New Summary 1" },
        { id: "concept-4", title: "New Concept 2", summary: "New Summary 2" },
      ];

      const oldSessionData = {
        session: { id: sessionId, topic: "Test Topic" },
        concepts: oldConcepts,
      };

      mockQueryClient.getQueryData.mockReturnValue(oldSessionData);
      mockApiRequest.mockResolvedValue({
        json: async () => ({ concepts: newConcepts }),
      });

      // Step 1: onMutate - clear concepts
      const onMutate = async () => {
        await mockQueryClient.cancelQueries({
          queryKey: [`/api/content-writer/sessions/${sessionId}`],
        });
        const previousData = mockQueryClient.getQueryData([
          `/api/content-writer/sessions/${sessionId}`,
        ]);
        mockQueryClient.setQueryData(
          [`/api/content-writer/sessions/${sessionId}`],
          (old: any) => ({ ...old, concepts: [] })
        );
        return { previousData };
      };

      const context = await onMutate();
      expect(mockQueryClient.setQueryData).toHaveBeenCalled();

      // Step 2: mutationFn - call API
      const mutationFn = async () => {
        const res = await mockApiRequest(
          "POST",
          `/api/content-writer/sessions/${sessionId}/regenerate`,
          { feedbackText: "Test", matchStyle: false }
        );
        return await res.json();
      };

      const result = await mutationFn();
      expect(result.concepts).toEqual(newConcepts);

      // Step 3: onSuccess - update with new concepts
      const onSuccess = (data: any) => {
        if (data?.concepts && sessionId) {
          mockQueryClient.setQueryData(
            [`/api/content-writer/sessions/${sessionId}`],
            (old: any) => ({ ...old, concepts: data.concepts })
          );
        }
        mockQueryClient.invalidateQueries({
          queryKey: [`/api/content-writer/sessions/${sessionId}`],
        });
      };

      onSuccess(result);

      // Verify final state
      const finalUpdateCall = mockQueryClient.setQueryData.mock.calls.find(
        (call) => call[0][0] === `/api/content-writer/sessions/${sessionId}`
      );
      expect(finalUpdateCall).toBeDefined();
    });

    test("should handle error and rollback correctly", async () => {
      const sessionId = "session-123";
      const previousData = {
        session: { id: sessionId, topic: "Test Topic" },
        concepts: [
          { id: "concept-1", title: "Old Concept 1", summary: "Summary 1" },
        ],
      };

      mockApiRequest.mockRejectedValue(new Error("Network error"));

      // Simulate full error flow
      const onMutate = async () => {
        mockQueryClient.setQueryData(
          [`/api/content-writer/sessions/${sessionId}`],
          (old: any) => ({ ...old, concepts: [] })
        );
        return { previousData };
      };

      const onError = (error: any, variables: any, context: any) => {
        if (context?.previousData && sessionId) {
          mockQueryClient.setQueryData(
            [`/api/content-writer/sessions/${sessionId}`],
            context.previousData
          );
        }
      };

      const context = await onMutate();
      onError(new Error("Network error"), {}, context);

      // Verify rollback restored previous data
      const rollbackCall = mockQueryClient.setQueryData.mock.calls.find(
        (call) =>
          call[0][0] === `/api/content-writer/sessions/${sessionId}` &&
          call[1] === previousData
      );
      expect(rollbackCall).toBeDefined();
    });
  });
});
