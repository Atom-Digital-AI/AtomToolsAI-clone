import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Sparkles, Copy, RefreshCw, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GeneratedCopy {
  headline: string;
  description: string;
  score: number;
}

export default function GoogleAdsCopyGenerator() {
  const [productName, setProductName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [brandVoice, setBrandVoice] = useState("");
  const [generatedCopies, setGeneratedCopies] = useState<GeneratedCopy[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateCopy = async () => {
    if (!productName || !keywords) {
      toast({
        title: "Missing Information",
        description: "Please provide product name and keywords.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/tools/google-ads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          keywords,
          brandVoice,
          productDescription: `${productName}. ${keywords}`,
          caseType: "sentence",
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to generate ad copy");
      }

      const data = await response.json();
      const copies: GeneratedCopy[] = [];
      const headline = (data?.headline as string) || "";
      const description1 = (data?.description1 as string) || "";
      const description2 = (data?.description2 as string) || "";

      if (headline || description1 || description2) {
        copies.push({
          headline,
          description: [description1, description2].filter(Boolean).join(" "),
          score: 90,
        });
      }

      setGeneratedCopies(copies);
      toast({
        title: "Copy Generated!",
        description: "Your Google Ads copy variations are ready.",
      });
    } catch (e: any) {
      toast({
        title: "Generation failed",
        description: e?.message || "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Copy has been added to clipboard.",
    });
  };

  return (
    <AccessGuard
      productId="c5985990-e94e-49b3-a86c-3076fd9d6b3f"
      productName="Google Ads Copy Generator"
    >
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Google Ads Copy Generator</h1>
              <p className="text-text-secondary">
                AI-powered ad copy that converts
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="product-name">Product/Service Name *</Label>
                  <Input
                    id="product-name"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Project Management Software"
                    data-testid="input-product-name"
                  />
                </div>

                <div>
                  <Label htmlFor="keywords">Target Keywords *</Label>
                  <Input
                    id="keywords"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="e.g. project management, task tracking"
                    data-testid="input-keywords"
                  />
                </div>

                <div>
                  <Label htmlFor="brand-voice">Brand Voice & Tone</Label>
                  <Select value={brandVoice} onValueChange={setBrandVoice}>
                    <SelectTrigger data-testid="select-brand-voice">
                      <SelectValue placeholder="Select brand voice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="authoritative">
                        Authoritative
                      </SelectItem>
                      <SelectItem value="conversational">
                        Conversational
                      </SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={generateCopy}
                  className="w-full"
                  disabled={isGenerating}
                  data-testid="button-generate-copy"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Ad Copy
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Copy Variations</CardTitle>
            </CardHeader>
            <CardContent>
              {generatedCopies.length === 0 ? (
                <div className="text-center py-12 text-text-secondary">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Generate your first ad copy to see results here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {generatedCopies.map((copy, index) => (
                    <Card key={index} className="border border-border">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-sm font-medium text-text-secondary">
                            Variation {index + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                              Score: {copy.score}%
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                copyToClipboard(
                                  `${copy.headline}\n${copy.description}`
                                )
                              }
                              data-testid={`button-copy-${index}`}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs text-text-secondary">
                              Headline:
                            </Label>
                            <p className="font-medium text-sm">
                              {copy.headline}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-text-secondary">
                              Description:
                            </Label>
                            <p className="text-sm text-text-secondary">
                              {copy.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Button
                    variant="outline"
                    className="w-full"
                    data-testid="button-export-all"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export All Variations
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AccessGuard>
  );
}
