import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccessGuard } from "@/components/access-guard";
import {
  Sparkles,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Save,
  ThumbsUp,
  ThumbsDown,
  Check,
  X,
  Download,
  Copy,
  Plus,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import GuidelineProfileSelector from "@/components/guideline-profile-selector";
import type { GuidelineContent } from "@shared/schema";
import { useBrand } from "@/contexts/BrandContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLocation } from "wouter";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { PRODUCT_IDS } from "@shared/schema";

interface Concept {
  id: string;
  sessionId: string;
  title: string;
  summary: string;
  rankOrder: number;
  userAction?: string;
  feedbackId?: string;
}

interface Subtopic {
  id: string;
  sessionId: string;
  parentConceptId: string;
  title: string;
  summary: string;
  rankOrder: number;
  isSelected: boolean;
  userAction?: string;
}

interface Draft {
  id: string;
  sessionId: string;
  mainBrief: string;
  subtopicBriefs: any;
  subtopicContents: any;
  topAndTail: string;
  finalArticle: string;
  metadata: any;
  brandScore?: number;
  factScore?: number;
}

interface Session {
  id: string;
  userId: string;
  topic: string;
  guidelineProfileId?: string;
  selectedConceptId?: string;
  status: "concepts" | "subtopics" | "generating" | "completed";
  objective?: string;
  targetLength?: number;
  toneOfVoice?: string;
  language?: string;
  internalLinks?: string[];
  useBrandGuidelines?: boolean;
}

interface LangGraphThread {
  threadId: string;
  sessionId: string;
  status: "active" | "paused" | "completed" | "error";
  createdAt: string;
  updatedAt: string;
  metadata?: {
    topic?: string;
    currentStep?: string;
    completed?: boolean;
    errors?: any[];
  };
  session?: {
    id: string;
    topic: string;
    status: string;
    guidelineProfileId?: string;
  };
}

interface ThreadState {
  concepts?: Concept[];
  subtopics?: Subtopic[];
  articleDraft?: {
    finalArticle: string;
    metadata?: any;
  };
  selectedConceptId?: string;
  selectedSubtopicIds?: string[];
  metadata?: {
    currentStep?: string;
    startedAt?: string;
    brandIssues?: string[];
    factIssues?: string[];
    regenerationCount?: number;
  };
  status?: "pending" | "processing" | "completed" | "failed";
  brandScore?: number;
  factScore?: number;
}

type Stage = "topic" | "concepts" | "subtopics" | "article";

// Debug helper that uses console.error in production (won't be stripped)
const debugLog = (...args: any[]) => {
  if (import.meta.env.PROD) {
    console.error("[DEBUG]", ...args);
  } else {
    console.log("[DEBUG]", ...args);
  }
};

export default function ContentWriterV2() {
  // Debug: Log component mount - using console.error so it won't be stripped in production
  useEffect(() => {
    debugLog("🔵🔵🔵 [Content Writer] Component mounted/updated - logging is active");
    debugLog("🔵 [Content Writer] Check browser console filter - make sure 'All levels' or 'Errors' is selected");
    // Also set a global flag for debugging
    (window as any).__CONTENT_WRITER_DEBUG__ = true;
    debugLog("🔵 [Content Writer] Debug flag set: __CONTENT_WRITER_DEBUG__ =", (window as any).__CONTENT_WRITER_DEBUG__);
  }, []);

  const [stage, setStage] = useState<Stage>("topic");
  const [topic, setTopic] = useState("");
  const [brandGuidelines, setBrandGuidelines] = useState<
    GuidelineContent | string
  >("");
  const [objective, setObjective] = useState("");
  const [targetLength, setTargetLength] = useState("1000");
  const [toneOfVoice, setToneOfVoice] = useState("");
  const [language, setLanguage] = useState("en-US");
  const [internalLinks, setInternalLinks] = useState("");
  const [useBrandGuidelines, setUseBrandGuidelines] = useState(true);
  const [selectedTargetAudiences, setSelectedTargetAudiences] = useState<
    "all" | "none" | number[]
  >("none");
  const [matchStyle, setMatchStyle] = useState(false);
  const [styleMatchingMethod, setStyleMatchingMethod] = useState<
    "continuous" | "end-rewrite"
  >("continuous");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [regenerateFeedback, setRegenerateFeedback] = useState("");
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [selectedSubtopics, setSelectedSubtopics] = useState<Set<string>>(
    new Set()
  );
  const [showGenerationDialog, setShowGenerationDialog] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [incompleteThread, setIncompleteThread] =
    useState<LangGraphThread | null>(null);
  const [selectingConceptId, setSelectingConceptId] = useState<string | null>(
    null
  );
  const sessionCreatedAtRef = useRef<number | null>(null);

  const { toast } = useToast();
  const { selectedBrand } = useBrand();
  const [, setLocation] = useLocation();
  const isMountedRef = useRef(true);

  const productId = PRODUCT_IDS.CONTENT_WRITER_V2;

  // Track mounted state to prevent state updates after unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Auto-populate from selected brand
  useEffect(() => {
    if (selectedBrand) {
      setBrandGuidelines(selectedBrand.id);
    } else {
      setBrandGuidelines("");
    }
  }, [selectedBrand]);

  // Check for incomplete threads on mount
  const { data: threadsData } = useQuery<{ threads: LangGraphThread[] }>({
    queryKey: ["/api/langgraph/content-writer/threads"],
    enabled: !threadId && !sessionId,
  });

  // Show resume banner if there are incomplete threads
  useEffect(() => {
    if (threadsData?.threads && threadsData.threads.length > 0) {
      const incomplete = threadsData.threads.find(
        (t: LangGraphThread) => t.status !== "completed" && t.status !== "error"
      );
      if (incomplete) {
        setIncompleteThread(incomplete);
        setShowResumeBanner(true);
      }
    }
  }, [threadsData]);

  // Fetch session data (for backward compatibility - only when NOT using LangGraph)
  const {
    data: sessionData,
    isLoading: isSessionLoading,
    error: sessionError,
  } = useQuery({
    queryKey: [`/api/content-writer/sessions/${sessionId}`],
    enabled: !!sessionId && !threadId, // Only query legacy sessions when not using LangGraph
    retry: false, // Don't retry - if it fails, it's likely a LangGraph session
  });

  // Poll thread status when thread is active
  const { data: statusData } = useQuery<{
    threadId: string;
    state: ThreadState;
    currentStep: string;
    completed: boolean;
  }>({
    queryKey: ["/api/langgraph/content-writer/status", threadId],
    enabled: !!threadId,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling if thread is completed
      if (data?.completed || data?.state?.status === "completed") {
        return false;
      }

      // Stop polling if waiting for user approval
      const step = data?.currentStep || data?.state?.metadata?.currentStep;
      if (step === "awaitConceptApproval" || step === "awaitSubtopicApproval") {
        return false;
      }

      // Poll every 5 seconds during active processing
      return 5000;
    },
  });

  const threadState = statusData?.state;
  const currentStep =
    statusData?.currentStep || threadState?.metadata?.currentStep;
  const isThreadCompleted =
    statusData?.completed || threadState?.status === "completed";

  // Extract data from either thread state (LangGraph) or session (legacy)
  const session = (sessionData as any)?.session as Session | undefined;
  const concepts = (threadState?.concepts ||
    (sessionData as any)?.concepts ||
    []) as Concept[];
  const subtopics = (threadState?.subtopics ||
    (sessionData as any)?.subtopics ||
    []) as Subtopic[];

  // Log concepts derivation for debugging - track every change
  useEffect(() => {
    const threadStateConcepts = threadState?.concepts || [];
    const sessionDataConcepts = (sessionData as any)?.concepts || [];
    
    console.log("=".repeat(80));
    console.log("[STEP 3] Concepts Derivation: Component re-rendered");
    console.log("[STEP 3.1] Concepts Derivation: Current derived concepts:", {
      conceptsCount: concepts.length,
      concepts: concepts,
      conceptIds: concepts.map(c => c.id),
    });
    console.log("[STEP 3.2] Concepts Derivation: Source data:", {
      threadId,
      sessionId,
      hasThreadState: !!threadState,
      hasSessionData: !!sessionData,
      threadStateConceptsCount: threadStateConcepts.length,
      threadStateConcepts: threadStateConcepts,
      threadStateConceptIds: threadStateConcepts.map((c: any) => c.id),
      sessionDataConceptsCount: sessionDataConcepts.length,
      sessionDataConcepts: sessionDataConcepts,
      sessionDataConceptIds: sessionDataConcepts.map((c: any) => c.id),
    });
    console.log("[STEP 3.3] Concepts Derivation: Which source is being used?", {
      usingThreadState: concepts === threadStateConcepts,
      usingSessionData: concepts === sessionDataConcepts,
      usingEmpty: concepts.length === 0 && threadStateConcepts.length === 0 && sessionDataConcepts.length === 0,
    });
    console.log("[STEP 3.4] Concepts Derivation: Full threadState:", threadState);
    console.log("[STEP 3.5] Concepts Derivation: Full sessionData:", sessionData);
    console.log("=".repeat(80));
  }, [concepts, threadState, sessionData, threadId, sessionId]);
  const draft = threadState?.articleDraft
    ? ({
        ...threadState.articleDraft,
        id: sessionId || "",
        sessionId: sessionId || "",
      } as Draft)
    : ((sessionData as any)?.draft as Draft | undefined);

  // Handle approval states - automatically update stage when workflow pauses for approval
  // Only auto-update if concepts exist (not for brand new sessions)
  useEffect(() => {
    if (!currentStep || !threadId) return;

    // Don't auto-update stage immediately after session creation (within 3 seconds)
    // This prevents skipping the concepts stage if workflow moves quickly
    const isNewSession =
      sessionCreatedAtRef.current &&
      Date.now() - sessionCreatedAtRef.current < 3000;
    if (isNewSession && stage === "concepts") {
      return; // Don't auto-advance during initial concepts stage
    }

    // Only auto-advance if we already have concepts generated
    const hasConcepts = concepts.length > 0;

    if (currentStep === "awaitConceptApproval" || currentStep === "concepts") {
      if (stage !== "concepts") {
        setStage("concepts");
      }
    } else if (
      (currentStep === "awaitSubtopicApproval" ||
        currentStep === "subtopics") &&
      hasConcepts
    ) {
      // Only advance to subtopics if concepts are already generated and we're not in a new session
      if (stage !== "subtopics") {
        setStage("subtopics");
      }
    } else if (currentStep === "article" || currentStep === "generateArticle") {
      if (stage !== "article") {
        setStage("article");
      }
    }
  }, [currentStep, stage, threadId, concepts.length]);

  // Additional check: If we have subtopics but are still on concepts stage, move to subtopics
  // This handles the case where currentStep might not be updated yet but subtopics exist
  useEffect(() => {
    if (!threadId) return;

    const hasConcepts = concepts.length > 0;
    const hasSubtopics = subtopics.length > 0;

    // If we have concepts and subtopics, but are still on concepts stage, move to subtopics
    // This handles the case where currentStep might not be updated yet but subtopics exist
    if (
      hasConcepts &&
      hasSubtopics &&
      stage === "concepts" &&
      selectedConcept
    ) {
      setStage("subtopics");
    }
  }, [subtopics.length, concepts.length, stage, threadId, selectedConcept]);

  // Reset generateSubtopicsMutation state if stuck in pending and prerequisites are missing
  useEffect(() => {
    if (
      stage === "subtopics" &&
      generateSubtopicsMutation.isPending &&
      (!sessionId || !selectedConcept)
    ) {
      generateSubtopicsMutation.reset();
    }
  }, [stage, sessionId, selectedConcept]);

  // Sync selectedConcept from session if it exists but isn't in local state
  useEffect(() => {
    if (session?.selectedConceptId && !selectedConcept && concepts.length > 0) {
      const conceptFromSession = concepts.find(
        (c) => c.id === session.selectedConceptId
      );
      if (conceptFromSession) {
        setSelectedConcept(conceptFromSession);
      }
    }
  }, [session?.selectedConceptId, concepts, selectedConcept]);

  // Create session mutation - Using LangGraph API
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        "/api/langgraph/content-writer/start",
        {
          topic,
          guidelineProfileId:
            typeof brandGuidelines === "string" && brandGuidelines
              ? brandGuidelines
              : undefined,
          objective,
          targetLength: parseInt(targetLength),
          toneOfVoice,
          language,
          internalLinks: internalLinks
            .split(",")
            .map((l) => l.trim())
            .filter(Boolean),
          useBrandGuidelines,
          selectedTargetAudiences,
          styleMatchingMethod,
          matchStyle,
        }
      );
      return await res.json();
    },
    onMutate: async () => {
      // Clear all previous session/thread data from cache to ensure a clean slate
      if (threadId) {
        queryClient.removeQueries({
          queryKey: ["/api/langgraph/content-writer/status", threadId],
        });
      }
      if (sessionId) {
        queryClient.removeQueries({
          queryKey: [`/api/content-writer/sessions/${sessionId}`],
        });
      }

      // Clear local state
      setSelectedConcept(null);
      setSelectedSubtopics(new Set());
    },
    onSuccess: (data: any) => {
      console.log("LangGraph workflow started:", data);
      if (!data || !data.threadId || !data.sessionId) {
        console.error("Invalid LangGraph response:", data);
        toast({
          title: "Error",
          description: "Invalid response from server",
          variant: "destructive",
        });
        return;
      }
      // Set threadId first to prevent race condition with session query
      setThreadId(data.threadId);
      setSessionId(data.sessionId);
      // Track when session was created to prevent immediate stage auto-advancement
      sessionCreatedAtRef.current = Date.now();
      // Always start at concepts stage for new sessions
      // The useEffect will handle advancing once concepts are loaded and workflow progresses
      setStage("concepts");
      toast({
        title: "Concepts Generated",
        description: "Review the article concepts below",
      });
    },
    onError: (error: any) => {
      console.error("LangGraph workflow error:", error);
      const errorMessage = error?.message || "Failed to start workflow";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Resume workflow mutation - Using LangGraph API
  const resumeWorkflowMutation = useMutation({
    mutationFn: async ({
      threadId: tid,
      selectedConceptId,
      selectedSubtopicIds,
    }: {
      threadId: string;
      selectedConceptId?: string;
      selectedSubtopicIds?: string[];
    }) => {
      const payload: any = {};
      if (selectedConceptId) payload.selectedConceptId = selectedConceptId;
      if (selectedSubtopicIds)
        payload.selectedSubtopicIds = selectedSubtopicIds;

      const res = await apiRequest(
        "POST",
        `/api/langgraph/content-writer/resume/${tid}`,
        payload
      );
      return await res.json();
    },
    onSuccess: (data: any, variables) => {
      console.log("LangGraph workflow resumed:", data);
      if (!data || !data.threadId) {
        toast({
          title: "Error",
          description: "Invalid response from server",
          variant: "destructive",
        });
        return;
      }

      setThreadId(data.threadId);

      // Update stage based on what was resumed
      if (variables.selectedConceptId) {
        // Ensure selectedConcept state is set
        const concept = concepts.find(
          (c) => c.id === variables.selectedConceptId
        );
        if (concept) {
          setSelectedConcept(concept);
        }
        setStage("subtopics");
        toast({
          title: "Concept Selected",
          description: "Continuing with subtopic selection",
        });
      } else if (variables.selectedSubtopicIds) {
        setStage("article");
        toast({
          title: "Workflow Resumed",
          description: "Generating article...",
        });
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ["/api/langgraph/content-writer/status", data.threadId],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/content-writer/sessions/${sessionId}`],
      });
      setSelectingConceptId(null);
    },
    onError: (error: any) => {
      console.error("Resume workflow error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to resume workflow",
        variant: "destructive",
      });
      setSelectingConceptId(null);
    },
  });

  // Regenerate concepts mutation
  const regenerateConceptsMutation = useMutation({
    mutationFn: async () => {
      // Force log to ensure it's visible - using debugLog so it won't be stripped
      debugLog("🔴🔴🔴 [Regenerate Concepts] mutationFn: STARTING - THIS SHOULD BE VISIBLE");
      debugLog("[Regenerate Concepts] mutationFn: Starting regeneration", {
        threadId,
        sessionId,
        regenerateFeedback,
        matchStyle,
      });

      // Use LangGraph endpoint if threadId is available, otherwise use legacy endpoint
      if (threadId) {
        console.log(
          "[Regenerate Concepts] Using LangGraph endpoint:",
          `/api/langgraph/content-writer/regenerate/${threadId}`
        );
        const res = await apiRequest(
          "POST",
          `/api/langgraph/content-writer/regenerate/${threadId}`,
          {
            feedbackText: regenerateFeedback,
            matchStyle,
          }
        );
        const data = await res.json();
        console.log("[Regenerate Concepts] LangGraph response:", data);
        return data;
      } else if (sessionId) {
        console.log(
          "[Regenerate Concepts] Using legacy endpoint:",
          `/api/content-writer/sessions/${sessionId}/regenerate`
        );
        const res = await apiRequest(
          "POST",
          `/api/content-writer/sessions/${sessionId}/regenerate`,
          {
            feedbackText: regenerateFeedback,
            matchStyle,
          }
        );
        const data = await res.json();
        console.log("[Regenerate Concepts] Legacy response:", data);
        return data;
      } else {
        console.error(
          "[Regenerate Concepts] ERROR: No session or thread ID available"
        );
        throw new Error("No session or thread ID available");
      }
    },
    onMutate: async () => {
      // Force log to ensure it's visible - using debugLog so it won't be stripped
      debugLog("🟡🟡🟡 [Regenerate Concepts] onMutate: STARTING - THIS SHOULD BE VISIBLE");
      debugLog("=".repeat(80));
      debugLog("[STEP 1] onMutate: STARTING optimistic update");
      console.log("[STEP 1.1] onMutate: Current state", {
        threadId,
        sessionId,
        currentConceptsCount: concepts.length,
      });

      // Optimistically clear old concepts immediately when regeneration starts
      if (threadId) {
        console.log("[STEP 1.2] onMutate: LangGraph path detected");
        console.log("[STEP 1.2.1] onMutate: Cancelling queries for threadId:", threadId);
        
        // Cancel any outgoing refetches to prevent them from overwriting our optimistic update
        await queryClient.cancelQueries({
          queryKey: ["/api/langgraph/content-writer/status", threadId],
        });
        console.log("[STEP 1.2.2] onMutate: Queries cancelled");

        // Snapshot the previous value for potential rollback
        console.log("[STEP 1.2.3] onMutate: Getting previous data from cache");
        const previousData = queryClient.getQueryData([
          "/api/langgraph/content-writer/status",
          threadId,
        ]);
        console.log("[STEP 1.2.4] onMutate: Previous data retrieved:", {
          hasData: !!previousData,
          conceptsCount: previousData?.state?.concepts?.length || 0,
          concepts: previousData?.state?.concepts,
          fullData: previousData,
        });

        // Optimistically clear concepts to give instant feedback
        console.log("[STEP 1.2.5] onMutate: CALLING setQueryData to clear concepts");
        console.log("[STEP 1.2.5.1] onMutate: Query key:", ["/api/langgraph/content-writer/status", threadId]);
        
        queryClient.setQueryData(
          ["/api/langgraph/content-writer/status", threadId],
          (old: any) => {
            console.log("[STEP 1.2.5.2] onMutate: Inside setQueryData updater function");
            console.log("[STEP 1.2.5.3] onMutate: Old data received:", {
              hasOld: !!old,
              oldConceptsCount: old?.state?.concepts?.length || 0,
              oldConcepts: old?.state?.concepts,
            });
            
            if (!old) {
              console.log("[STEP 1.2.5.4] onMutate: No old data, returning as-is");
              return old;
            }
            
            console.log("[STEP 1.2.5.5] onMutate: Creating updated object with empty concepts array");
            const updated = {
              ...old,
              state: {
                ...old.state,
                concepts: [], // Clear old concepts immediately
              },
            };
            console.log("[STEP 1.2.5.6] onMutate: Updated object created:", {
              updatedConceptsCount: updated.state.concepts.length,
              updatedConcepts: updated.state.concepts,
              otherStateProps: Object.keys(updated.state).filter(k => k !== 'concepts'),
            });
            console.log("[STEP 1.2.5.7] onMutate: Returning updated object");
            return updated;
          }
        );
        console.log("[STEP 1.2.6] onMutate: setQueryData call completed");

        // Verify the update
        console.log("[STEP 1.2.7] onMutate: Verifying cache update");
        const afterUpdate = queryClient.getQueryData([
          "/api/langgraph/content-writer/status",
          threadId,
        ]);
        console.log("[STEP 1.2.8] onMutate: After update verification:", {
          hasData: !!afterUpdate,
          conceptsCount: afterUpdate?.state?.concepts?.length || 0,
          concepts: afterUpdate?.state?.concepts,
          fullData: afterUpdate,
        });
        console.log("[STEP 1.2.9] onMutate: Concepts cleared?", afterUpdate?.state?.concepts?.length === 0);

        console.log("[STEP 1.2.10] onMutate: Returning previousData for rollback");
        return { previousData };
      } else if (sessionId) {
        console.log("[STEP 1.3] onMutate: Legacy path detected");
        console.log("[STEP 1.3.1] onMutate: Cancelling queries for sessionId:", sessionId);
        
        // For legacy sessions, optimistically clear concepts
        await queryClient.cancelQueries({
          queryKey: [`/api/content-writer/sessions/${sessionId}`],
        });
        console.log("[STEP 1.3.2] onMutate: Queries cancelled");

        console.log("[STEP 1.3.3] onMutate: Getting previous data from cache");
        const previousData = queryClient.getQueryData([
          `/api/content-writer/sessions/${sessionId}`,
        ]);
        console.log("[STEP 1.3.4] onMutate: Previous data retrieved:", {
          hasData: !!previousData,
          conceptsCount: previousData?.concepts?.length || 0,
          concepts: previousData?.concepts,
          fullData: previousData,
        });

        // Optimistically clear concepts in session data
        console.log("[STEP 1.3.5] onMutate: CALLING setQueryData to clear concepts");
        console.log("[STEP 1.3.5.1] onMutate: Query key:", [`/api/content-writer/sessions/${sessionId}`]);
        
        queryClient.setQueryData(
          [`/api/content-writer/sessions/${sessionId}`],
          (old: any) => {
            console.log("[STEP 1.3.5.2] onMutate: Inside setQueryData updater function");
            console.log("[STEP 1.3.5.3] onMutate: Old data received:", {
              hasOld: !!old,
              oldConceptsCount: old?.concepts?.length || 0,
              oldConcepts: old?.concepts,
            });
            
            if (!old) {
              console.log("[STEP 1.3.5.4] onMutate: No old data, returning as-is");
              return old;
            }
            
            console.log("[STEP 1.3.5.5] onMutate: Creating updated object with empty concepts array");
            const updated = {
              ...old,
              concepts: [], // Clear old concepts immediately
            };
            console.log("[STEP 1.3.5.6] onMutate: Updated object created:", {
              updatedConceptsCount: updated.concepts.length,
              updatedConcepts: updated.concepts,
              otherProps: Object.keys(updated).filter(k => k !== 'concepts'),
            });
            console.log("[STEP 1.3.5.7] onMutate: Returning updated object");
            return updated;
          }
        );
        console.log("[STEP 1.3.6] onMutate: setQueryData call completed");

        // Verify the update
        console.log("[STEP 1.3.7] onMutate: Verifying cache update");
        const afterUpdate = queryClient.getQueryData([
          `/api/content-writer/sessions/${sessionId}`,
        ]);
        console.log("[STEP 1.3.8] onMutate: After update verification:", {
          hasData: !!afterUpdate,
          conceptsCount: afterUpdate?.concepts?.length || 0,
          concepts: afterUpdate?.concepts,
          fullData: afterUpdate,
        });
        console.log("[STEP 1.3.9] onMutate: Concepts cleared?", afterUpdate?.concepts?.length === 0);

        console.log("[STEP 1.3.10] onMutate: Returning previousData for rollback");
        return { previousData };
      }
      console.warn("[STEP 1.4] onMutate: No threadId or sessionId, returning empty context");
      return {};
    },
    onSuccess: (data: any) => {
      console.log("=".repeat(80));
      console.log("[STEP 2] onSuccess: STARTING cache update with new concepts");
      console.log("[STEP 2.1] onSuccess: Received response data:", {
        hasData: !!data,
        hasState: !!data?.state,
        hasConcepts: !!data?.concepts,
        stateConceptsCount: data?.state?.concepts?.length || 0,
        conceptsCount: data?.concepts?.length || 0,
        fullData: data,
      });
      console.log("[STEP 2.2] onSuccess: Current component state:", {
        threadId,
        sessionId,
      });

      // Update cache immediately with response data
      if (data?.state && threadId) {
        console.log("[STEP 2.3] onSuccess: LangGraph path - updating cache");
        console.log("[STEP 2.3.1] onSuccess: New concepts from state:", {
          concepts: data.state.concepts,
          conceptsCount: data.state.concepts?.length || 0,
        });
        
        // LangGraph response
        console.log("[STEP 2.3.2] onSuccess: Building new cache data object");
        const newCacheData = {
            threadId: data.threadId || threadId,
            state: data.state,
            currentStep:
              data.state.metadata?.currentStep || "awaitConceptApproval",
            completed: data.state.status === "completed",
        };
        console.log("[STEP 2.3.3] onSuccess: New cache data built:", {
          threadId: newCacheData.threadId,
          conceptsCount: newCacheData.state.concepts?.length || 0,
          concepts: newCacheData.state.concepts,
          currentStep: newCacheData.currentStep,
          completed: newCacheData.completed,
        });
        
        console.log("[STEP 2.3.4] onSuccess: CALLING setQueryData to INSERT new concepts");
        console.log("[STEP 2.3.4.1] onSuccess: Query key:", ["/api/langgraph/content-writer/status", threadId]);
        console.log("[STEP 2.3.4.2] onSuccess: Setting cache with new concepts:", newCacheData.state.concepts);
        
        queryClient.setQueryData(
          ["/api/langgraph/content-writer/status", threadId],
          newCacheData
        );
        console.log("[STEP 2.3.5] onSuccess: setQueryData call completed");

        // Verify the update
        console.log("[STEP 2.3.6] onSuccess: Verifying cache was updated");
        const afterUpdate = queryClient.getQueryData([
          "/api/langgraph/content-writer/status",
          threadId,
        ]);
        console.log("[STEP 2.3.7] onSuccess: After update verification:", {
          hasData: !!afterUpdate,
          conceptsCount: afterUpdate?.state?.concepts?.length || 0,
          concepts: afterUpdate?.state?.concepts,
          conceptsMatch: JSON.stringify(afterUpdate?.state?.concepts) === JSON.stringify(data.state.concepts),
          fullData: afterUpdate,
        });
        console.log("[STEP 2.3.8] onSuccess: New concepts inserted?", afterUpdate?.state?.concepts?.length > 0);
      } else if (data?.concepts && sessionId) {
        console.log("[STEP 2.4] onSuccess: Legacy path - updating cache");
        console.log("[STEP 2.4.1] onSuccess: New concepts from response:", {
          concepts: data.concepts,
          conceptsCount: data.concepts.length,
        });
        
        // Legacy response - update session data with new concepts
        console.log("[STEP 2.4.2] onSuccess: CALLING setQueryData to INSERT new concepts");
        console.log("[STEP 2.4.2.1] onSuccess: Query key:", [`/api/content-writer/sessions/${sessionId}`]);
        console.log("[STEP 2.4.2.2] onSuccess: New concepts to insert:", data.concepts);
        
        queryClient.setQueryData(
          [`/api/content-writer/sessions/${sessionId}`],
          (old: any) => {
            console.log("[STEP 2.4.2.3] onSuccess: Inside setQueryData updater function");
            console.log("[STEP 2.4.2.4] onSuccess: Old data received:", {
              hasOld: !!old,
              oldConceptsCount: old?.concepts?.length || 0,
              oldConcepts: old?.concepts,
            });
            
            if (!old) {
              console.warn("[STEP 2.4.2.5] onSuccess: No old data in legacy cache!");
              return old;
            }
            
            console.log("[STEP 2.4.2.6] onSuccess: Creating updated object with new concepts");
            const updated = {
              ...old,
              concepts: data.concepts, // Set new concepts from response
            };
            console.log("[STEP 2.4.2.7] onSuccess: Updated object created:", {
              updatedConceptsCount: updated.concepts.length,
              updatedConcepts: updated.concepts,
              conceptsMatch: JSON.stringify(updated.concepts) === JSON.stringify(data.concepts),
              otherProps: Object.keys(updated).filter(k => k !== 'concepts'),
            });
            console.log("[STEP 2.4.2.8] onSuccess: Returning updated object with new concepts");
            return updated;
          }
        );
        console.log("[STEP 2.4.3] onSuccess: setQueryData call completed");

        // Verify the update
        console.log("[STEP 2.4.4] onSuccess: Verifying cache was updated");
        const afterUpdate = queryClient.getQueryData([
          `/api/content-writer/sessions/${sessionId}`,
        ]);
        console.log("[STEP 2.4.5] onSuccess: After update verification:", {
          hasData: !!afterUpdate,
          conceptsCount: afterUpdate?.concepts?.length || 0,
          concepts: afterUpdate?.concepts,
          conceptsMatch: JSON.stringify(afterUpdate?.concepts) === JSON.stringify(data.concepts),
          fullData: afterUpdate,
        });
        console.log("[STEP 2.4.6] onSuccess: New concepts inserted?", afterUpdate?.concepts?.length > 0);
      } else {
        console.warn("[STEP 2.5] onSuccess: No matching condition!", {
          hasState: !!data?.state,
          hasConcepts: !!data?.concepts,
          threadId,
          sessionId,
          dataKeys: data ? Object.keys(data) : [],
        });
      }

      // Clear selected concept since we're regenerating
      console.log("[STEP 2.6] onSuccess: Clearing selected concept state");
      setSelectedConcept(null);
      console.log("[STEP 2.7] onSuccess: Selected concept cleared");

      // Invalidate and refetch to ensure we have the latest data
      if (threadId) {
        console.log("[STEP 2.8] onSuccess: Invalidating LangGraph queries");
        queryClient.invalidateQueries({
          queryKey: ["/api/langgraph/content-writer/status", threadId],
        });
        console.log("[STEP 2.9] onSuccess: Refetching LangGraph queries");
        queryClient.refetchQueries({
          queryKey: ["/api/langgraph/content-writer/status", threadId],
        });
        console.log("[STEP 2.10] onSuccess: LangGraph queries refetched");
      } else if (sessionId) {
        console.log("[STEP 2.11] onSuccess: Invalidating legacy queries");
        queryClient.invalidateQueries({
          queryKey: [`/api/content-writer/sessions/${sessionId}`],
        });
        console.log("[STEP 2.12] onSuccess: Refetching legacy queries");
        queryClient.refetchQueries({
          queryKey: [`/api/content-writer/sessions/${sessionId}`],
        });
        console.log("[STEP 2.13] onSuccess: Legacy queries refetched");
      }

      console.log("[STEP 2.14] onSuccess: Closing dialog");
      setShowRegenerateDialog(false);
      console.log("[STEP 2.15] onSuccess: Clearing feedback text");
      setRegenerateFeedback("");
      console.log("[STEP 2.16] onSuccess: Showing success toast");
      toast({
        title: "Concepts Regenerated",
        description: "New concepts generated based on your feedback",
      });
      console.log("[STEP 2.17] onSuccess: COMPLETED - UI should now show new concepts");
      console.log("=".repeat(80));
    },
    onError: (error: any, variables, context: any) => {
      console.error("[Regenerate Concepts] onError: Error occurred:", error);
      console.error("[Regenerate Concepts] onError: Error details:", {
        message: error?.message,
        stack: error?.stack,
        variables,
        context,
        threadId,
        sessionId,
      });

      // Rollback optimistic update on error
      if (context?.previousData) {
        console.log(
          "[Regenerate Concepts] onError: Rolling back optimistic update"
        );
        if (threadId) {
          console.log(
            "[Regenerate Concepts] onError: Rolling back LangGraph cache"
          );
        queryClient.setQueryData(
          ["/api/langgraph/content-writer/status", threadId],
          context.previousData
          );
        } else if (sessionId) {
          console.log(
            "[Regenerate Concepts] onError: Rolling back legacy cache"
          );
          queryClient.setQueryData(
            [`/api/content-writer/sessions/${sessionId}`],
            context.previousData
          );
        }
      } else {
        console.warn(
          "[Regenerate Concepts] onError: No previousData in context to rollback"
        );
      }

      console.log("[Regenerate Concepts] onError: Showing error toast");
      toast({
        title: "Error",
        description: error?.message || "Failed to regenerate concepts",
        variant: "destructive",
      });
    },
  });

  // Concept feedback mutation
  const conceptFeedbackMutation = useMutation({
    mutationFn: async ({
      conceptId,
      rating,
    }: {
      conceptId: string;
      rating: "thumbs_up" | "thumbs_down";
    }) => {
      const concept = concepts.find((c) => c.id === conceptId);
      const guidelineId =
        typeof brandGuidelines === "string" && brandGuidelines
          ? brandGuidelines
          : session?.guidelineProfileId;
      return apiRequest("POST", "/api/content-feedback", {
        toolType: "content-writer",
        rating,
        feedbackText: null,
        inputData: { topic, brandGuidelineId: guidelineId },
        outputData: { concept },
        guidelineProfileId: guidelineId || null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Feedback Submitted",
        description: "Thank you! Your feedback helps improve future concepts.",
      });
    },
  });

  // Choose concept mutation
  const chooseConceptMutation = useMutation({
    mutationFn: async ({
      conceptId,
      rating,
      feedbackText,
    }: {
      conceptId: string;
      rating?: string;
      feedbackText?: string;
    }) => {
      await apiRequest(
        "PATCH",
        `/api/content-writer/sessions/${sessionId}/concepts/${conceptId}`,
        {
          userAction: "chosen",
          rating,
          feedbackText,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/content-writer/sessions/${sessionId}`],
      });
      setStage("subtopics");
      setSelectingConceptId(null);
    },
  });

  // Generate subtopics mutation
  const generateSubtopicsMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) {
        throw new Error(
          "Session ID is required. Please start a session first."
        );
      }
      const res = await apiRequest(
        "POST",
        `/api/content-writer/sessions/${sessionId}/subtopics`,
        {
          objective,
          internalLinks: internalLinks
            .split(",")
            .map((l) => l.trim())
            .filter(Boolean),
          targetLength: parseInt(targetLength),
          toneOfVoice,
          language,
          useBrandGuidelines,
          selectedTargetAudiences,
          matchStyle,
        }
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/content-writer/sessions/${sessionId}`],
      });
      // Ensure we're on the subtopics stage after generating subtopics
      setStage("subtopics");
      toast({
        title: "Subtopics Generated",
        description: "Select the subtopics to include in your article",
      });
    },
    onError: (error: any) => {
      console.error("Error generating subtopics:", error);
      toast({
        title: "Error Generating Subtopics",
        description:
          error?.message || "Failed to generate subtopics. Please try again.",
        variant: "destructive",
      });
    },
    retry: false,
  });

  // Request more subtopics mutation
  const moreSubtopicsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/content-writer/sessions/${sessionId}/subtopics/more`,
        {
          matchStyle,
        }
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/content-writer/sessions/${sessionId}`],
      });
      toast({
        title: "More Subtopics Added",
        description: "5 additional subtopics generated",
      });
    },
  });

  // Subtopic feedback mutation
  const subtopicFeedbackMutation = useMutation({
    mutationFn: async ({
      subtopicId,
      rating,
    }: {
      subtopicId: string;
      rating: "thumbs_up" | "thumbs_down";
    }) => {
      const subtopic = subtopics.find((s) => s.id === subtopicId);
      const guidelineId =
        typeof brandGuidelines === "string" && brandGuidelines
          ? brandGuidelines
          : session?.guidelineProfileId;
      return apiRequest("POST", "/api/content-feedback", {
        toolType: "content-writer",
        rating,
        feedbackText: null,
        inputData: {
          topic,
          conceptId: selectedConcept?.id,
          brandGuidelineId: guidelineId,
        },
        outputData: { subtopic },
        guidelineProfileId: guidelineId || null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Feedback Submitted",
        description: "Thank you! Your feedback helps improve future subtopics.",
      });
    },
  });

  // Toggle subtopic selection
  const toggleSubtopicMutation = useMutation({
    mutationFn: async ({
      subtopicId,
      isSelected,
    }: {
      subtopicId: string;
      isSelected: boolean;
    }) => {
      await apiRequest(
        "PATCH",
        `/api/content-writer/sessions/${sessionId}/subtopics/${subtopicId}`,
        {
          isSelected,
        }
      );
    },
    onSuccess: (_, variables) => {
      if (variables.isSelected) {
        setSelectedSubtopics((prev) => new Set(prev).add(variables.subtopicId));
      } else {
        setSelectedSubtopics((prev) => {
          const next = new Set(prev);
          next.delete(variables.subtopicId);
          return next;
        });
      }
      queryClient.invalidateQueries({
        queryKey: [`/api/content-writer/sessions/${sessionId}`],
      });
    },
  });

  // Generate article mutation
  const generateArticleMutation = useMutation({
    mutationFn: async () => {
      setShowGenerationDialog(true);
      const res = await apiRequest(
        "POST",
        `/api/content-writer/sessions/${sessionId}/generate`,
        {
          matchStyle,
        }
      );
      return await res.json();
    },
    onSuccess: () => {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setShowGenerationDialog(false);
        queryClient.invalidateQueries({
          queryKey: [`/api/content-writer/sessions/${sessionId}`],
        });
        setStage("article");
        toast({
          title: "Article Generated",
          description: "Your article is ready!",
        });
      }
    },
    onError: () => {
      // Close dialog and show error if component is still mounted
      if (isMountedRef.current) {
        setShowGenerationDialog(false);
        toast({
          title: "Error",
          description: "Failed to generate article. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleStartSession = () => {
    if (!topic.trim()) {
      toast({
        title: "Missing Topic",
        description: "Please enter a topic for your article",
        variant: "destructive",
      });
      return;
    }
    setShowResumeBanner(false);
    createSessionMutation.mutate();
  };

  const handleResumeThread = () => {
    if (!incompleteThread) return;

    setShowResumeBanner(false);
    setThreadId(incompleteThread.threadId);
    setSessionId(incompleteThread.sessionId);

    // Set topic from thread metadata if available
    if (incompleteThread.metadata?.topic) {
      setTopic(incompleteThread.metadata.topic);
    }

    // Determine stage based on current step
    const step = incompleteThread.metadata?.currentStep;
    if (step === "generateConcepts" || step === "concepts") {
      setStage("concepts");
    } else if (step === "generateSubtopics" || step === "subtopics") {
      setStage("subtopics");
    } else if (step === "generateArticle" || step === "article") {
      setStage("article");
    }

    toast({
      title: "Workflow Resumed",
      description: "Continuing where you left off",
    });
  };

  const handleStartNewThread = () => {
    setShowResumeBanner(false);
    setIncompleteThread(null);
  };

  const handleChooseConcept = (concept: Concept) => {
    setSelectedConcept(concept);
    setSelectingConceptId(concept.id);

    if (threadId) {
      // Use LangGraph resume with selected concept
      resumeWorkflowMutation.mutate({
        threadId,
        selectedConceptId: concept.id,
      });
    } else {
      // Fallback to legacy method
      chooseConceptMutation.mutate({
        conceptId: concept.id,
        rating: "thumbs_up",
      });
    }
  };

  const getDisabledReason = (): string | null => {
    const hasSelectedConcept =
      selectedConcept ||
      (session?.selectedConceptId &&
        concepts.find((c) => c.id === session.selectedConceptId));
    if (!sessionId && !hasSelectedConcept) {
      return "Please start a session first by generating concepts and select a concept";
    }
    if (!sessionId) {
      return "Please start a session first by generating concepts";
    }
    if (!hasSelectedConcept) {
      return "Please select a concept first";
    }
    return null;
  };

  const handleGenerateSubtopics = () => {
    if (!sessionId) {
      toast({
        title: "Session Required",
        description: "Please start a session first by generating concepts.",
        variant: "destructive",
      });
      return;
    }

    // Check both local state and session state for selected concept
    const selectedConceptId = selectedConcept?.id || session?.selectedConceptId;
    const hasSelectedConcept =
      selectedConcept ||
      (session?.selectedConceptId &&
        concepts.find((c) => c.id === session.selectedConceptId));

    if (!hasSelectedConcept || !selectedConceptId) {
      toast({
        title: "Concept Required",
        description: "Please select a concept first.",
        variant: "destructive",
      });
      return;
    }

    // Ensure selectedConcept state is set if it's in the session but not in local state
    if (!selectedConcept && session?.selectedConceptId) {
      const conceptFromSession = concepts.find(
        (c) => c.id === session.selectedConceptId
      );
      if (conceptFromSession) {
        setSelectedConcept(conceptFromSession);
      }
    }

    generateSubtopicsMutation.mutate();
  };

  const handleToggleSubtopic = (subtopicId: string, isSelected: boolean) => {
    toggleSubtopicMutation.mutate({ subtopicId, isSelected });
  };

  const handleGenerateArticle = () => {
    const selectedIds = Array.from(selectedSubtopics);
    if (selectedIds.length === 0) {
      toast({
        title: "No Subtopics Selected",
        description: "Please select at least one subtopic",
        variant: "destructive",
      });
      return;
    }

    if (threadId) {
      // Use LangGraph resume with selected subtopics
      resumeWorkflowMutation.mutate({
        threadId,
        selectedSubtopicIds: selectedIds,
      });
    } else {
      // Fallback to legacy method
      generateArticleMutation.mutate();
    }
  };

  const handleCopyArticle = () => {
    if (draft?.finalArticle) {
      navigator.clipboard.writeText(draft.finalArticle);
      toast({
        title: "Copied",
        description: "Article copied to clipboard",
      });
    }
  };

  const handleDownloadArticle = () => {
    if (draft?.finalArticle) {
      const blob = new Blob([draft.finalArticle], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${topic.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const renderTopicStage = () => (
    <Card data-testid="card-topic-input">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Content Writer v2
        </CardTitle>
        <CardDescription>
          Create comprehensive, well-structured articles with AI assistance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="topic">
            Article Topic <span className="text-red-500">*</span>
          </Label>
          <Input
            id="topic"
            data-testid="input-topic"
            placeholder="e.g., Benefits of Cloud Computing for Small Businesses"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        <div>
          <Label>Brand Guidelines (Optional)</Label>
          <GuidelineProfileSelector
            value={brandGuidelines}
            onChange={setBrandGuidelines}
            type="brand"
          />
        </div>

        {brandGuidelines && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
              <Checkbox
                id="matchStyle"
                data-testid="checkbox-match-style"
                checked={matchStyle}
                onCheckedChange={(checked) => setMatchStyle(checked === true)}
              />
              <Label
                htmlFor="matchStyle"
                className="text-sm font-normal cursor-pointer"
              >
                Match brand's writing style and tone
              </Label>
            </div>

            {matchStyle && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <Label className="text-sm font-medium">
                  Style Matching Method
                </Label>
                <RadioGroup
                  value={styleMatchingMethod}
                  onValueChange={(value: "continuous" | "end-rewrite") =>
                    setStyleMatchingMethod(value)
                  }
                  data-testid="radio-style-method"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="continuous"
                      id="continuous"
                      data-testid="radio-continuous"
                    />
                    <Label
                      htmlFor="continuous"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Continuous (apply style throughout generation)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="end-rewrite"
                      id="end-rewrite"
                      data-testid="radio-end-rewrite"
                    />
                    <Label
                      htmlFor="end-rewrite"
                      className="text-sm font-normal cursor-pointer"
                    >
                      End Rewrite (analyze brand style, then rewrite at end)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={handleStartSession}
          disabled={createSessionMutation.isPending}
          className="w-full"
          data-testid="button-start"
        >
          {createSessionMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Concepts...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Article Concepts
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );

  const renderConceptsStage = () => (
    <div className="space-y-4">
      {currentStep === "awaitConceptApproval" && (
        <Alert data-testid="alert-approval-required">
          <AlertDescription className="flex items-center gap-2">
            <Badge variant="default" className="mr-2">
              Approval Required
            </Badge>
            Workflow paused. Please select a concept to continue with article
            generation.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Clear cache for previous session/thread
                  if (threadId) {
                    queryClient.removeQueries({
                      queryKey: [
                        "/api/langgraph/content-writer/status",
                        threadId,
                      ],
                    });
                  }
                  if (sessionId) {
                    queryClient.removeQueries({
                      queryKey: [`/api/content-writer/sessions/${sessionId}`],
                    });
                  }

                  setStage("topic");
                  setSessionId(null);
                  setThreadId(null);
                  sessionCreatedAtRef.current = null;
                  setSelectedConcept(null);
                }}
                data-testid="button-back-to-topic"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <div>
                <CardTitle>Choose Your Article Concept</CardTitle>
                <CardDescription>Topic: {topic}</CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRegenerateDialog(!showRegenerateDialog)}
              data-testid="button-regenerate-concepts"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate All
            </Button>
          </div>
        </CardHeader>
        {showRegenerateDialog && (
          <CardContent className="border-t pt-4">
            <div className="space-y-3">
              <Label>Why regenerate? (Optional)</Label>
              <Textarea
                placeholder="e.g., Focus more on technical aspects, make it more beginner-friendly..."
                value={regenerateFeedback}
                onChange={(e) => setRegenerateFeedback(e.target.value)}
                data-testid="textarea-regenerate-feedback"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    // Force log to ensure it's visible - using debugLog so it won't be stripped
                    debugLog("🟢🟢🟢 [Regenerate Concepts] BUTTON CLICKED - THIS SHOULD BE VISIBLE");
                    debugLog(
                      "[Regenerate Concepts] Button clicked - starting mutation",
                      {
                        threadId,
                        sessionId,
                        currentConceptsCount: concepts.length,
                        currentConcepts: concepts,
                        regenerateFeedback,
                        matchStyle,
                      }
                    );
                    debugLog("🟢 [Regenerate Concepts] About to call mutate()");
                    regenerateConceptsMutation.mutate();
                    debugLog("🟢 [Regenerate Concepts] mutate() called");
                  }}
                  disabled={regenerateConceptsMutation.isPending}
                  data-testid="button-confirm-regenerate"
                >
                  {regenerateConceptsMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    "Regenerate"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRegenerateDialog(false);
                    setRegenerateFeedback("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="grid gap-3">
        {concepts.map((concept) => (
          <Card
            key={concept.id}
            className="cursor-pointer hover:border-primary transition-colors"
            data-testid={`card-concept-${concept.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">
                    {concept.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {concept.summary}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-gray-400">
                      Was this helpful?
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        conceptFeedbackMutation.mutate({
                          conceptId: concept.id,
                          rating: "thumbs_up",
                        })
                      }
                      disabled={conceptFeedbackMutation.isPending}
                      className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-gray-800"
                      data-testid={`button-concept-thumbs-up-${concept.id}`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        conceptFeedbackMutation.mutate({
                          conceptId: concept.id,
                          rating: "thumbs_down",
                        })
                      }
                      disabled={conceptFeedbackMutation.isPending}
                      className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-gray-800"
                      data-testid={`button-concept-thumbs-down-${concept.id}`}
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={() => handleChooseConcept(concept)}
                  disabled={
                    selectingConceptId === concept.id ||
                    chooseConceptMutation.isPending ||
                    resumeWorkflowMutation.isPending
                  }
                  data-testid={`button-choose-concept-${concept.id}`}
                >
                  {selectingConceptId === concept.id ||
                  chooseConceptMutation.isPending ||
                  resumeWorkflowMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Selecting...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Choose This
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderSubtopicsStage = () => {
    const hasGeneratedSubtopics = subtopics.length > 0;

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStage("concepts");
                  setSelectedConcept(null);
                }}
                data-testid="button-back-to-concepts"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <CardTitle>Configure Your Article</CardTitle>
            </div>
            <CardDescription>
              Selected Concept:{" "}
              {selectedConcept?.title ||
                concepts.find((c) => c.id === session?.selectedConceptId)
                  ?.title ||
                "(required)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="objective">Article Objective</Label>
              <Input
                id="objective"
                data-testid="input-objective"
                placeholder="e.g., Educate readers about cloud benefits and encourage adoption"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                disabled={hasGeneratedSubtopics}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="targetLength">Target Length (words)</Label>
                <Input
                  id="targetLength"
                  data-testid="input-target-length"
                  type="number"
                  value={targetLength}
                  onChange={(e) => setTargetLength(e.target.value)}
                  disabled={hasGeneratedSubtopics}
                />
              </div>
              <div>
                <Label htmlFor="language">Language & Variant</Label>
                <Select
                  value={language}
                  onValueChange={setLanguage}
                  disabled={hasGeneratedSubtopics}
                >
                  <SelectTrigger data-testid="select-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="en-GB">English (UK)</SelectItem>
                    <SelectItem value="en-AU">English (Australian)</SelectItem>
                    <SelectItem value="en-CA">English (Canadian)</SelectItem>
                    <SelectItem value="es-ES">Spanish (Spain)</SelectItem>
                    <SelectItem value="es-MX">Spanish (Mexico)</SelectItem>
                    <SelectItem value="es-AR">Spanish (Argentina)</SelectItem>
                    <SelectItem value="fr-FR">French (France)</SelectItem>
                    <SelectItem value="fr-CA">French (Canadian)</SelectItem>
                    <SelectItem value="de-DE">German (Germany)</SelectItem>
                    <SelectItem value="de-AT">German (Austria)</SelectItem>
                    <SelectItem value="de-CH">German (Switzerland)</SelectItem>
                    <SelectItem value="pt-PT">Portuguese (Portugal)</SelectItem>
                    <SelectItem value="pt-BR">Portuguese (Brazil)</SelectItem>
                    <SelectItem value="it-IT">Italian</SelectItem>
                    <SelectItem value="nl-NL">Dutch</SelectItem>
                    <SelectItem value="pl-PL">Polish</SelectItem>
                    <SelectItem value="ru-RU">Russian</SelectItem>
                    <SelectItem value="ja-JP">Japanese</SelectItem>
                    <SelectItem value="zh-CN">Chinese (Simplified)</SelectItem>
                    <SelectItem value="zh-TW">Chinese (Traditional)</SelectItem>
                    <SelectItem value="ko-KR">Korean</SelectItem>
                    <SelectItem value="ar-SA">Arabic</SelectItem>
                    <SelectItem value="hi-IN">Hindi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="toneOfVoice">Tone of Voice</Label>
              <Input
                id="toneOfVoice"
                data-testid="input-tone"
                placeholder="e.g., Professional, friendly, technical"
                value={toneOfVoice}
                onChange={(e) => setToneOfVoice(e.target.value)}
                disabled={hasGeneratedSubtopics}
              />
            </div>

            <div>
              <Label htmlFor="internalLinks">
                Internal Links (comma-separated URLs)
              </Label>
              <Input
                id="internalLinks"
                data-testid="input-internal-links"
                placeholder="https://example.com/page1, https://example.com/page2"
                value={internalLinks}
                onChange={(e) => setInternalLinks(e.target.value)}
                disabled={hasGeneratedSubtopics}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="useBrandGuidelines"
                data-testid="checkbox-brand-guidelines"
                checked={useBrandGuidelines}
                onCheckedChange={(checked) =>
                  setUseBrandGuidelines(checked === true)
                }
                disabled={hasGeneratedSubtopics || !brandGuidelines}
              />
              <Label htmlFor="useBrandGuidelines">Apply Brand Guidelines</Label>
            </div>

            <div>
              <Label htmlFor="targetAudience">Target Audience</Label>
              <Select
                value={
                  Array.isArray(selectedTargetAudiences)
                    ? "custom"
                    : selectedTargetAudiences
                }
                onValueChange={(value) => {
                  if (value === "all" || value === "none") {
                    setSelectedTargetAudiences(value);
                  }
                }}
                disabled={hasGeneratedSubtopics}
              >
                <SelectTrigger data-testid="select-target-audience">
                  <SelectValue placeholder="Select target audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    Generic (No specific audience)
                  </SelectItem>
                  <SelectItem value="all">All Brand Audiences</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedTargetAudiences === "none" &&
                  "Article will be written for a general audience"}
                {selectedTargetAudiences === "all" &&
                  "Article will target all audiences from brand guidelines"}
              </p>
            </div>

            {!hasGeneratedSubtopics && (
              <TooltipProvider>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <div className="w-full">
                      <Button
                        onClick={handleGenerateSubtopics}
                        disabled={
                          generateSubtopicsMutation.isPending ||
                          !sessionId ||
                          (!selectedConcept && !session?.selectedConceptId)
                        }
                        className="w-full"
                        data-testid="button-generate-subtopics"
                      >
                        {generateSubtopicsMutation.isPending &&
                        sessionId &&
                        (selectedConcept || session?.selectedConceptId) ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating Subtopics...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Subtopics
                          </>
                        )}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {(!sessionId ||
                    (!selectedConcept && !session?.selectedConceptId)) &&
                    getDisabledReason() && (
                      <TooltipContent side="top">
                        <p>{getDisabledReason()}</p>
                      </TooltipContent>
                    )}
                </Tooltip>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>

        {hasGeneratedSubtopics && (
          <>
            {currentStep === "awaitSubtopicApproval" && (
              <Alert data-testid="alert-subtopic-approval-required">
                <AlertDescription className="flex items-center gap-2">
                  <Badge variant="default" className="mr-2">
                    Approval Required
                  </Badge>
                  Workflow paused. Please select at least one subtopic and click
                  "Generate Complete Article" to continue.
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Select Subtopics</CardTitle>
                    <CardDescription>
                      {selectedSubtopics.size} selected
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moreSubtopicsMutation.mutate()}
                    disabled={moreSubtopicsMutation.isPending}
                    data-testid="button-more-subtopics"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Request More
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {subtopics.map((subtopic) => (
                    <div
                      key={subtopic.id}
                      className="flex items-start gap-3 p-3 border rounded-lg"
                      data-testid={`subtopic-${subtopic.id}`}
                    >
                      <Checkbox
                        checked={
                          selectedSubtopics.has(subtopic.id) ||
                          subtopic.isSelected
                        }
                        onCheckedChange={(checked) =>
                          handleToggleSubtopic(subtopic.id, checked === true)
                        }
                        data-testid={`checkbox-subtopic-${subtopic.id}`}
                      />
                      <div className="flex-1">
                        <h4 className="font-medium">{subtopic.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {subtopic.summary}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-400">
                            Was this helpful?
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              subtopicFeedbackMutation.mutate({
                                subtopicId: subtopic.id,
                                rating: "thumbs_up",
                              })
                            }
                            disabled={subtopicFeedbackMutation.isPending}
                            className="h-6 px-2 text-green-400 hover:text-green-300 hover:bg-gray-800"
                            data-testid={`button-subtopic-thumbs-up-${subtopic.id}`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              subtopicFeedbackMutation.mutate({
                                subtopicId: subtopic.id,
                                rating: "thumbs_down",
                              })
                            }
                            disabled={subtopicFeedbackMutation.isPending}
                            className="h-6 px-2 text-red-400 hover:text-red-300 hover:bg-gray-800"
                            data-testid={`button-subtopic-thumbs-down-${subtopic.id}`}
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleGenerateArticle}
              disabled={
                generateArticleMutation.isPending ||
                selectedSubtopics.size === 0
              }
              className="w-full"
              size="lg"
              data-testid="button-generate-article"
            >
              {generateArticleMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Article...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Complete Article
                </>
              )}
            </Button>
          </>
        )}
      </div>
    );
  };

  // Helper function to get score styling
  const getScoreStyle = (score: number) => {
    if (score >= 80) {
      return {
        color: "bg-green-500",
        icon: CheckCircle,
        variant: "default" as const,
        textColor: "text-green-500",
      };
    } else if (score >= 70) {
      return {
        color: "bg-yellow-500",
        icon: AlertTriangle,
        variant: "default" as const,
        textColor: "text-yellow-500",
      };
    } else {
      return {
        color: "bg-red-500",
        icon: XCircle,
        variant: "destructive" as const,
        textColor: "text-red-500",
      };
    }
  };

  const renderArticleStage = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStage("subtopics")}
                data-testid="button-back-to-subtopics"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <div>
                <CardTitle>Your Article is Ready!</CardTitle>
                <CardDescription>
                  {draft?.metadata?.wordCount || 0} words
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyArticle}
                data-testid="button-copy-article"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadArticle}
                data-testid="button-download-article"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm">
              {draft?.finalArticle}
            </pre>
          </div>

          <Separator />

          {/* Quality Analysis Section */}
          {(threadState?.brandScore !== undefined ||
            threadState?.factScore !== undefined ||
            draft?.brandScore !== undefined ||
            draft?.factScore !== undefined ||
            threadState?.metadata?.brandIssues?.length ||
            threadState?.metadata?.factIssues?.length ||
            (threadState?.metadata?.regenerationCount &&
              threadState.metadata.regenerationCount > 0)) && (
            <Card data-testid="card-quality-analysis">
              <CardHeader>
                <CardTitle>Quality Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Score Badges */}
                <div className="flex flex-wrap gap-3">
                  {/* Brand Consistency Score */}
                  {(threadState?.brandScore !== undefined ||
                    draft?.brandScore !== undefined) &&
                    (() => {
                      const score =
                        threadState?.brandScore ?? draft?.brandScore ?? 0;
                      const style = getScoreStyle(score);
                      const Icon = style.icon;
                      return (
                        <div
                          className="flex items-center gap-2"
                          data-testid="score-brand-consistency"
                        >
                          <span className="text-sm font-medium">
                            Brand Consistency:
                          </span>
                          <Badge
                            className={`${style.color} text-white flex items-center gap-1`}
                            data-testid="badge-brand-score"
                          >
                            <Icon className="w-3 h-3" />
                            {score}
                          </Badge>
                        </div>
                      );
                    })()}

                  {/* Fact Verification Score */}
                  {(threadState?.factScore !== undefined ||
                    draft?.factScore !== undefined) &&
                    (() => {
                      const score =
                        threadState?.factScore ?? draft?.factScore ?? 0;
                      const style = getScoreStyle(score);
                      const Icon = style.icon;
                      return (
                        <div
                          className="flex items-center gap-2"
                          data-testid="score-fact-verification"
                        >
                          <span className="text-sm font-medium">
                            Fact Verification:
                          </span>
                          <Badge
                            className={`${style.color} text-white flex items-center gap-1`}
                            data-testid="badge-fact-score"
                          >
                            <Icon className="w-3 h-3" />
                            {score}
                          </Badge>
                        </div>
                      );
                    })()}

                  {/* Regeneration Count */}
                  {threadState?.metadata?.regenerationCount !== undefined &&
                    threadState.metadata.regenerationCount > 0 && (
                      <div
                        className="flex items-center gap-2"
                        data-testid="regeneration-count"
                      >
                        <Badge
                          variant="secondary"
                          data-testid="badge-regeneration-count"
                        >
                          Regenerated {threadState.metadata.regenerationCount}{" "}
                          {threadState.metadata.regenerationCount === 1
                            ? "time"
                            : "times"}
                        </Badge>
                      </div>
                    )}
                </div>

                {/* Issues Lists */}
                <div className="space-y-3">
                  {/* Brand Issues */}
                  {threadState?.metadata?.brandIssues &&
                    threadState.metadata.brandIssues.length > 0 && (
                      <Collapsible data-testid="collapsible-brand-issues">
                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded-md transition-colors">
                          <ChevronDown className="w-4 h-4" />
                          <span className="font-medium text-sm">
                            Brand Issues (
                            {threadState.metadata.brandIssues.length}{" "}
                            {threadState.metadata.brandIssues.length === 1
                              ? "issue"
                              : "issues"}
                            )
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent
                          className="mt-2 ml-6 space-y-1"
                          data-testid="content-brand-issues"
                        >
                          {threadState.metadata.brandIssues.map(
                            (issue, index) => (
                              <div
                                key={index}
                                className="text-sm text-muted-foreground flex items-start gap-2"
                                data-testid={`brand-issue-${index}`}
                              >
                                <span className="mt-1">•</span>
                                <span>{issue}</span>
                              </div>
                            )
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                  {/* Fact Issues */}
                  {threadState?.metadata?.factIssues &&
                    threadState.metadata.factIssues.length > 0 && (
                      <Collapsible data-testid="collapsible-fact-issues">
                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded-md transition-colors">
                          <ChevronDown className="w-4 h-4" />
                          <span className="font-medium text-sm">
                            Fact Issues (
                            {threadState.metadata.factIssues.length}{" "}
                            {threadState.metadata.factIssues.length === 1
                              ? "issue"
                              : "issues"}
                            )
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent
                          className="mt-2 ml-6 space-y-1"
                          data-testid="content-fact-issues"
                        >
                          {threadState.metadata.factIssues.map(
                            (issue, index) => (
                              <div
                                key={index}
                                className="text-sm text-muted-foreground flex items-start gap-2"
                                data-testid={`fact-issue-${index}`}
                              >
                                <span className="mt-1">•</span>
                                <span>{issue}</span>
                              </div>
                            )
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                </div>
              </CardContent>
            </Card>
          )}

          {draft && (
            <FeedbackButtons
              toolType="content-writer"
              inputData={{
                topic,
                objective,
                targetLength,
                toneOfVoice,
                language,
                internalLinks: internalLinks
                  ? internalLinks.split(",").map((l) => l.trim())
                  : [],
                useBrandGuidelines,
                selectedTargetAudiences,
              }}
              outputData={{
                finalArticle: draft.finalArticle,
                metadata: draft.metadata,
              }}
              guidelineProfileId={
                typeof brandGuidelines === "string" && brandGuidelines
                  ? brandGuidelines
                  : undefined
              }
            />
          )}
        </CardContent>
      </Card>

      <Button
        variant="outline"
        onClick={() => {
          // Clear cache for previous session/thread
          if (threadId) {
            queryClient.removeQueries({
              queryKey: ["/api/langgraph/content-writer/status", threadId],
            });
          }
          if (sessionId) {
            queryClient.removeQueries({
              queryKey: [`/api/content-writer/sessions/${sessionId}`],
            });
          }

          // Reset all local state
          setSessionId(null);
          setThreadId(null);
          setStage("topic");
          setTopic("");
          setBrandGuidelines("");
          setSelectedConcept(null);
          sessionCreatedAtRef.current = null;
          setSelectedSubtopics(new Set());
          setObjective("");
          setTargetLength("1000");
          setToneOfVoice("");
          setLanguage("en-US");
          setInternalLinks("");
        }}
        className="w-full"
        data-testid="button-create-another"
      >
        Create Another Article
      </Button>
    </div>
  );

  return (
    <AccessGuard productId={productId} productName="Content Writer v2">
      <div className="container max-w-5xl mx-auto p-6">
        {/* Resume Banner */}
        {showResumeBanner && incompleteThread && (
          <Alert className="mb-6" data-testid="alert-resume-banner">
            <Sparkles className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <p className="font-medium">Resume where you left off?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You have an incomplete article: "
                  {incompleteThread.metadata?.topic ||
                    incompleteThread.session?.topic}
                  "
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleResumeThread}
                  size="sm"
                  data-testid="button-resume-workflow"
                >
                  Resume
                </Button>
                <Button
                  variant="outline"
                  onClick={handleStartNewThread}
                  size="sm"
                  data-testid="button-start-new"
                >
                  Start New
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Progress indicator */}
        {(sessionId || threadId) && (
          <div className="mb-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {(["concepts", "subtopics", "article"] as const).map(
                    (s, i) => {
                      const stepMap: Record<string, string> = {
                        generateConcepts: "concepts",
                        generateSubtopics: "subtopics",
                        generateArticle: "article",
                      };
                      const currentStepMapped = currentStep
                        ? stepMap[currentStep] || currentStep
                        : undefined;
                      const isActive = stage === s || currentStepMapped === s;
                      const isPast =
                        ["concepts", "subtopics", "article"].indexOf(stage) > i;

                      return (
                        <Badge
                          key={s}
                          variant={
                            isActive
                              ? "default"
                              : isPast
                              ? "secondary"
                              : "outline"
                          }
                          className="capitalize"
                          data-testid={`badge-step-${s}`}
                        >
                          {isActive && (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          )}
                          {isPast && <Check className="w-3 h-3 mr-1" />}
                          {i + 1}. {s}
                        </Badge>
                      );
                    }
                  )}
                </div>
                {threadId && (
                  <Badge variant="outline" className="text-xs">
                    Thread: {threadId.slice(0, 8)}...
                  </Badge>
                )}
              </div>
              {threadId && !isThreadCompleted && (
                <Progress
                  value={
                    currentStep === "generateConcepts" || stage === "concepts"
                      ? 33
                      : currentStep === "generateSubtopics" ||
                        stage === "subtopics"
                      ? 66
                      : currentStep === "generateArticle" || stage === "article"
                      ? 100
                      : 0
                  }
                  className="h-2"
                />
              )}
            </div>
          </div>
        )}

        {/* Content */}
        {stage === "topic" && renderTopicStage()}
        {stage === "concepts" && renderConceptsStage()}
        {stage === "subtopics" && renderSubtopicsStage()}
        {stage === "article" && renderArticleStage()}

        {/* Article Generation Dialog */}
        <AlertDialog
          open={showGenerationDialog}
          onOpenChange={setShowGenerationDialog}
        >
          <AlertDialogContent data-testid="dialog-article-generating">
            <AlertDialogHeader>
              <AlertDialogTitle>Article Being Generated</AlertDialogTitle>
              <AlertDialogDescription>
                Your article is being generated. We'll notify you when it's
                ready. You can navigate away from this page and check your
                notifications.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button
                onClick={() => {
                  setShowGenerationDialog(false);
                  setLocation("/app");
                }}
                data-testid="button-go-to-dashboard"
              >
                Go to Dashboard
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AccessGuard>
  );
}
