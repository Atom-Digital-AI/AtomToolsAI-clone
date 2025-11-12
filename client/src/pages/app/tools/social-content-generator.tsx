import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { AccessGuard } from "@/components/access-guard";
import {
  Sparkles,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PRODUCT_IDS } from "@shared/schema";
import { useBrand } from "@/contexts/BrandContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AdSpec {
  format: string;
  id: string;
  spec: any;
}

interface Wireframe {
  id: string;
  platform: string;
  format: string;
  optionLabel: "A" | "B" | "C";
  textFields: Record<
    string,
    {
      text: string;
      charCount: number;
      limit: number | string;
      passed: boolean;
    }
  >;
  ctaButton?: string;
  mediaSpecs: any;
  mediaConcept: string;
  altText?: string;
  rationale: string;
  complianceChecks: Array<{ rule: string; passed: boolean; note?: string }>;
  brandAlignmentScore?: number;
}

interface SessionState {
  sessionId: string;
  threadId: string;
  status: string;
  state: {
    wireframes: Wireframe[];
    metadata: {
      currentStep: string;
      generatedFormats: number;
    };
  };
}

const PLATFORMS = [
  "Facebook",
  "Instagram",
  "TikTok",
  "X (Twitter)",
  "YouTube",
] as const;

export default function SocialContentGenerator() {
  const [step, setStep] = useState<"intake" | "wireframes" | "completed">(
    "intake"
  );
  const [subject, setSubject] = useState("");
  const [objective, setObjective] = useState("");
  const [urls, setUrls] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<
    (typeof PLATFORMS)[number][]
  >([]);
  const [selectedFormats, setSelectedFormats] = useState<
    Record<string, string[]>
  >({});
  const [approvedWireframeIds, setApprovedWireframeIds] = useState<string[]>(
    []
  );
  const [currentSession, setCurrentSession] = useState<SessionState | null>(
    null
  );

  const { toast } = useToast();
  const { selectedBrand } = useBrand();
  const productId = PRODUCT_IDS.SOCIAL_CONTENT_GENERATOR;

  // Get user's tier permissions
  const { data: accessInfo } = useQuery<{
    subfeatures?: Record<string, boolean>;
  }>({
    queryKey: [`/api/products/${productId}/access`],
    retry: false,
  });

  const canUseBrandGuidelines =
    accessInfo?.subfeatures?.brand_guidelines === true;

  // Fetch ad specs
  const { data: adSpecs, isLoading: specsLoading } = useQuery<
    Record<string, AdSpec[]>
  >({
    queryKey: ["/api/social-content/ad-specs"],
  });

  // Start session mutation
  const startSessionMutation = useMutation({
    mutationFn: async (data: any): Promise<SessionState> => {
      const response = await apiRequest(
        "POST",
        "/api/social-content/start",
        data
      );
      return await response.json();
    },
    onSuccess: (data: SessionState) => {
      console.log("Session started:", data);
      setCurrentSession(data);
      setStep("wireframes");
      toast({
        title: "Wireframes Generated",
        description: `Created ${data.state.metadata.generatedFormats} format variations`,
      });
    },
    onError: (error: any) => {
      console.error("Error starting session:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate content",
        variant: "destructive",
      });
    },
  });

  // Approve wireframes mutation
  const approveWireframesMutation = useMutation({
    mutationFn: async ({
      sessionId,
      wireframeIds,
    }: {
      sessionId: string;
      wireframeIds: string[];
    }) => {
      return await apiRequest(
        "POST",
        `/api/social-content/sessions/${sessionId}/approve`,
        {
          approvedWireframeIds: wireframeIds,
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your social content has been saved",
      });
      setStep("completed");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save content",
        variant: "destructive",
      });
    },
  });

  const handlePlatformToggle = (platform: (typeof PLATFORMS)[number]) => {
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
      const newFormats = { ...selectedFormats };
      delete newFormats[platform];
      setSelectedFormats(newFormats);
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
  };

  const handleFormatToggle = (platform: string, format: string) => {
    const platformFormats = selectedFormats[platform] || [];
    if (platformFormats.includes(format)) {
      setSelectedFormats({
        ...selectedFormats,
        [platform]: platformFormats.filter((f) => f !== format),
      });
    } else {
      setSelectedFormats({
        ...selectedFormats,
        [platform]: [...platformFormats, format],
      });
    }
  };

  const handleStartGeneration = () => {
    if (!subject.trim()) {
      toast({
        title: "Subject Required",
        description: "Please describe what you want to create",
        variant: "destructive",
      });
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast({
        title: "Select Platform",
        description: "Choose at least one platform",
        variant: "destructive",
      });
      return;
    }

    const hasFormats = Object.values(selectedFormats).some(
      (formats) => formats.length > 0
    );
    if (!hasFormats) {
      toast({
        title: "Select Format",
        description: "Choose at least one ad format",
        variant: "destructive",
      });
      return;
    }

    const urlArray = urls.trim()
      ? urls
          .split("\n")
          .map((u) => u.trim())
          .filter(Boolean)
      : undefined;

    startSessionMutation.mutate({
      subject,
      objective: objective || undefined,
      urls: urlArray,
      selectedPlatforms,
      selectedFormats,
      guidelineProfileId:
        canUseBrandGuidelines && selectedBrand ? selectedBrand.id : undefined,
      useBrandGuidelines: !!(canUseBrandGuidelines && selectedBrand),
      selectedTargetAudiences: "all",
    });
  };

  const handleApprove = () => {
    if (!currentSession) return;

    if (approvedWireframeIds.length === 0) {
      toast({
        title: "No Selection",
        description: "Please approve at least one wireframe",
        variant: "destructive",
      });
      return;
    }

    approveWireframesMutation.mutate({
      sessionId: currentSession.sessionId,
      wireframeIds: approvedWireframeIds,
    });
  };

  const toggleWireframeApproval = (wireframeId: string) => {
    if (approvedWireframeIds.includes(wireframeId)) {
      setApprovedWireframeIds(
        approvedWireframeIds.filter((id) => id !== wireframeId)
      );
    } else {
      setApprovedWireframeIds([...approvedWireframeIds, wireframeId]);
    }
  };

  const groupWireframesByPlatformFormat = (wireframes: Wireframe[]) => {
    const grouped: Record<string, Record<string, Wireframe[]>> = {};

    for (const wireframe of wireframes) {
      if (!grouped[wireframe.platform]) {
        grouped[wireframe.platform] = {};
      }
      if (!grouped[wireframe.platform][wireframe.format]) {
        grouped[wireframe.platform][wireframe.format] = [];
      }
      grouped[wireframe.platform][wireframe.format].push(wireframe);
    }

    return grouped;
  };

  const getCharLimitStatus = (
    charCount: number,
    limit: number | string
  ): "safe" | "warning" | "error" => {
    const numericLimit =
      typeof limit === "number"
        ? limit
        : parseInt(limit.toString().match(/\d+/)?.[0] || "0", 10);
    if (numericLimit === 0) return "safe";

    const remaining = numericLimit - charCount;
    if (remaining < 0) return "error";
    if (remaining < numericLimit * 0.1) return "warning";
    return "safe";
  };

  return (
    <AccessGuard productId={productId} productName="Social Content Generator">
      <div className="container mx-auto py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Social Content Generator</h1>
          <p className="text-muted-foreground">
            Generate platform-compliant social media content with brand
            guidelines
          </p>
        </div>

        {step === "intake" && (
          <div className="space-y-6">
            {/* Subject & Objective */}
            <Card>
              <CardHeader>
                <CardTitle>1. What do you want to create?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Textarea
                    id="subject"
                    placeholder="Describe your campaign, product, or message..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="objective">Objective (Optional)</Label>
                  <Input
                    id="objective"
                    placeholder="e.g., Drive sign-ups, increase brand awareness..."
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="urls">Source URLs (Optional)</Label>
                  <Textarea
                    id="urls"
                    placeholder="Add URLs to scrape for content (one per line)"
                    value={urls}
                    onChange={(e) => setUrls(e.target.value)}
                    rows={3}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    We'll extract key points from these pages
                  </p>
                </div>

                {canUseBrandGuidelines && selectedBrand && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Using brand guidelines from{" "}
                      <strong>{selectedBrand.name}</strong>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Platform & Format Selection */}
            <Card>
              <CardHeader>
                <CardTitle>2. Select Platforms & Formats</CardTitle>
                <CardDescription>
                  Choose where you want to advertise
                </CardDescription>
              </CardHeader>
              <CardContent>
                {specsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Tabs value={selectedPlatforms[0]} className="w-full">
                    <div className="flex gap-2 mb-4 flex-wrap">
                      {PLATFORMS.map((platform) => (
                        <Button
                          key={platform}
                          variant={
                            selectedPlatforms.includes(platform)
                              ? "default"
                              : "outline"
                          }
                          onClick={() => handlePlatformToggle(platform)}
                        >
                          {platform}
                        </Button>
                      ))}
                    </div>

                    {selectedPlatforms.length > 0 && (
                      <TabsList className="mb-4">
                        {selectedPlatforms.map((platform) => (
                          <TabsTrigger key={platform} value={platform}>
                            {platform}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    )}

                    {selectedPlatforms.map((platform) => (
                      <TabsContent key={platform} value={platform}>
                        <ScrollArea className="h-[400px] pr-4">
                          <div className="space-y-2">
                            {adSpecs?.[platform]?.map((spec) => (
                              <div
                                key={spec.format}
                                className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer"
                                onClick={() =>
                                  handleFormatToggle(platform, spec.format)
                                }
                              >
                                <Checkbox
                                  checked={selectedFormats[platform]?.includes(
                                    spec.format
                                  )}
                                  onCheckedChange={() =>
                                    handleFormatToggle(platform, spec.format)
                                  }
                                />
                                <div className="flex-1">
                                  <div className="font-medium">
                                    {spec.format}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {spec.spec.media?.type || "Text-based"}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    ))}
                  </Tabs>
                )}
              </CardContent>
            </Card>

            <Button
              size="lg"
              onClick={handleStartGeneration}
              disabled={startSessionMutation.isPending}
              className="w-full"
            >
              {startSessionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Wireframes...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Content
                </>
              )}
            </Button>
          </div>
        )}

        {step === "wireframes" && currentSession && (
          <div className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Review the generated wireframes below. Select your favorites
                (one per format).
              </AlertDescription>
            </Alert>

            {Object.entries(
              groupWireframesByPlatformFormat(
                currentSession.state.wireframes || []
              )
            ).map(([platform, formats]) => (
              <div key={platform}>
                <h2 className="text-2xl font-bold mb-4">{platform}</h2>

                {Object.entries(formats).map(([format, wireframes]) => (
                  <Card key={format} className="mb-6">
                    <CardHeader>
                      <CardTitle>{format}</CardTitle>
                      <CardDescription>Choose one option</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {wireframes.map((wireframe) => {
                          const isApproved = approvedWireframeIds.includes(
                            wireframe.id
                          );

                          return (
                            <Card
                              key={wireframe.id}
                              className={`cursor-pointer transition-all ${
                                isApproved
                                  ? "ring-2 ring-primary"
                                  : "hover:shadow-md"
                              }`}
                              onClick={() =>
                                toggleWireframeApproval(wireframe.id)
                              }
                            >
                              <CardHeader>
                                <div className="flex items-center justify-between">
                                  <Badge
                                    variant={isApproved ? "default" : "outline"}
                                  >
                                    Option {wireframe.optionLabel}
                                  </Badge>
                                  {isApproved ? (
                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                  ) : (
                                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                                  )}
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {Object.entries(wireframe.textFields).map(
                                  ([fieldName, fieldData]) => {
                                    const status = getCharLimitStatus(
                                      fieldData.charCount,
                                      fieldData.limit
                                    );

                                    return (
                                      <div
                                        key={fieldName}
                                        className="space-y-1"
                                      >
                                        <div className="flex justify-between items-center">
                                          <Label className="text-xs font-semibold">
                                            {fieldName}
                                          </Label>
                                          <Badge
                                            variant={
                                              status === "error"
                                                ? "destructive"
                                                : status === "warning"
                                                ? "secondary"
                                                : "outline"
                                            }
                                            className="text-xs"
                                          >
                                            {fieldData.charCount}/
                                            {fieldData.limit}
                                          </Badge>
                                        </div>
                                        <p className="text-sm">
                                          {fieldData.text}
                                        </p>
                                      </div>
                                    );
                                  }
                                )}

                                {wireframe.ctaButton && (
                                  <div className="pt-2 border-t">
                                    <Label className="text-xs font-semibold">
                                      CTA
                                    </Label>
                                    <Badge className="mt-1">
                                      {wireframe.ctaButton}
                                    </Badge>
                                  </div>
                                )}

                                <div className="pt-2 border-t">
                                  <Label className="text-xs font-semibold">
                                    Media Concept
                                  </Label>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {wireframe.mediaConcept}
                                  </p>
                                </div>

                                {wireframe.brandAlignmentScore && (
                                  <div className="pt-2 border-t">
                                    <Label className="text-xs font-semibold">
                                      Brand Alignment
                                    </Label>
                                    <div className="text-xs font-medium text-green-600">
                                      {wireframe.brandAlignmentScore}% match
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("intake");
                  setCurrentSession(null);
                  setApprovedWireframeIds([]);
                }}
              >
                Start Over
              </Button>
              <Button
                size="lg"
                onClick={handleApprove}
                disabled={
                  approvedWireframeIds.length === 0 ||
                  approveWireframesMutation.isPending
                }
                className="flex-1"
              >
                {approveWireframesMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Save Selected ({approvedWireframeIds.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "completed" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                Content Saved Successfully
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Your social content has been saved to your content library.
              </p>
              <Button
                onClick={() => {
                  setStep("intake");
                  setSubject("");
                  setObjective("");
                  setUrls("");
                  setSelectedPlatforms([]);
                  setSelectedFormats({});
                  setApprovedWireframeIds([]);
                  setCurrentSession(null);
                }}
              >
                Create More Content
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AccessGuard>
  );
}
