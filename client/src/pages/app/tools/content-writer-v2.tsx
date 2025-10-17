import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccessGuard } from "@/components/access-guard";
import { Sparkles, RefreshCw, ChevronRight, ChevronLeft, Save, ThumbsUp, ThumbsDown, Check, X, Download, Copy, Plus, Loader2 } from "lucide-react";
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
}

interface Session {
  id: string;
  userId: string;
  topic: string;
  guidelineProfileId?: string;
  selectedConceptId?: string;
  status: 'concepts' | 'subtopics' | 'generating' | 'completed';
  objective?: string;
  targetLength?: number;
  toneOfVoice?: string;
  language?: string;
  internalLinks?: string[];
  useBrandGuidelines?: boolean;
}

type Stage = 'topic' | 'concepts' | 'subtopics' | 'article';

export default function ContentWriterV2() {
  const [stage, setStage] = useState<Stage>('topic');
  const [topic, setTopic] = useState("");
  const [brandGuidelines, setBrandGuidelines] = useState<GuidelineContent | string>('');
  const [objective, setObjective] = useState("");
  const [targetLength, setTargetLength] = useState("1000");
  const [toneOfVoice, setToneOfVoice] = useState("");
  const [language, setLanguage] = useState("en-US");
  const [internalLinks, setInternalLinks] = useState("");
  const [useBrandGuidelines, setUseBrandGuidelines] = useState(true);
  const [selectedTargetAudiences, setSelectedTargetAudiences] = useState<"all" | "none" | number[]>("none");
  const [matchStyle, setMatchStyle] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [regenerateFeedback, setRegenerateFeedback] = useState("");
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [selectedSubtopics, setSelectedSubtopics] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();
  const { selectedBrand } = useBrand();

  const productId = "content-writer-v2"; // TODO: Add to products table

  // Auto-populate from selected brand
  useEffect(() => {
    if (selectedBrand) {
      setBrandGuidelines(selectedBrand.id);
    } else {
      setBrandGuidelines('');
    }
  }, [selectedBrand]);

  // Fetch session data
  const { data: sessionData, isLoading: isSessionLoading } = useQuery({
    queryKey: [`/api/content-writer/sessions/${sessionId}`],
    enabled: !!sessionId,
  });

  const session = (sessionData as any)?.session as Session | undefined;
  const concepts = ((sessionData as any)?.concepts || []) as Concept[];
  const subtopics = ((sessionData as any)?.subtopics || []) as Subtopic[];
  const draft = (sessionData as any)?.draft as Draft | undefined;

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/content-writer/sessions', {
        topic,
        guidelineProfileId: (typeof brandGuidelines === 'string' && brandGuidelines) ? brandGuidelines : undefined,
        matchStyle,
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      console.log("Session creation response:", data);
      if (!data || !data.session || !data.session.id) {
        console.error("Invalid session response:", data);
        toast({
          title: "Error",
          description: "Invalid response from server",
          variant: "destructive",
        });
        return;
      }
      setSessionId(data.session.id);
      setStage('concepts');
      toast({
        title: "Concepts Generated",
        description: "Review the article concepts below",
      });
    },
    onError: (error: any) => {
      console.error("Concept generation error:", error);
      const errorMessage = error?.message || "Failed to generate concepts";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Regenerate concepts mutation
  const regenerateConceptsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/content-writer/sessions/${sessionId}/regenerate`, {
        feedbackText: regenerateFeedback,
        matchStyle,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/content-writer/sessions/${sessionId}`] });
      setShowRegenerateDialog(false);
      setRegenerateFeedback("");
      toast({
        title: "Concepts Regenerated",
        description: "New concepts generated based on your feedback",
      });
    },
  });

  // Concept feedback mutation
  const conceptFeedbackMutation = useMutation({
    mutationFn: async ({ conceptId, rating }: { conceptId: string, rating: 'thumbs_up' | 'thumbs_down' }) => {
      const concept = concepts.find(c => c.id === conceptId);
      const guidelineId = (typeof brandGuidelines === 'string' && brandGuidelines) ? brandGuidelines : session?.guidelineProfileId;
      return apiRequest('POST', '/api/content-feedback', {
        toolType: 'content-writer',
        rating,
        feedbackText: null,
        inputData: { topic, brandGuidelineId: guidelineId },
        outputData: { concept },
        guidelineProfileId: guidelineId || null,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Feedback Submitted',
        description: 'Thank you! Your feedback helps improve future concepts.',
      });
    },
  });

  // Choose concept mutation
  const chooseConceptMutation = useMutation({
    mutationFn: async ({ conceptId, rating, feedbackText }: { conceptId: string, rating?: string, feedbackText?: string }) => {
      await apiRequest('PATCH', `/api/content-writer/sessions/${sessionId}/concepts/${conceptId}`, {
        userAction: 'chosen',
        rating,
        feedbackText,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/content-writer/sessions/${sessionId}`] });
      setStage('subtopics');
    },
  });

  // Generate subtopics mutation
  const generateSubtopicsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/content-writer/sessions/${sessionId}/subtopics`, {
        objective,
        internalLinks: internalLinks.split(',').map(l => l.trim()).filter(Boolean),
        targetLength: parseInt(targetLength),
        toneOfVoice,
        language,
        useBrandGuidelines,
        selectedTargetAudiences,
        matchStyle,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/content-writer/sessions/${sessionId}`] });
      toast({
        title: "Subtopics Generated",
        description: "Select the subtopics to include in your article",
      });
    },
  });

  // Request more subtopics mutation
  const moreSubtopicsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/content-writer/sessions/${sessionId}/subtopics/more`, {
        matchStyle,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/content-writer/sessions/${sessionId}`] });
      toast({
        title: "More Subtopics Added",
        description: "5 additional subtopics generated",
      });
    },
  });

  // Subtopic feedback mutation
  const subtopicFeedbackMutation = useMutation({
    mutationFn: async ({ subtopicId, rating }: { subtopicId: string, rating: 'thumbs_up' | 'thumbs_down' }) => {
      const subtopic = subtopics.find(s => s.id === subtopicId);
      const guidelineId = (typeof brandGuidelines === 'string' && brandGuidelines) ? brandGuidelines : session?.guidelineProfileId;
      return apiRequest('POST', '/api/content-feedback', {
        toolType: 'content-writer',
        rating,
        feedbackText: null,
        inputData: { topic, conceptId: selectedConcept?.id, brandGuidelineId: guidelineId },
        outputData: { subtopic },
        guidelineProfileId: guidelineId || null,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Feedback Submitted',
        description: 'Thank you! Your feedback helps improve future subtopics.',
      });
    },
  });

  // Toggle subtopic selection
  const toggleSubtopicMutation = useMutation({
    mutationFn: async ({ subtopicId, isSelected }: { subtopicId: string, isSelected: boolean }) => {
      await apiRequest('PATCH', `/api/content-writer/sessions/${sessionId}/subtopics/${subtopicId}`, {
        isSelected,
      });
    },
    onSuccess: (_, variables) => {
      if (variables.isSelected) {
        setSelectedSubtopics(prev => new Set(prev).add(variables.subtopicId));
      } else {
        setSelectedSubtopics(prev => {
          const next = new Set(prev);
          next.delete(variables.subtopicId);
          return next;
        });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/content-writer/sessions/${sessionId}`] });
    },
  });

  // Generate article mutation
  const generateArticleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/content-writer/sessions/${sessionId}/generate`, {
        matchStyle,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/content-writer/sessions/${sessionId}`] });
      setStage('article');
      toast({
        title: "Article Generated",
        description: "Your article is ready!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate article",
        variant: "destructive",
      });
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
    createSessionMutation.mutate();
  };

  const handleChooseConcept = (concept: Concept) => {
    setSelectedConcept(concept);
    chooseConceptMutation.mutate({ conceptId: concept.id, rating: 'thumbs_up' });
  };

  const handleGenerateSubtopics = () => {
    generateSubtopicsMutation.mutate();
  };

  const handleToggleSubtopic = (subtopicId: string, isSelected: boolean) => {
    toggleSubtopicMutation.mutate({ subtopicId, isSelected });
  };

  const handleGenerateArticle = () => {
    if (selectedSubtopics.size === 0) {
      toast({
        title: "No Subtopics Selected",
        description: "Please select at least one subtopic",
        variant: "destructive",
      });
      return;
    }
    generateArticleMutation.mutate();
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
      const blob = new Blob([draft.finalArticle], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${topic.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
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
          <Label htmlFor="topic">Article Topic <span className="text-red-500">*</span></Label>
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Choose Your Article Concept</CardTitle>
              <CardDescription>Topic: {topic}</CardDescription>
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
                  onClick={() => regenerateConceptsMutation.mutate()}
                  disabled={regenerateConceptsMutation.isPending}
                  data-testid="button-confirm-regenerate"
                >
                  {regenerateConceptsMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    'Regenerate'
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
                  <h3 className="font-semibold text-lg mb-2">{concept.title}</h3>
                  <p className="text-sm text-muted-foreground">{concept.summary}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-gray-400">Was this helpful?</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => conceptFeedbackMutation.mutate({ conceptId: concept.id, rating: 'thumbs_up' })}
                      disabled={conceptFeedbackMutation.isPending}
                      className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-gray-800"
                      data-testid={`button-concept-thumbs-up-${concept.id}`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => conceptFeedbackMutation.mutate({ conceptId: concept.id, rating: 'thumbs_down' })}
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
                  disabled={chooseConceptMutation.isPending}
                  data-testid={`button-choose-concept-${concept.id}`}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Choose This
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
            <CardTitle>Configure Your Article</CardTitle>
            <CardDescription>
              Selected Concept: {selectedConcept?.title || concepts.find(c => c.id === session?.selectedConceptId)?.title}
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
                <Select value={language} onValueChange={setLanguage} disabled={hasGeneratedSubtopics}>
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
              <Label htmlFor="internalLinks">Internal Links (comma-separated URLs)</Label>
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
                onCheckedChange={(checked) => setUseBrandGuidelines(checked === true)}
                disabled={hasGeneratedSubtopics || !brandGuidelines}
              />
              <Label htmlFor="useBrandGuidelines">Apply Brand Guidelines</Label>
            </div>

            <div>
              <Label htmlFor="targetAudience">Target Audience</Label>
              <Select 
                value={Array.isArray(selectedTargetAudiences) ? "custom" : selectedTargetAudiences}
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
                  <SelectItem value="none">Generic (No specific audience)</SelectItem>
                  <SelectItem value="all">All Brand Audiences</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedTargetAudiences === "none" && "Article will be written for a general audience"}
                {selectedTargetAudiences === "all" && "Article will target all audiences from brand guidelines"}
              </p>
            </div>

            {!hasGeneratedSubtopics && (
              <Button
                onClick={handleGenerateSubtopics}
                disabled={generateSubtopicsMutation.isPending}
                className="w-full"
                data-testid="button-generate-subtopics"
              >
                {generateSubtopicsMutation.isPending ? (
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
            )}
          </CardContent>
        </Card>

        {hasGeneratedSubtopics && (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Select Subtopics</CardTitle>
                    <CardDescription>{selectedSubtopics.size} selected</CardDescription>
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
                        checked={selectedSubtopics.has(subtopic.id) || subtopic.isSelected}
                        onCheckedChange={(checked) => handleToggleSubtopic(subtopic.id, checked === true)}
                        data-testid={`checkbox-subtopic-${subtopic.id}`}
                      />
                      <div className="flex-1">
                        <h4 className="font-medium">{subtopic.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{subtopic.summary}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-400">Was this helpful?</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => subtopicFeedbackMutation.mutate({ subtopicId: subtopic.id, rating: 'thumbs_up' })}
                            disabled={subtopicFeedbackMutation.isPending}
                            className="h-6 px-2 text-green-400 hover:text-green-300 hover:bg-gray-800"
                            data-testid={`button-subtopic-thumbs-up-${subtopic.id}`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => subtopicFeedbackMutation.mutate({ subtopicId: subtopic.id, rating: 'thumbs_down' })}
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
              disabled={generateArticleMutation.isPending || selectedSubtopics.size === 0}
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

  const renderArticleStage = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Article is Ready!</CardTitle>
              <CardDescription>
                {draft?.metadata?.wordCount || 0} words
              </CardDescription>
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
            <pre className="whitespace-pre-wrap font-sans text-sm">{draft?.finalArticle}</pre>
          </div>
          
          <Separator />
          
          {draft && (
            <FeedbackButtons
              toolType="content-writer"
              inputData={{
                topic,
                objective,
                targetLength,
                toneOfVoice,
                language,
                internalLinks: internalLinks ? internalLinks.split(',').map(l => l.trim()) : [],
                useBrandGuidelines,
                selectedTargetAudiences
              }}
              outputData={{
                finalArticle: draft.finalArticle,
                metadata: draft.metadata
              }}
              guidelineProfileId={typeof brandGuidelines === 'string' && brandGuidelines ? brandGuidelines : undefined}
            />
          )}
        </CardContent>
      </Card>

      <Button
        variant="outline"
        onClick={() => {
          setSessionId(null);
          setStage('topic');
          setTopic("");
          setBrandGuidelines('');
          setSelectedConcept(null);
          setSelectedSubtopics(new Set());
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
        {/* Progress indicator */}
        {sessionId && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-2">
                {(['topic', 'concepts', 'subtopics', 'article'] as Stage[]).map((s, i) => (
                  <Badge
                    key={s}
                    variant={stage === s ? 'default' : 'outline'}
                    className="capitalize"
                  >
                    {i + 1}. {s}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {stage === 'topic' && renderTopicStage()}
        {stage === 'concepts' && renderConceptsStage()}
        {stage === 'subtopics' && renderSubtopicsStage()}
        {stage === 'article' && renderArticleStage()}
      </div>
    </AccessGuard>
  );
}
