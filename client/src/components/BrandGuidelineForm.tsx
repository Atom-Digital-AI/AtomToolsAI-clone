import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, AlertCircle, Sparkles, Upload } from "lucide-react";
import { BrandGuidelineContent, TargetAudience, brandGuidelineContentSchema, GuidelineProfile } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TagInput from "@/components/TagInput";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BrandGuidelineFormProps {
  value: BrandGuidelineContent | string;
  onChange: (value: BrandGuidelineContent) => void;
  profileId?: string; // ID of the guideline profile (for existing profiles)
}

export default function BrandGuidelineForm({ value, onChange, profileId }: BrandGuidelineFormProps) {
  const [formData, setFormData] = useState<BrandGuidelineContent>({});
  const [isLegacy, setIsLegacy] = useState(false);
  const [legacyText, setLegacyText] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [regulatoryMode, setRegulatoryMode] = useState<"none" | "existing" | "new">("none");
  const [isAutoPopulating, setIsAutoPopulating] = useState(false);
  const [isExtractingContext, setIsExtractingContext] = useState(false);
  const { toast } = useToast();
  const previousFormDataRef = useRef<string>("");

  const { data: regulatoryGuidelines = [] } = useQuery<GuidelineProfile[]>({
    queryKey: ["/api/guideline-profiles?type=regulatory"],
  });

  useEffect(() => {
    if (typeof value === "string") {
      setIsLegacy(true);
      setLegacyText(value);
      setFormData({});
    } else if (value && typeof value === "object" && "legacy_text" in value) {
      setIsLegacy(true);
      setLegacyText((value as any).legacy_text);
      setFormData({});
    } else {
      setIsLegacy(false);
      const data = value || {};
      setFormData(data);
      
      if (data.regulatory_guideline_id) {
        setRegulatoryMode("existing");
      } else if (data.temporary_regulatory_text) {
        setRegulatoryMode("new");
      } else {
        setRegulatoryMode("none");
      }
    }
  }, [value]);

  useEffect(() => {
    if (!isLegacy) {
      const result = brandGuidelineContentSchema.safeParse(formData);
      if (!result.success) {
        const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        setValidationErrors(errors);
      } else {
        setValidationErrors([]);
      }
      
      // Only call onChange if formData actually changed
      const currentFormDataString = JSON.stringify(formData);
      if (currentFormDataString !== previousFormDataRef.current) {
        previousFormDataRef.current = currentFormDataString;
        onChange(formData);
      }
    }
  }, [formData, isLegacy]);

  const handleConvertToStructured = () => {
    const converted: BrandGuidelineContent = {
      tone_of_voice: legacyText,
      style_preferences: "",
      color_palette: [],
      visual_style: "",
      target_audience: [],
      brand_personality: [],
      content_themes: [],
      language_style: "",
    };
    setFormData(converted);
    setIsLegacy(false);
    onChange(converted);
  };

  const updateField = <K extends keyof BrandGuidelineContent>(
    field: K,
    value: BrandGuidelineContent[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addColor = () => {
    const colors = formData.color_palette || [];
    updateField("color_palette", [...colors, "#000000"]);
  };

  const updateColor = (index: number, color: string) => {
    const colors = [...(formData.color_palette || [])];
    colors[index] = color;
    updateField("color_palette", colors);
  };

  const removeColor = (index: number) => {
    const colors = [...(formData.color_palette || [])];
    colors.splice(index, 1);
    updateField("color_palette", colors);
  };

  const addTargetAudience = () => {
    const audiences = formData.target_audience || [];
    updateField("target_audience", [
      ...audiences,
      { gender: "", profession: "", interests: [], other_keywords: [] }
    ]);
  };

  const updateTargetAudience = (index: number, field: keyof TargetAudience, value: any) => {
    const audiences = [...(formData.target_audience || [])];
    audiences[index] = { ...audiences[index], [field]: value };
    updateField("target_audience", audiences);
  };

  const removeTargetAudience = (index: number) => {
    const audiences = [...(formData.target_audience || [])];
    audiences.splice(index, 1);
    updateField("target_audience", audiences);
  };

  const handleAutoPopulate = async () => {
    let domainUrl = formData.domain_url?.trim();
    
    if (!domainUrl) {
      toast({
        title: "Domain URL Required",
        description: "Please enter a domain URL first to auto-populate brand guidelines.",
        variant: "destructive",
      });
      return;
    }

    // Basic client-side normalization - add https if no protocol
    if (!domainUrl.match(/^https?:\/\//i)) {
      domainUrl = `https://${domainUrl}`;
      updateField("domain_url", domainUrl);
    }

    try {
      setIsAutoPopulating(true);
      
      const response = await apiRequest(
        "/api/guideline-profiles/auto-populate",
        {
          method: "POST",
          body: JSON.stringify({ domainUrl }),
        }
      ) as BrandGuidelineContent;

      // Merge the auto-populated data with existing form data
      const updatedData = { ...formData, ...response };
      setFormData(updatedData);
      onChange(updatedData);

      toast({
        title: "Success!",
        description: "Brand guidelines have been auto-populated from your website.",
      });
    } catch (error: any) {
      console.error("Auto-populate error:", error);
      toast({
        title: "Auto-populate Failed",
        description: error.message || "Failed to analyze website. Please check the URL and try again.",
        variant: "destructive",
      });
    } finally {
      setIsAutoPopulating(false);
    }
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "PDF file must be smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAutoPopulating(true);

      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data:application/pdf;base64, prefix
          const base64String = result.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await apiRequest(
        "/api/guideline-profiles/auto-populate-pdf",
        {
          method: "POST",
          body: JSON.stringify({ pdfBase64: base64 }),
        }
      ) as BrandGuidelineContent;

      // Merge the auto-populated data with existing form data
      const updatedData = { ...formData, ...response };
      setFormData(updatedData);
      onChange(updatedData);

      toast({
        title: "Success!",
        description: "Brand guidelines have been extracted from your PDF.",
      });
    } catch (error: any) {
      console.error("PDF upload error:", error);
      toast({
        title: "PDF Upload Failed",
        description: error.message || "Failed to analyze PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAutoPopulating(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleExtractContext = async () => {
    if (!profileId) {
      toast({
        title: "Profile Not Saved",
        description: "Please save the profile first before extracting context.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.context_urls) {
      toast({
        title: "No URLs Provided",
        description: "Please provide at least one URL to extract context from.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsExtractingContext(true);

      const response = await apiRequest(
        `/api/guideline-profiles/${profileId}/extract-context`,
        {
          method: "POST",
          body: JSON.stringify({ contextUrls: formData.context_urls }),
        }
      ) as { success: boolean; processed: number; failed: number; errors: any[] };

      if (response.success) {
        toast({
          title: "Context Extracted Successfully",
          description: `Processed ${response.processed} pages${response.failed > 0 ? `, ${response.failed} failed` : ''}.`,
        });
      }
    } catch (error: any) {
      console.error("Extract context error:", error);
      toast({
        title: "Context Extraction Failed",
        description: error.message || "Failed to extract context from pages.",
        variant: "destructive",
      });
    } finally {
      setIsExtractingContext(false);
    }
  };

  if (isLegacy) {
    return (
      <div className="space-y-4 p-6 bg-yellow-950/20 border border-yellow-800 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-yellow-500 mb-2">Legacy Format Detected</h3>
            <p className="text-sm text-gray-300 mb-4">
              This profile uses the old text-based format. Convert it to the new structured format to unlock advanced features like color palettes, target audiences, and more.
            </p>
            <div className="mb-4">
              <Label className="text-gray-300">Current Content:</Label>
              <p className="mt-2 p-3 bg-gray-800 rounded border border-gray-700 text-gray-200 text-sm whitespace-pre-wrap">
                {legacyText}
              </p>
            </div>
            <Button 
              onClick={handleConvertToStructured}
              data-testid="button-convert-to-structured"
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Convert to Structured Format
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {validationErrors.length > 0 && (
        <div className="p-4 bg-red-950/20 border border-red-800 rounded-lg">
          <h4 className="text-red-500 font-semibold mb-2">Validation Errors:</h4>
          <ul className="list-disc list-inside text-sm text-red-400">
            {validationErrors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="flex flex-wrap w-full bg-gray-800 h-auto p-1 gap-1">
          <TabsTrigger value="basic" data-testid="tab-basic-info" className="flex-1 min-w-[120px]">Basic Info</TabsTrigger>
          <TabsTrigger value="visual" data-testid="tab-visual-identity" className="flex-1 min-w-[120px]">Visual Identity</TabsTrigger>
          <TabsTrigger value="audience" data-testid="tab-audience" className="flex-1 min-w-[120px]">Audience</TabsTrigger>
          <TabsTrigger value="voice" data-testid="tab-brand-voice" className="flex-1 min-w-[120px]">Brand Voice</TabsTrigger>
          <TabsTrigger value="context" data-testid="tab-context" className="flex-1 min-w-[120px]">Context</TabsTrigger>
          <TabsTrigger value="regulatory" data-testid="tab-regulatory" className="flex-1 min-w-[120px]">Regulatory</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-6">
          <div>
            <Label htmlFor="domain-url" className="text-gray-200">Domain URL</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="domain-url"
                data-testid="input-domain-url"
                type="url"
                value={formData.domain_url || ""}
                onChange={(e) => updateField("domain_url", e.target.value)}
                placeholder="https://yourbrand.com"
                className="flex-1 bg-gray-800 border-gray-700 text-white"
              />
              <Button
                type="button"
                data-testid="button-auto-populate"
                onClick={handleAutoPopulate}
                disabled={isAutoPopulating || !formData.domain_url}
                className="bg-indigo-600 hover:bg-indigo-700 text-white whitespace-nowrap"
              >
                {isAutoPopulating ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Auto Populate
                  </>
                )}
              </Button>
              <div className="relative">
                <input
                  type="file"
                  id="pdf-upload"
                  data-testid="input-pdf-upload"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  disabled={isAutoPopulating}
                  className="hidden"
                />
                <Button
                  type="button"
                  data-testid="button-upload-pdf"
                  onClick={() => document.getElementById('pdf-upload')?.click()}
                  disabled={isAutoPopulating}
                  className="bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload PDF
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Enter your website URL and click Auto Populate, or upload a PDF brand guideline document to extract information automatically.
            </p>
          </div>

          <div>
            <Label htmlFor="tone-of-voice" className="text-gray-200">Tone of Voice</Label>
            <Textarea
              id="tone-of-voice"
              data-testid="textarea-tone-of-voice"
              value={formData.tone_of_voice || ""}
              onChange={(e) => updateField("tone_of_voice", e.target.value)}
              placeholder="Describe the tone and voice of your brand (e.g., professional, friendly, authoritative)..."
              rows={4}
              className="mt-2 bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div>
            <Label htmlFor="style-preferences" className="text-gray-200">Style Preferences</Label>
            <Textarea
              id="style-preferences"
              data-testid="textarea-style-preferences"
              value={formData.style_preferences || ""}
              onChange={(e) => updateField("style_preferences", e.target.value)}
              placeholder="Describe your brand's style preferences..."
              rows={4}
              className="mt-2 bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </TabsContent>

        <TabsContent value="visual" className="space-y-4 mt-6">
          <div>
            <Label className="text-gray-200">Color Palette</Label>
            <div className="space-y-2 mt-2">
              {(formData.color_palette || []).map((color, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="color"
                    data-testid={`input-color-${index}`}
                    value={color}
                    onChange={(e) => updateColor(index, e.target.value)}
                    className="w-12 h-10 rounded border border-gray-700 bg-gray-800 cursor-pointer"
                  />
                  <Input
                    data-testid={`input-color-hex-${index}`}
                    value={color}
                    onChange={(e) => updateColor(index, e.target.value)}
                    placeholder="#000000"
                    className="flex-1 bg-gray-800 border-gray-700 text-white"
                  />
                  <Button
                    data-testid={`button-remove-color-${index}`}
                    variant="destructive"
                    size="icon"
                    onClick={() => removeColor(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                data-testid="button-add-color"
                variant="outline"
                onClick={addColor}
                className="w-full border-gray-700 hover:bg-gray-800"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Color
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="visual-style" className="text-gray-200">Visual Style</Label>
            <Textarea
              id="visual-style"
              data-testid="textarea-visual-style"
              value={formData.visual_style || ""}
              onChange={(e) => updateField("visual_style", e.target.value)}
              placeholder="Describe your brand's visual style (e.g., minimalist, bold, playful)..."
              rows={4}
              className="mt-2 bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </TabsContent>

        <TabsContent value="audience" className="space-y-4 mt-6">
          <div>
            <Label className="text-gray-200">Target Audiences</Label>
            <div className="space-y-4 mt-2">
              {(formData.target_audience || []).map((audience, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-800 rounded-lg border border-gray-700 space-y-3"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold text-gray-200">Audience {index + 1}</h4>
                    <Button
                      data-testid={`button-remove-audience-${index}`}
                      variant="destructive"
                      size="sm"
                      onClick={() => removeTargetAudience(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`gender-${index}`} className="text-gray-300 text-xs">Gender</Label>
                      <Input
                        id={`gender-${index}`}
                        data-testid={`input-audience-gender-${index}`}
                        value={audience.gender || ""}
                        onChange={(e) => updateTargetAudience(index, "gender", e.target.value)}
                        placeholder="e.g., All, Male, Female"
                        className="mt-1 bg-gray-900 border-gray-600 text-white"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`profession-${index}`} className="text-gray-300 text-xs">Profession</Label>
                      <Input
                        id={`profession-${index}`}
                        data-testid={`input-audience-profession-${index}`}
                        value={audience.profession || ""}
                        onChange={(e) => updateTargetAudience(index, "profession", e.target.value)}
                        placeholder="e.g., Marketing Managers"
                        className="mt-1 bg-gray-900 border-gray-600 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-300 text-xs">Age Range</Label>
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <Input
                        data-testid={`input-audience-age-from-${index}`}
                        type="number"
                        min="0"
                        max="120"
                        value={audience.age_range?.from_age || ""}
                        onChange={(e) => updateTargetAudience(index, "age_range", {
                          ...audience.age_range,
                          from_age: parseInt(e.target.value) || 0
                        })}
                        placeholder="From age"
                        className="bg-gray-900 border-gray-600 text-white"
                      />
                      <Input
                        data-testid={`input-audience-age-to-${index}`}
                        type="number"
                        min="0"
                        max="120"
                        value={audience.age_range?.to_age || ""}
                        onChange={(e) => updateTargetAudience(index, "age_range", {
                          ...audience.age_range,
                          to_age: parseInt(e.target.value) || 0
                        })}
                        placeholder="To age"
                        className="bg-gray-900 border-gray-600 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-300 text-xs">
                      Interests
                    </Label>
                    <div className="mt-1">
                      <TagInput
                        data-testid={`input-audience-interests-${index}`}
                        value={audience.interests || []}
                        onChange={(tags) => updateTargetAudience(index, "interests", tags)}
                        placeholder="e.g., Technology, Marketing, Design"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-300 text-xs">
                      Other Keywords
                    </Label>
                    <div className="mt-1">
                      <TagInput
                        data-testid={`input-audience-keywords-${index}`}
                        value={audience.other_keywords || []}
                        onChange={(tags) => updateTargetAudience(index, "other_keywords", tags)}
                        placeholder="e.g., B2B, SaaS, Enterprise"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                data-testid="button-add-audience"
                variant="outline"
                onClick={addTargetAudience}
                className="w-full border-gray-700 hover:bg-gray-800"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Target Audience
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="voice" className="space-y-4 mt-6">
          <div>
            <Label className="text-gray-200">
              Brand Personality
            </Label>
            <div className="mt-2">
              <TagInput
                data-testid="input-brand-personality"
                value={formData.brand_personality || []}
                onChange={(tags) => updateField("brand_personality", tags)}
                placeholder="e.g., Innovative, Trustworthy, Bold"
              />
            </div>
          </div>

          <div>
            <Label className="text-gray-200">
              Content Themes
            </Label>
            <div className="mt-2">
              <TagInput
                data-testid="input-content-themes"
                value={formData.content_themes || []}
                onChange={(tags) => updateField("content_themes", tags)}
                placeholder="e.g., Innovation, Customer Success, Industry Leadership"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="language-style" className="text-gray-200">Language Style</Label>
            <Textarea
              id="language-style"
              data-testid="textarea-language-style"
              value={formData.language_style || ""}
              onChange={(e) => updateField("language_style", e.target.value)}
              placeholder="Describe the language style to use (e.g., use active voice, avoid jargon, conversational)..."
              rows={4}
              className="mt-2 bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </TabsContent>

        <TabsContent value="context" className="space-y-4 mt-6">
          <div className="space-y-4">
            <div className="p-4 bg-blue-950/20 border border-blue-800 rounded-lg">
              <h4 className="text-blue-400 font-semibold mb-2">Brand Context Pages</h4>
              <p className="text-sm text-gray-300">
                Provide URLs to key pages of your website. We'll extract the main content from each page and convert it to markdown format for use in content generation.
              </p>
            </div>

            <div>
              <Label htmlFor="context-home-page" className="text-gray-200">Home Page URL</Label>
              <Input
                id="context-home-page"
                data-testid="input-context-home-page"
                type="url"
                value={formData.context_urls?.home_page || ""}
                onChange={(e) => updateField("context_urls", { ...formData.context_urls, home_page: e.target.value })}
                placeholder="https://yourbrand.com"
                className="mt-2 bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label htmlFor="context-about-page" className="text-gray-200">About Us Page URL</Label>
              <Input
                id="context-about-page"
                data-testid="input-context-about-page"
                type="url"
                value={formData.context_urls?.about_page || ""}
                onChange={(e) => updateField("context_urls", { ...formData.context_urls, about_page: e.target.value })}
                placeholder="https://yourbrand.com/about"
                className="mt-2 bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-200">Service/Product Pages (up to 5)</Label>
              <div className="mt-2 space-y-2">
                {[...(formData.context_urls?.service_pages || []), ""].slice(0, 5).map((url, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      data-testid={`input-context-service-page-${index}`}
                      type="url"
                      value={url}
                      onChange={(e) => {
                        const pages = [...(formData.context_urls?.service_pages || [])];
                        if (e.target.value) {
                          pages[index] = e.target.value;
                        } else {
                          pages.splice(index, 1);
                        }
                        updateField("context_urls", { ...formData.context_urls, service_pages: pages.filter(p => p) });
                      }}
                      placeholder={`Service/Product page ${index + 1}`}
                      className="flex-1 bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Add URLs to your key service or product pages
              </p>
            </div>

            <div>
              <Label className="text-gray-200">Blog Articles/Resources (up to 20)</Label>
              <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                {[...(formData.context_urls?.blog_articles || []), ""].slice(0, 20).map((url, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      data-testid={`input-context-blog-article-${index}`}
                      type="url"
                      value={url}
                      onChange={(e) => {
                        const articles = [...(formData.context_urls?.blog_articles || [])];
                        if (e.target.value) {
                          articles[index] = e.target.value;
                        } else {
                          articles.splice(index, 1);
                        }
                        updateField("context_urls", { ...formData.context_urls, blog_articles: articles.filter(a => a) });
                      }}
                      placeholder={`Blog article/resource ${index + 1}`}
                      className="flex-1 bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Add URLs to your blog posts or resource articles
              </p>
            </div>

            <Button
              type="button"
              data-testid="button-extract-context"
              onClick={handleExtractContext}
              disabled={isExtractingContext || !profileId}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {isExtractingContext ? "Extracting..." : "Extract & Save Context"}
            </Button>
            {!profileId && (
              <p className="text-xs text-gray-400 mt-1">
                Save the profile first to enable context extraction
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="regulatory" className="space-y-4 mt-6">
          <div className="space-y-4">
            <div>
              <Label className="text-gray-200">Attach Regulatory Guideline</Label>
              <p className="text-sm text-gray-400 mt-1 mb-3">
                Attach an existing regulatory guideline profile or create a new one for this brand.
              </p>
              
              <div className="space-y-3">
                <Select
                  data-testid="select-regulatory-mode"
                  value={regulatoryMode}
                  onValueChange={(value: "none" | "existing" | "new") => {
                    setRegulatoryMode(value);
                    if (value === "none") {
                      updateField("regulatory_guideline_id", undefined);
                      updateField("temporary_regulatory_text", undefined);
                    } else if (value === "existing") {
                      updateField("temporary_regulatory_text", undefined);
                    } else if (value === "new") {
                      updateField("regulatory_guideline_id", undefined);
                    }
                  }}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Choose option..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Regulatory Guideline</SelectItem>
                    <SelectItem value="existing">Attach Existing Guideline</SelectItem>
                    <SelectItem value="new">Create New Guideline</SelectItem>
                  </SelectContent>
                </Select>

                {regulatoryMode === "existing" && (
                  <div>
                    <Label className="text-gray-300 text-sm">Select Regulatory Guideline</Label>
                    <Select
                      data-testid="select-existing-regulatory"
                      value={formData.regulatory_guideline_id || ""}
                      onValueChange={(value) => updateField("regulatory_guideline_id", value)}
                    >
                      <SelectTrigger className="mt-2 bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Select a regulatory guideline..." />
                      </SelectTrigger>
                      <SelectContent>
                        {regulatoryGuidelines.length === 0 ? (
                          <SelectItem value="none" disabled>No regulatory guidelines available</SelectItem>
                        ) : (
                          regulatoryGuidelines.map((guideline) => (
                            <SelectItem key={guideline.id} value={guideline.id}>
                              {guideline.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {regulatoryMode === "new" && (
                  <div>
                    <Label htmlFor="new-regulatory-text" className="text-gray-300 text-sm">
                      New Regulatory Guideline Content
                    </Label>
                    <p className="text-xs text-gray-400 mt-1 mb-2">
                      Note: This will create a temporary guideline. To save it permanently, create a regulatory profile in Profile Settings.
                    </p>
                    <Textarea
                      id="new-regulatory-text"
                      data-testid="textarea-new-regulatory"
                      value={formData.temporary_regulatory_text || ""}
                      onChange={(e) => updateField("temporary_regulatory_text", e.target.value)}
                      placeholder="Enter regulatory guidelines, compliance requirements, or industry-specific rules..."
                      rows={6}
                      className="mt-2 bg-gray-800 border-gray-700 text-white"
                    />
                    <p className="text-xs text-amber-500 mt-2">
                      ⚠️ Temporary guidelines are not saved permanently. Consider creating a regulatory profile for reuse.
                    </p>
                  </div>
                )}

                {formData.regulatory_guideline_id && regulatoryMode === "existing" && (
                  <div className="p-3 bg-green-950/20 border border-green-800 rounded-lg">
                    <p className="text-sm text-green-400">
                      ✓ Regulatory guideline attached: {regulatoryGuidelines.find(g => g.id === formData.regulatory_guideline_id)?.name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
