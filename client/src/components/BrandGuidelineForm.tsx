import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, AlertCircle, Sparkles, Upload, Copy } from "lucide-react";
import { BrandGuidelineContent, TargetAudience, brandGuidelineContentSchema, GuidelineProfile } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TagInput from "@/components/TagInput";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { showAdminErrorToast } from "@/lib/admin-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ManualServiceUrlDialog, ManualBlogUrlDialog } from "@/components/ContextPageFallbackDialogs";
import { ProgressModal } from "@/components/ProgressModal";
import { UnifiedFallbackModal } from "@/components/UnifiedFallbackModal";
import UrlTaggingPage from "@/pages/UrlTaggingPage";

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
  const [isDiscoveringPages, setIsDiscoveringPages] = useState(false);
  const [discoveredPages, setDiscoveredPages] = useState<{
    home_page: string;
    about_page: string;
    service_pages: string[];
    blog_articles: string[];
    totalPagesCrawled?: number;
    reachedLimit?: boolean;
  } | null>(null);
  const [showAutoPopulateDialog, setShowAutoPopulateDialog] = useState(false);
  const [pendingAutoPopulateData, setPendingAutoPopulateData] = useState<BrandGuidelineContent | null>(null);
  const [autoPopulateSource, setAutoPopulateSource] = useState<"url" | "pdf">("url");
  const [showExtractWarningDialog, setShowExtractWarningDialog] = useState(false);
  const [showServiceFallbackDialog, setShowServiceFallbackDialog] = useState(false);
  const [showBlogFallbackDialog, setShowBlogFallbackDialog] = useState(false);
  const [showUnifiedFallbackModal, setShowUnifiedFallbackModal] = useState(false);
  const [missingPages, setMissingPages] = useState<{ about?: boolean; products?: boolean; blogs?: boolean }>({});
  const [showTaggingMode, setShowTaggingMode] = useState(false);
  const [crawledUrlsForTagging, setCrawledUrlsForTagging] = useState<{ url: string; title: string }[]>([]);
  const [cachedHomepageUrl, setCachedHomepageUrl] = useState<string>("");
  const [crawlJobId, setCrawlJobId] = useState<string | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showRecrawlDialog, setShowRecrawlDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const lastSentToParentRef = useRef<string>("");

  const { data: regulatoryGuidelines = [] } = useQuery<GuidelineProfile[]>({
    queryKey: ["/api/guideline-profiles?type=regulatory"],
  });

  // Fetch existing extracted context
  interface ExtractedContext {
    home?: any;
    about?: any;
    services?: any[];
    blogs?: any[];
    totalPages: number;
    extractedAt: string | null;
  }

  const { data: existingContext, refetch: refetchExtractedContext } = useQuery<ExtractedContext>({
    queryKey: ['/api/guideline-profiles', profileId, 'extracted-context'],
    enabled: !!profileId,
  });

  // Fetch the profile data to check for cached crawled URLs
  const { data: profileData } = useQuery<GuidelineProfile>({
    queryKey: ['/api/guideline-profiles', profileId],
    enabled: !!profileId,
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
      
      // Only update formData if the incoming value is different from what we last sent to parent
      // This prevents infinite loops when parent echoes back our onChange
      const newDataString = JSON.stringify(data);
      if (newDataString !== lastSentToParentRef.current) {
        setFormData(data);
      }
      
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
      
      // Only call onChange if formData actually changed from what we last sent
      const currentFormDataString = JSON.stringify(formData);
      if (currentFormDataString !== lastSentToParentRef.current) {
        lastSentToParentRef.current = currentFormDataString;
        onChange(formData);
      }
    }
  }, [formData, isLegacy, onChange]);

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

  const duplicateTargetAudience = (index: number) => {
    const audiences = [...(formData.target_audience || [])];
    const audienceToDuplicate = audiences[index];
    // Deep clone to avoid shared references for arrays
    const duplicatedAudience = {
      ...audienceToDuplicate,
      interests: audienceToDuplicate.interests ? [...audienceToDuplicate.interests] : [],
      other_keywords: audienceToDuplicate.other_keywords ? [...audienceToDuplicate.other_keywords] : [],
      age_range: audienceToDuplicate.age_range ? { ...audienceToDuplicate.age_range } : undefined,
    };
    audiences.splice(index + 1, 0, duplicatedAudience);
    updateField("target_audience", audiences);
  };

  const hasExistingData = (): boolean => {
    return !!(
      formData.tone_of_voice ||
      formData.style_preferences ||
      formData.visual_style ||
      (formData.color_palette && formData.color_palette.length > 0) ||
      (formData.target_audience && formData.target_audience.length > 0) ||
      (formData.brand_personality && formData.brand_personality.length > 0) ||
      (formData.content_themes && formData.content_themes.length > 0) ||
      formData.language_style
    );
  };

  const mergeData = (newData: BrandGuidelineContent, fillEmptyOnly: boolean): BrandGuidelineContent => {
    if (!fillEmptyOnly) {
      // Overwrite all - simple merge
      return { ...formData, ...newData };
    }

    // Fill empty only - preserve existing values
    const merged: BrandGuidelineContent = { ...formData };
    
    Object.keys(newData).forEach((key) => {
      const fieldKey = key as keyof BrandGuidelineContent;
      const existingValue = merged[fieldKey];
      const newValue = newData[fieldKey];

      // Only fill if current value is empty/null/undefined
      if (existingValue === null || existingValue === undefined || existingValue === '' ||
          (Array.isArray(existingValue) && existingValue.length === 0)) {
        (merged as any)[fieldKey] = newValue;
      }
    });

    return merged;
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
      
      const res = await apiRequest(
        "POST",
        "/api/guideline-profiles/auto-populate",
        { domainUrl }
      );
      const response = await res.json() as BrandGuidelineContent;

      // Check if there's existing data
      if (hasExistingData()) {
        // Show dialog to ask user's preference
        setPendingAutoPopulateData(response);
        setAutoPopulateSource("url");
        setShowAutoPopulateDialog(true);
      } else {
        // No existing data, apply directly
        const updatedData = { ...formData, ...response };
        setFormData(updatedData);
        onChange(updatedData);

        const analyzedPagesInfo = response.analyzed_pages && response.analyzed_pages.length > 0
          ? `\n\nAnalyzed ${response.analyzed_pages.length} page(s):\n${response.analyzed_pages.map(url => `• ${url}`).join('\n')}`
          : "";

        toast({
          title: "Success!",
          description: `Brand guidelines have been auto-populated from your website.${analyzedPagesInfo}`,
        });
      }
    } catch (error: any) {
      console.error("Auto-populate error:", error);
      showAdminErrorToast(
        "Auto-populate Failed",
        error.message || "Failed to analyze website. Please check the URL and try again.",
        user?.isAdmin || false,
        {
          domainUrl,
          feature: "auto-populate-brand-guidelines"
        }
      );
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

      const res = await apiRequest(
        "POST",
        "/api/guideline-profiles/auto-populate-pdf",
        { pdfBase64: base64 }
      );
      const response = await res.json() as BrandGuidelineContent;

      // Check if there's existing data
      if (hasExistingData()) {
        // Show dialog to ask user's preference
        setPendingAutoPopulateData(response);
        setAutoPopulateSource("pdf");
        setShowAutoPopulateDialog(true);
      } else {
        // No existing data, apply directly
        const updatedData = { ...formData, ...response };
        setFormData(updatedData);
        onChange(updatedData);

        toast({
          title: "Success!",
          description: "Brand guidelines have been extracted from your PDF.",
        });
      }
    } catch (error: any) {
      console.error("PDF upload error:", error);
      showAdminErrorToast(
        "PDF Upload Failed",
        error.message || "Failed to analyze PDF. Please try again.",
        user?.isAdmin || false,
        {
          fileName: file.name,
          fileSize: file.size,
          feature: "auto-populate-brand-guidelines-pdf"
        }
      );
    } finally {
      setIsAutoPopulating(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleApplyAutoPopulate = (fillEmptyOnly: boolean) => {
    if (!pendingAutoPopulateData) return;

    const updatedData = mergeData(pendingAutoPopulateData, fillEmptyOnly);
    setFormData(updatedData);
    onChange(updatedData);

    const source = autoPopulateSource === "url" ? "website" : "PDF";
    const mode = fillEmptyOnly ? "filled empty fields" : "overwritten all fields";
    
    toast({
      title: "Success!",
      description: `Brand guidelines from ${source} have been applied (${mode}).`,
    });

    // Reset dialog state
    setShowAutoPopulateDialog(false);
    setPendingAutoPopulateData(null);
  };

  const handleDiscoverPages = async () => {
    let homepageUrl = formData.domain_url?.trim();
    
    if (!homepageUrl) {
      toast({
        title: "Homepage URL Required",
        description: "Please enter a domain URL first to discover context pages.",
        variant: "destructive",
      });
      return;
    }

    // Basic client-side normalization - add https if no protocol
    if (!homepageUrl.match(/^https?:\/\//i)) {
      homepageUrl = `https://${homepageUrl}`;
      updateField("domain_url", homepageUrl);
    }

    // Check if we have cached crawled URLs
    if (profileData?.crawledUrls && Array.isArray(profileData.crawledUrls) && profileData.crawledUrls.length > 0) {
      setCachedHomepageUrl(homepageUrl);
      setShowRecrawlDialog(true);
      return;
    }

    // No cached results, start fresh crawl
    await startCrawl(homepageUrl);
  };

  const startCrawl = async (homepageUrl: string) => {
    try {
      setIsDiscoveringPages(true);
      setCachedHomepageUrl(homepageUrl); // Cache for fallback scenarios
      
      // Start the background crawl job
      const res = await apiRequest(
        "POST",
        "/api/crawl/start",
        { 
          homepageUrl,
          guidelineProfileId: profileId,
          exclusionPatterns: formData.exclusion_patterns || []
        }
      );
      const { jobId } = await res.json() as { jobId: string; message: string };

      // Show progress modal
      setCrawlJobId(jobId);
      setShowProgressModal(true);
    } catch (error: any) {
      console.error("Discover pages error:", error);
      showAdminErrorToast(
        "Discovery Failed",
        error.message || "Failed to start page discovery. Please check the URL and try again.",
        user?.isAdmin || false,
        {
          homepageUrl,
          feature: "discover-context-pages"
        }
      );
      setIsDiscoveringPages(false);
    }
  };

  const handleUsePreviousResults = () => {
    setShowRecrawlDialog(false);
    if (profileData?.crawledUrls && Array.isArray(profileData.crawledUrls)) {
      // Determine which pages are missing from context_urls
      const contextUrls = formData.context_urls || {};
      const aboutMissing = !contextUrls.about_page;
      const servicesMissing = !contextUrls.service_pages || contextUrls.service_pages.length === 0;
      const blogsMissing = !contextUrls.blog_articles || contextUrls.blog_articles.length === 0;

      if (aboutMissing || servicesMissing || blogsMissing) {
        setMissingPages({
          about: aboutMissing,
          products: servicesMissing,
          blogs: blogsMissing,
        });
        setCrawledUrlsForTagging(profileData.crawledUrls as { url: string; title: string }[]);
        setShowTaggingMode(true);
      } else {
        toast({
          title: "All Pages Already Set",
          description: "You already have all context pages configured. You can use the tagging page to review them.",
        });
      }
    }
  };

  const handleRecrawl = async () => {
    setShowRecrawlDialog(false);
    await startCrawl(cachedHomepageUrl || formData.domain_url || "");
  };

  const handleCrawlComplete = async (results: any) => {
    if (!results) return;

    setIsDiscoveringPages(false);
    setShowProgressModal(false);
    setDiscoveredPages(results);
    
    // Auto-populate the form with discovered URLs
    updateField("context_urls", {
      home_page: results.home_page,
      about_page: results.about_page,
      service_pages: results.service_pages,
      blog_articles: results.blog_articles,
    });

    // Save crawled URLs to the database if we have them
    if (profileId && results.crawledUrls && results.crawledUrls.length > 0) {
      try {
        await apiRequest(
          "PATCH",
          `/api/guideline-profiles/${profileId}`,
          { crawledUrls: results.crawledUrls }
        );
      } catch (error) {
        console.error("Failed to save crawled URLs:", error);
      }
    }

    const aboutMissing = !results.about_page;
    const servicesMissing = results.service_pages.length < 10;
    const blogsMissing = results.blog_articles.length < 20;
    const reachedLimit = results.reachedLimit === true;

    toast({
      title: "Pages Discovered!",
      description: `Found ${results.about_page ? 1 : 0} about page, ${results.service_pages.length} product/service pages, and ${results.blog_articles.length} blog articles after crawling ${results.totalPagesCrawled || 0} pages. Review and edit before extracting.`,
    });

    // Show unified fallback modal if we reached the limit and have missing pages
    if (reachedLimit && (aboutMissing || servicesMissing || blogsMissing)) {
      setMissingPages({
        about: aboutMissing,
        products: servicesMissing,
        blogs: blogsMissing,
      });
      setCrawledUrlsForTagging(results.crawledUrls || []);
      setShowUnifiedFallbackModal(true);
    }
  };

  const handleProgressModalClose = () => {
    setShowProgressModal(false);
    setIsDiscoveringPages(false);
  };

  const doExtractContext = async () => {
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
        "POST",
        `/api/guideline-profiles/${profileId}/extract-context`,
        { contextUrls: formData.context_urls }
      ) as unknown as { success: boolean; processed: number; failed: number; errors: any[] };

      if (response.success) {
        toast({
          title: "Context Extracted Successfully",
          description: `Processed ${response.processed} pages${response.failed > 0 ? `, ${response.failed} failed` : ''}.`,
        });
        // Refetch the extracted context to update the UI
        refetchExtractedContext();
      }
    } catch (error: any) {
      console.error("Extract context error:", error);
      showAdminErrorToast(
        "Context Extraction Failed",
        error.message || "Failed to extract context from pages.",
        user?.isAdmin || false,
        {
          profileId,
          contextUrls: formData.context_urls,
          feature: "extract-context-pages"
        }
      );
    } finally {
      setIsExtractingContext(false);
    }
  };

  const handleExtractContext = async () => {
    // Check if there's existing extracted content
    if (existingContext && existingContext.totalPages > 0) {
      // Show warning dialog
      setShowExtractWarningDialog(true);
    } else {
      // No existing content, proceed directly
      await doExtractContext();
    }
  };

  const confirmExtractContext = async () => {
    setShowExtractWarningDialog(false);
    await doExtractContext();
  };

  const handleServiceFallback = async (exampleServiceUrl: string) => {
    try {
      const res = await apiRequest(
        "POST",
        "/api/guideline-profiles/find-services-by-pattern",
        { exampleServiceUrl, homepageUrl: cachedHomepageUrl }
      );
      const data = await res.json() as { service_pages: string[] };
      
      // Update context URLs with found service pages
      const currentUrls = formData.context_urls || {};
      updateField("context_urls", {
        ...currentUrls,
        service_pages: data.service_pages,
      });
      
      toast({
        title: "Product/Service Pages Found!",
        description: `Found ${data.service_pages.length} pages matching the URL pattern.`,
      });
      
      // Show blog dialog next if blogs are missing
      if (!formData.context_urls?.blog_articles || formData.context_urls.blog_articles.length === 0) {
        setShowBlogFallbackDialog(true);
      }
    } catch (error: any) {
      showAdminErrorToast(
        "Pattern Matching Failed",
        error.message || "Failed to find product/service pages by pattern.",
        user?.isAdmin || false,
        { exampleServiceUrl, feature: "find-services-by-pattern" }
      );
    }
  };

  const handleBlogFallback = async (blogHomeUrl: string) => {
    try {
      const res = await apiRequest(
        "POST",
        "/api/guideline-profiles/extract-blog-posts",
        { blogHomeUrl }
      );
      const data = await res.json() as { blog_articles: string[] };
      
      // Update context URLs with found blog articles
      const currentUrls = formData.context_urls || {};
      updateField("context_urls", {
        ...currentUrls,
        blog_articles: data.blog_articles,
      });
      
      toast({
        title: "Blog Posts Found!",
        description: `Extracted ${data.blog_articles.length} blog article links.`,
      });
    } catch (error: any) {
      showAdminErrorToast(
        "Blog Extraction Failed",
        error.message || "Failed to extract blog posts.",
        user?.isAdmin || false,
        { blogHomeUrl, feature: "extract-blog-posts" }
      );
    }
  };

  const handleTagCrawledPages = () => {
    setShowUnifiedFallbackModal(false);
    setShowTaggingMode(true);
  };

  const handleAddManually = () => {
    setShowUnifiedFallbackModal(false);
    // The user is already on the form, they can navigate to the Context Pages tab
  };

  const handleTaggingSubmit = (taggedUrls: { about?: string; products: string[]; blogs: string[] }) => {
    // Merge tagged URLs with existing context_urls
    const currentUrls = formData.context_urls || {};
    updateField("context_urls", {
      ...currentUrls,
      about_page: taggedUrls.about || currentUrls.about_page,
      service_pages: taggedUrls.products.length > 0 ? taggedUrls.products : currentUrls.service_pages,
      blog_articles: taggedUrls.blogs.length > 0 ? taggedUrls.blogs : currentUrls.blog_articles,
    });

    toast({
      title: "URLs Tagged Successfully!",
      description: `Tagged ${taggedUrls.about ? 1 : 0} about page, ${taggedUrls.products.length} product/service pages, and ${taggedUrls.blogs.length} blog articles.`,
    });

    setShowTaggingMode(false);
  };

  const handleTaggingBack = () => {
    setShowTaggingMode(false);
  };

  // Show URL tagging page if in tagging mode
  if (showTaggingMode) {
    return (
      <UrlTaggingPage
        crawledUrls={crawledUrlsForTagging}
        onSubmit={handleTaggingSubmit}
        onBack={handleTaggingBack}
        missingPages={missingPages}
      />
    );
  }

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

      {/* Domain URL - Outside of tabs, applies to all sections */}
      <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
        <Label htmlFor="domain-url" className="text-gray-200 text-sm font-medium">Domain URL</Label>
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
        <p className="text-xs text-gray-400 mt-2">
          Enter your website URL and click Auto Populate, or upload a PDF brand guideline document to extract information automatically.
        </p>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="flex flex-wrap w-full bg-gray-800 h-auto p-1 gap-1">
          <TabsTrigger value="basic" data-testid="tab-basic-info" className="flex-1 min-w-[120px]">Basic Info</TabsTrigger>
          <TabsTrigger value="visual" data-testid="tab-visual-identity" className="flex-1 min-w-[120px]">Visual Identity</TabsTrigger>
          <TabsTrigger value="audience" data-testid="tab-audience" className="flex-1 min-w-[120px]">Audience</TabsTrigger>
          <TabsTrigger value="voice" data-testid="tab-brand-voice" className="flex-1 min-w-[120px]">Brand Voice</TabsTrigger>
          <TabsTrigger value="context" data-testid="tab-context" className="flex-1 min-w-[120px]">Context</TabsTrigger>
          <TabsTrigger value="regulatory" data-testid="tab-regulatory" className="flex-1 min-w-[120px]">Regulatory</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6 mt-6">
          <div className="p-5 bg-gray-900/50 border-2 border-gray-600 rounded-lg">
            <Label htmlFor="tone-of-voice" className="text-gray-200 font-semibold text-sm">Tone of Voice</Label>
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

          <div className="p-5 bg-gray-900/50 border-2 border-gray-600 rounded-lg">
            <Label htmlFor="style-preferences" className="text-gray-200 font-semibold text-sm">Style Preferences</Label>
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

        <TabsContent value="visual" className="space-y-6 mt-6">
          <div className="p-5 bg-gray-900/50 border-2 border-gray-600 rounded-lg">
            <Label className="text-gray-200 font-semibold text-sm">Color Palette</Label>
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

          <div className="p-5 bg-gray-900/50 border-2 border-gray-600 rounded-lg">
            <Label htmlFor="visual-style" className="text-gray-200 font-semibold text-sm">Visual Style</Label>
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

        <TabsContent value="audience" className="space-y-6 mt-6">
          <div className="p-5 bg-gray-900/50 border-2 border-gray-600 rounded-lg">
            <Label className="text-gray-200 font-semibold text-sm">Target Audiences</Label>
            <div className="space-y-4 mt-3">
              {(formData.target_audience || []).map((audience, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-800 rounded-lg border border-gray-700 space-y-3"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold text-gray-200">Audience {index + 1}</h4>
                    <div className="flex gap-1">
                      <Button
                        data-testid={`button-duplicate-audience-${index}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateTargetAudience(index)}
                        title="Duplicate audience"
                        className="text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        data-testid={`button-remove-audience-${index}`}
                        variant="destructive"
                        size="sm"
                        onClick={() => removeTargetAudience(index)}
                        title="Remove audience"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
                    <Label htmlFor={`geography-${index}`} className="text-gray-300 text-xs">Target Geography</Label>
                    <Input
                      id={`geography-${index}`}
                      data-testid={`input-audience-geography-${index}`}
                      value={audience.geography || ""}
                      onChange={(e) => updateTargetAudience(index, "geography", e.target.value)}
                      placeholder="e.g., UK, United States, Europe, Asia-Pacific"
                      className="mt-1 bg-gray-900 border-gray-600 text-white"
                    />
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

        <TabsContent value="voice" className="space-y-6 mt-6">
          <div className="p-5 bg-gray-900/50 border-2 border-gray-600 rounded-lg">
            <Label className="text-gray-200 font-semibold text-sm">
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

          <div className="p-5 bg-gray-900/50 border-2 border-gray-600 rounded-lg">
            <Label className="text-gray-200 font-semibold text-sm">
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

          <div className="p-5 bg-gray-900/50 border-2 border-gray-600 rounded-lg">
            <Label htmlFor="language-style" className="text-gray-200 font-semibold text-sm">Language Style</Label>
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

        <TabsContent value="context" className="space-y-6 mt-6">
          <div className="space-y-6">
            <div className="p-5 bg-blue-950/20 border-2 border-blue-700 rounded-lg">
              <h4 className="text-blue-400 font-semibold mb-2">Brand Context Pages</h4>
              <p className="text-sm text-gray-300 mb-3">
                Provide URLs to key pages of your website. We'll extract the main content from each page and convert it to markdown format for use in content generation.
              </p>
              <Button
                type="button"
                data-testid="button-discover-context-pages"
                onClick={handleDiscoverPages}
                disabled={isDiscoveringPages || !formData.domain_url}
                className="bg-purple-600 hover:bg-purple-700 text-white w-full"
              >
                {isDiscoveringPages ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Discovering Pages...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Auto-Discover Context Pages
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-400 mt-2">
                {formData.domain_url 
                  ? "We'll crawl your website to find About, Services, and Blog pages automatically."
                  : "Enter a Domain URL in the Basic Info tab first to use auto-discovery."}
              </p>
            </div>

            <div className="p-5 bg-gray-900/50 border-2 border-gray-600 rounded-lg">
              <Label htmlFor="exclusion-patterns" className="text-gray-200 font-semibold text-sm">
                URL Exclusion Patterns (Optional)
              </Label>
              <p className="text-xs text-gray-400 mt-1 mb-2">
                Skip unwanted pages during auto-discovery. Use * as wildcard. One pattern per line.
              </p>
              <Textarea
                id="exclusion-patterns"
                data-testid="textarea-exclusion-patterns"
                value={formData.exclusion_patterns?.join('\n') || ''}
                onChange={(e) => {
                  const patterns = e.target.value.split('\n').map(p => p.trim()).filter(p => p);
                  updateField('exclusion_patterns', patterns.length > 0 ? patterns : undefined);
                }}
                placeholder={`*/page=*\n*/category/*\n*/tag/*\n*/author/*\n*/search*`}
                rows={4}
                className="mt-2 bg-gray-800 border-gray-700 text-white font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                Examples: <code className="bg-gray-800 px-1 py-0.5 rounded">*/page=*</code> excludes paginated pages, <code className="bg-gray-800 px-1 py-0.5 rounded">*/category/*</code> excludes category pages
              </p>
            </div>

            <div className="p-5 bg-gray-900/50 border-2 border-gray-600 rounded-lg">
              <Label htmlFor="context-home-page" className="text-gray-200 font-semibold text-sm">Home Page URL</Label>
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

            <div className="p-5 bg-gray-900/50 border-2 border-gray-600 rounded-lg">
              <Label htmlFor="context-about-page" className="text-gray-200 font-semibold text-sm">About Us Page URL</Label>
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

            <div className="p-5 bg-gray-900/50 border-2 border-gray-600 rounded-lg">
              <Label className="text-gray-200 font-semibold text-sm">Service/Product Pages (up to 10)</Label>
              <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                {[...(formData.context_urls?.service_pages || []), ""].slice(0, 10).map((url, index) => (
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

            <div className="p-5 bg-gray-900/50 border-2 border-gray-600 rounded-lg">
              <Label className="text-gray-200 font-semibold text-sm">Blog Articles/Resources (up to 20)</Label>
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

            {existingContext && existingContext.totalPages > 0 && (
              <div className="p-4 bg-blue-950/30 border-2 border-blue-700/50 rounded-lg" data-testid="existing-context-info">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-blue-300 mb-1">Existing Extracted Content</h4>
                    <p className="text-xs text-gray-300 mb-2">
                      {existingContext.totalPages} pages already extracted{existingContext.extractedAt && ` on ${new Date(existingContext.extractedAt).toLocaleDateString()}`}
                    </p>
                    <div className="text-xs text-gray-400 space-y-1">
                      {existingContext.home && <div>• Home page</div>}
                      {existingContext.about && <div>• About page</div>}
                      {existingContext.services?.length > 0 && <div>• {existingContext.services.length} product/service page{existingContext.services.length > 1 ? 's' : ''}</div>}
                      {existingContext.blogs?.length > 0 && <div>• {existingContext.blogs.length} blog article{existingContext.blogs.length > 1 ? 's' : ''}</div>}
                    </div>
                    <p className="text-xs text-yellow-400 mt-2">
                      ⚠️ Extracting again will replace all existing content
                    </p>
                  </div>
                </div>
              </div>
            )}

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

        <TabsContent value="regulatory" className="space-y-6 mt-6">
          <div className="space-y-6">
            <div className="p-5 bg-gray-900/50 border-2 border-gray-600 rounded-lg">
              <Label className="text-gray-200 font-semibold text-sm">Attach Regulatory Guideline</Label>
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

      {/* Auto-populate options dialog */}
      <AlertDialog open={showAutoPopulateDialog} onOpenChange={setShowAutoPopulateDialog}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-100">Auto-Populate Options</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              You have existing brand guideline data. How would you like to apply the new information from {autoPopulateSource === "url" ? "the website" : "the PDF"}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            <div className="p-3 bg-blue-950/30 border border-blue-800 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-400 mb-1">Fill Empty Fields Only</h4>
              <p className="text-xs text-gray-400">
                Keep all your existing data and only populate fields that are currently empty.
              </p>
            </div>
            <div className="p-3 bg-amber-950/30 border border-amber-800 rounded-lg">
              <h4 className="text-sm font-semibold text-amber-400 mb-1">Overwrite All Fields</h4>
              <p className="text-xs text-gray-400">
                Replace all existing data with the new information extracted from the {autoPopulateSource === "url" ? "website" : "PDF"}.
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 hover:bg-gray-700 text-gray-200" data-testid="button-cancel-autopopulate">
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={() => handleApplyAutoPopulate(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-fill-empty-only"
            >
              Fill Empty Only
            </Button>
            <AlertDialogAction
              onClick={() => handleApplyAutoPopulate(false)}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              data-testid="button-overwrite-all"
            >
              Overwrite All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Extract warning dialog */}
      <AlertDialog open={showExtractWarningDialog} onOpenChange={setShowExtractWarningDialog}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-100">Replace Existing Content?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              You have {existingContext?.totalPages || 0} pages of content already extracted. Extracting again will permanently delete all existing content and replace it with the new extraction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="p-4 bg-amber-950/30 border border-amber-800 rounded-lg my-4">
            <p className="text-sm text-amber-400 font-semibold mb-2">⚠️ This action cannot be undone</p>
            <p className="text-xs text-gray-400">
              All previously extracted page content and generated embeddings will be permanently deleted.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 hover:bg-gray-700 text-gray-200" data-testid="button-cancel-extract">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmExtractContext}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-confirm-extract"
            >
              Replace Content
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fallback Dialogs for Manual Input */}
      <ManualServiceUrlDialog
        open={showServiceFallbackDialog}
        onOpenChange={setShowServiceFallbackDialog}
        onSubmit={handleServiceFallback}
      />
      
      <ManualBlogUrlDialog
        open={showBlogFallbackDialog}
        onOpenChange={setShowBlogFallbackDialog}
        onSubmit={handleBlogFallback}
      />

      {/* Unified Fallback Modal */}
      <UnifiedFallbackModal
        open={showUnifiedFallbackModal}
        onOpenChange={setShowUnifiedFallbackModal}
        onTagCrawledPages={handleTagCrawledPages}
        onAddManually={handleAddManually}
        missingPages={missingPages}
      />

      {/* Recrawl dialog */}
      <AlertDialog open={showRecrawlDialog} onOpenChange={setShowRecrawlDialog}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-100">Use Previous Crawl Results?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              We found {Array.isArray(profileData?.crawledUrls) ? profileData.crawledUrls.length : 0} previously crawled URLs from this website. 
              You can use these to tag your pages, or run a fresh crawl.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 my-4">
            <div className="p-3 bg-blue-950/30 border border-blue-800 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-400 mb-1">Use Previous Results</h4>
              <p className="text-xs text-gray-400">
                Open the tagging page with the previously crawled URLs to classify your pages.
              </p>
            </div>
            <div className="p-3 bg-purple-950/30 border border-purple-800 rounded-lg">
              <h4 className="text-sm font-semibold text-purple-400 mb-1">Re-crawl Website</h4>
              <p className="text-xs text-gray-400">
                Start a fresh crawl to discover the latest pages from your website (may take a few minutes).
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 hover:bg-gray-700 text-gray-200" data-testid="button-cancel-recrawl">
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={handleUsePreviousResults}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-use-previous"
            >
              Use Previous Results
            </Button>
            <AlertDialogAction
              onClick={handleRecrawl}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              data-testid="button-recrawl"
            >
              Re-crawl Website
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProgressModal
        jobId={crawlJobId}
        open={showProgressModal}
        onClose={handleProgressModalClose}
        onComplete={handleCrawlComplete}
      />
    </div>
  );
}
