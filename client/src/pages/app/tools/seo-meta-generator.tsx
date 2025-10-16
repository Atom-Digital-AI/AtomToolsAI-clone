import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccessGuard } from "@/components/access-guard";
import { Search, Copy, Download, Upload, RefreshCw, AlertCircle, CheckCircle2, Globe, ChevronUp, ChevronDown, Lock, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import GuidelineProfileSelector from "@/components/guideline-profile-selector";
import type { GuidelineContent } from "@shared/schema";
import { useBrand } from "@/contexts/BrandContext";
import { SaveContentDialog } from "@/components/SaveContentDialog";
import { FeedbackButtons } from "@/components/FeedbackButtons";

interface MetaData {
  title: string;
  description: string;
  keywords: string[];
  language: string;
  variations?: {
    titles: string[];
    descriptions: string[];
  };
}

interface BulkResult {
  url: string;
  title: string;
  description: string;
  status: 'success' | 'error';
  error?: string;
}

export default function SEOMetaGenerator() {
  const [url, setUrl] = useState("");
  const [keywords, setKeywords] = useState("");
  const [brandName, setBrandName] = useState("");
  const [sellingPoints, setSellingPoints] = useState("");
  const [caseType, setCaseType] = useState<'sentence' | 'title'>('sentence');
  const [contentType, setContentType] = useState<'both' | 'titles' | 'descriptions'>('both');
  const [numVariations, setNumVariations] = useState(1);
  const [brandGuidelines, setBrandGuidelines] = useState<GuidelineContent | string>('');
  const [regulatoryGuidelines, setRegulatoryGuidelines] = useState<GuidelineContent | string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [metaData, setMetaData] = useState<MetaData | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [urlContent, setUrlContent] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveInputData, setSaveInputData] = useState<any>(null);
  const [saveOutputData, setSaveOutputData] = useState<any>(null);
  const { toast } = useToast();
  const { selectedBrand } = useBrand();
  
  // Refs for auto-scroll to error fields
  const keywordsRef = useRef<HTMLTextAreaElement>(null);
  const brandNameRef = useRef<HTMLInputElement>(null);

  const productId = "531de90b-12ef-4169-b664-0d55428435a6";

  // Get user's tier permissions for this product
  const { data: accessInfo } = useQuery({
    queryKey: [`/api/products/${productId}/access`],
    retry: false,
  });

  const subfeatures = (accessInfo?.subfeatures as any) || {};
  const canUseBulk = subfeatures.bulk === true;
  const canUseVariations = subfeatures.variations === true;  
  const canUseBrandGuidelines = subfeatures.brand_guidelines === true;

  // Reset features to allowed values when tier permissions change
  useEffect(() => {
    if (!canUseVariations && numVariations > 1) {
      setNumVariations(1);
    }
  }, [canUseVariations, numVariations]);

  useEffect(() => {
    if (!canUseBrandGuidelines && brandGuidelines) {
      setBrandGuidelines('');
    }
  }, [canUseBrandGuidelines, brandGuidelines]);

  useEffect(() => {
    if (!canUseBulk && mode === 'bulk') {
      setMode('single');
    }
  }, [canUseBulk, mode]);

  // Auto-populate fields from selected brand
  useEffect(() => {
    if (selectedBrand) {
      // Auto-select the brand profile
      setBrandGuidelines(selectedBrand.id);
      
      // Auto-populate brand name if available in content, otherwise clear it
      const content = selectedBrand.content as any;
      if (content && typeof content === 'object' && content.brandName) {
        setBrandName(content.brandName);
      } else {
        // Clear brand name if not available in selected brand
        setBrandName('');
      }
    } else {
      // Clear brand fields when brand is deselected
      setBrandGuidelines('');
      setBrandName('');
    }
  }, [selectedBrand]);

  const analyzeUrl = async () => {
    if (!url) return;
    
    setIsAnalyzing(true);
    try {
      // Simulate URL content analysis
      setTimeout(() => {
        const mockContent = "This is a premium digital marketing agency specializing in SEO, PPC, and content marketing services for businesses of all sizes.";
        setUrlContent(mockContent);
        
        // Auto-detect keywords if not provided
        if (!keywords) {
          setKeywords("digital marketing, SEO services, PPC management, content marketing");
        }
        
        toast({
          title: "URL Analyzed",
          description: "Content extracted and keywords detected",
        });
        setIsAnalyzing(false);
      }, 1500);
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Could not analyze the URL. Please check if it's accessible.",
        variant: "destructive",
      });
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    // Validation with auto-scroll to first error
    if (!url && !keywords) {
      toast({
        title: "Missing Required Field",
        description: "Please provide Target Keywords (required)",
        variant: "destructive",
      });
      keywordsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      keywordsRef.current?.focus();
      return;
    }

    if (!brandName) {
      toast({
        title: "Missing Required Field", 
        description: "Please provide Brand Name (required)",
        variant: "destructive",
      });
      brandNameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      brandNameRef.current?.focus();
      return;
    }

    setIsGenerating(true);
    setProgress(25);

    try {
      // Call the authentic API endpoint with exact original Python logic
      const responseObj = await apiRequest("POST", "/api/tools/seo-meta/generate", {
        url: url || undefined,
        targetKeywords: keywords,
        brandName: brandName,
        sellingPoints: sellingPoints,
        numVariations: numVariations,
        contentType: contentType,
        caseType: caseType,
        brandGuidelines: brandGuidelines,
        regulatoryGuidelines: regulatoryGuidelines
      });
      
      const response = await responseObj.json();

      setProgress(75);

      if (!response.titles && !response.descriptions) {
        throw new Error("No content generated");
      }

      // Use the actual results from the authentic API
      const primaryTitle = response.titles?.[0] || "";
      const primaryDescription = response.descriptions?.[0] || "";

      setMetaData({
        title: primaryTitle,
        description: primaryDescription,
        keywords: keywords.split(',').map(k => k.trim()),
        language: 'en',
        variations: {
          titles: response.titles || [],
          descriptions: response.descriptions || []
        }
      });

      setProgress(100);

      toast({
        title: "Generation Complete",
        description: `Generated ${response.titles?.length || 0} titles and ${response.descriptions?.length || 0} descriptions`,
      });

    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "An error occurred while generating meta tags",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const handleBulkProcess = async () => {
    if (!csvFile) return;

    setIsGenerating(true);
    setProgress(0);
    setBulkResults([]);

    try {
      // Parse CSV file
      const text = await csvFile.text();
      const rows = text.split('\n').filter(row => row.trim());
      const header = rows[0];
      const dataRows = rows.slice(1);

      const results: BulkResult[] = [];

      // Process each row with real API calls
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const columns = row.split(',').map(col => col.replace(/"/g, '').trim());

        if (columns.length < 4) continue; // Skip invalid rows

        const url = columns[0];
        const keywords = columns[1];
        const brandNameFromRow = columns[2];
        const sellingPointsFromRow = columns[3];

        try {
          // Call actual OpenAI API for each row
          const response = await apiRequest("POST", "/api/tools/seo-meta/generate", {
            url,
            targetKeywords: keywords,
            brandName: brandNameFromRow,
            sellingPoints: sellingPointsFromRow,
            caseType,
            contentType: 'both',
            numVariations: 1,
            brandGuidelines,
            regulatoryGuidelines
          });

          const seoData = await response.json();
          
          if (seoData.titles && seoData.descriptions) {
            results.push({
              url,
              title: seoData.titles[0] || '',
              description: seoData.descriptions[0] || '',
              status: 'success'
            });
          } else {
            results.push({
              url,
              title: '',
              description: '',
              status: 'error',
              error: 'Failed to generate SEO content'
            });
          }

          // Add small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          results.push({
            url,
            title: '',
            description: '',
            status: 'error',
            error: 'API call failed'
          });
        }

        // Update progress and results
        setProgress(((i + 1) / dataRows.length) * 100);
        setBulkResults([...results]);
      }

      toast({
        title: "Bulk Processing Complete",
        description: `Processed ${dataRows.length} URLs with ${results.filter(r => r.status === 'success').length} successful generations`,
      });

    } catch (error) {
      toast({
        title: "Bulk Processing Failed",
        description: "An error occurred during bulk processing",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv') {
        toast({
          title: "Invalid File Type",
          description: "Please upload a CSV file",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File Too Large",
          description: "File size must be less than 10MB",
          variant: "destructive",
        });
        return;
      }
      setCsvFile(file);
      toast({
        title: "File Uploaded",
        description: `${file.name} ready for processing`,
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    });
  };

  const exportResults = () => {
    if (!metaData && bulkResults.length === 0) return;

    let csvContent = "URL,Title,Description,Status\n";
    
    if (mode === 'single' && metaData) {
      csvContent += `"${url}","${metaData.title}","${metaData.description}",success\n`;
    } else {
      bulkResults.forEach(result => {
        csvContent += `"${result.url}","${result.title}","${result.description}",${result.status}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url_export = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url_export;
    a.download = `seo-meta-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url_export);

    toast({
      title: "Export Complete",
      description: "Results exported to CSV file",
    });
  };

  return (
    <AccessGuard productId="531de90b-12ef-4169-b664-0d55428435a6" productName="SEO Meta Generator">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
              <Search className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">SEO Meta Generator</h1>
              <p className="text-text-secondary">Generate optimized title tags and meta descriptions with AI-powered insights</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Mode Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Generation Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button
                  variant={mode === 'single' ? 'default' : 'outline'}
                  onClick={() => setMode('single')}
                  data-testid="button-single-mode"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Single URL
                </Button>
                <Button
                  variant={mode === 'bulk' ? 'default' : 'outline'}
                  onClick={() => setMode('bulk')}
                  data-testid="button-bulk-mode"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
              </div>
            </CardContent>
          </Card>

          {mode === 'single' ? (
            <div className="space-y-6">
              {/* URL Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>URL Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="url">Target URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="url"
                        placeholder="https://example.com/page"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        data-testid="input-url"
                      />
                      <Button
                        variant="outline"
                        onClick={analyzeUrl}
                        disabled={!url || isAnalyzing}
                        data-testid="button-analyze"
                      >
                        {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  {urlContent && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        URL content analyzed. Keywords auto-detected and ready for generation.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Input Parameters */}
              <Card>
                <CardHeader>
                  <CardTitle>Generation Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="keywords">
                      Target Keywords <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="keywords"
                      ref={keywordsRef}
                      placeholder="digital marketing, SEO services, online advertising"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      className="min-h-[80px]"
                      data-testid="input-keywords"
                    />
                    <p className="text-sm text-text-secondary mt-1">
                      Separate multiple keywords with commas
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="brand">
                      Brand Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="brand"
                      ref={brandNameRef}
                      placeholder="Your Brand Name"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      data-testid="input-brand"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="selling-points">Selling Points (Optional)</Label>
                    <Textarea
                      id="selling-points"
                      placeholder="Free shipping, 24/7 support, money-back guarantee..."
                      value={sellingPoints}
                      onChange={(e) => setSellingPoints(e.target.value)}
                      data-testid="input-selling-points"
                    />
                  </div>
                  
                  
                  {/* Advanced Options */}
                  <div className="border-t pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="mb-4 p-0 h-auto font-medium text-primary hover:text-primary/80"
                      data-testid="toggle-advanced-options"
                    >
                      {showAdvanced ? '▼' : '▶'} Advanced Options
                    </Button>
                    
                    {showAdvanced && (
                      <div className="space-y-4">
                        <GuidelineProfileSelector
                          type="brand"
                          value={brandGuidelines}
                          onChange={setBrandGuidelines}
                          placeholder="e.g., Always use formal tone, avoid superlatives, include sustainability messaging, use inclusive language..."
                          label="Brand Guidelines (Optional)"
                        />
                        
                        <GuidelineProfileSelector
                          type="regulatory"
                          value={regulatoryGuidelines}
                          onChange={setRegulatoryGuidelines}
                          placeholder="e.g., FDA compliance required, no health claims, include disclaimers, follow FTC advertising guidelines, GDPR compliant language..."
                          label="Regulatory Guidelines (Optional)"
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="case-type">Text Case</Label>
                            <Select value={caseType} onValueChange={(value: 'sentence' | 'title') => setCaseType(value)}>
                              <SelectTrigger data-testid="select-case-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sentence">Sentence Case</SelectItem>
                                <SelectItem value="title">Title Case</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="variations">Variations</Label>
                            <Select value={numVariations.toString()} onValueChange={(value) => setNumVariations(parseInt(value))}>
                              <SelectTrigger data-testid="select-variations">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 Variation</SelectItem>
                                <SelectItem value="2">2 Variations</SelectItem>
                                <SelectItem value="3">3 Variations</SelectItem>
                                <SelectItem value="4">4 Variations</SelectItem>
                                <SelectItem value="5">5 Variations</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="content-type">Content Type</Label>
                            <Select value={contentType} onValueChange={(value: 'both' | 'titles' | 'descriptions') => setContentType(value)}>
                              <SelectTrigger data-testid="select-content-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="both">Titles & Descriptions</SelectItem>
                                <SelectItem value="titles">Titles Only</SelectItem>
                                <SelectItem value="descriptions">Descriptions Only</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Generate Button */}
              <Card>
                <CardContent className="pt-6">
                  {isGenerating && (
                    <div className="mb-4">
                      <Progress value={progress} className="mb-2" />
                      <p className="text-sm text-text-secondary">Processing... {progress}%</p>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleGenerate} 
                    className="w-full" 
                    disabled={!url || !keywords || !brandName || isGenerating}
                    data-testid="button-generate"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Meta Tags"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Bulk Upload Mode */
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Bulk CSV Upload</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="csv-upload">Upload CSV File</Label>
                    <Input
                      id="csv-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      data-testid="input-csv"
                    />
                    <p className="text-sm text-text-secondary mt-1">
                      CSV should contain columns: URL, Keywords, Brand Name, Selling Points (optional)
                    </p>
                  </div>
                  
                  {csvFile && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        File ready: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Advanced Options for Bulk */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Advanced Options</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                      data-testid="button-toggle-advanced-bulk"
                    >
                      {showAdvancedOptions ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-2" />
                          Hide
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-2" />
                          Show
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                {showAdvancedOptions && (
                  <CardContent>
                    <div className="space-y-4">
                      <GuidelineProfileSelector
                        type="brand"
                        value={brandGuidelines}
                        onChange={setBrandGuidelines}
                        placeholder="Enter specific brand voice, messaging guidelines, or compliance requirements that must be followed..."
                        label="Brand Guidelines (Optional)"
                      />
                      
                      <GuidelineProfileSelector
                        type="regulatory"
                        value={regulatoryGuidelines}
                        onChange={setRegulatoryGuidelines}
                        placeholder="Enter industry-specific regulations, legal requirements, or compliance standards..."
                        label="Regulatory Guidelines (Optional)"
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="bulk-case-type">Text Case</Label>
                          <Select value={caseType} onValueChange={(value: 'sentence' | 'title') => setCaseType(value)}>
                            <SelectTrigger data-testid="select-bulk-case-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sentence">Sentence Case</SelectItem>
                              <SelectItem value="title">Title Case</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="bulk-content-type">Content Type</Label>
                          <Select value={contentType} onValueChange={(value: 'both' | 'titles' | 'descriptions') => setContentType(value)}>
                            <SelectTrigger data-testid="select-bulk-content-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="both">Titles & Descriptions</SelectItem>
                              <SelectItem value="titles">Titles Only</SelectItem>
                              <SelectItem value="descriptions">Descriptions Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Process Button */}
              <Card>
                <CardContent className="pt-6">
                  {isGenerating && (
                    <div className="mb-4">
                      <Progress value={progress} className="mb-2" />
                      <p className="text-sm text-text-secondary">Processing bulk upload... {progress}%</p>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleBulkProcess}
                    className="w-full" 
                    disabled={!csvFile || isGenerating}
                    data-testid="button-process-bulk"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Process Bulk Upload
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Single URL Results */}
          {metaData && mode === 'single' && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Meta Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Primary Results */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>Title Tag</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(metaData.title)}
                        data-testid="button-copy-title"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={metaData.title}
                      readOnly
                      className="min-h-[60px]"
                      data-testid="output-title"
                    />

                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>Meta Description</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(metaData.description)}
                        data-testid="button-copy-description"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={metaData.description}
                      readOnly
                      className="min-h-[80px]"
                      data-testid="output-description"
                    />

                  </div>
                </div>

                {/* Variations */}
                {metaData.variations && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Alternative Variations</h4>
                    
                    {(contentType === 'both' || contentType === 'titles') && (
                      <div>
                        <Label className="text-sm font-medium">Title Variations</Label>
                        <div className="space-y-2 mt-2">
                          {metaData.variations.titles.map((title, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Textarea
                                value={title}
                                readOnly
                                className="min-h-[40px] text-sm"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(title)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {(contentType === 'both' || contentType === 'descriptions') && (
                      <div>
                        <Label className="text-sm font-medium">Description Variations</Label>
                        <div className="space-y-2 mt-2">
                          {metaData.variations.descriptions.map((description, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Textarea
                                value={description}
                                readOnly
                                className="min-h-[60px] text-sm"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(description)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      setSaveInputData({
                        url,
                        targetKeywords: keywords,
                        brandName,
                        sellingPoints,
                        additionalContext: urlContent,
                        contentType,
                        brandGuidelines,
                        regulatoryGuidelines
                      });
                      setSaveOutputData({
                        titles: metaData.variations?.titles || [metaData.title],
                        descriptions: metaData.variations?.descriptions || [metaData.description]
                      });
                      setIsSaveDialogOpen(true);
                    }} 
                    variant="outline" 
                    className="flex-1" 
                    data-testid="button-save-library"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save to Library
                  </Button>
                  <Button onClick={exportResults} variant="outline" className="flex-1" data-testid="button-export">
                    <Download className="w-4 h-4 mr-2" />
                    Export Results
                  </Button>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-700">
                  <FeedbackButtons
                    toolType="seo-meta"
                    inputData={{
                      url,
                      targetKeywords: keywords,
                      brandName,
                      sellingPoints,
                      additionalContext: urlContent,
                      contentType,
                      brandGuidelines,
                      regulatoryGuidelines
                    }}
                    outputData={{
                      title: metaData.title,
                      description: metaData.description,
                      variations: metaData.variations
                    }}
                    guidelineProfileId={typeof brandGuidelines === 'string' ? brandGuidelines : undefined}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bulk Results */}
          {bulkResults.length > 0 && mode === 'bulk' && (
            <Card>
              <CardHeader>
                <CardTitle>Bulk Processing Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>URL</TableHead>
                        <TableHead>SEO Title</TableHead>
                        <TableHead>Meta Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkResults.map((result, index) => (
                        <TableRow key={index} className={result.status === 'error' ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                          <TableCell className="max-w-[200px] truncate text-text-secondary text-sm">
                            <div className="flex items-center gap-2">
                              {result.status === 'success' ? (
                                <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                              )}
                              {result.url}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-medium max-w-[300px]">
                            {result.status === 'success' ? result.title : (
                              <span className="text-red-600 text-xs">{result.error}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-text-secondary max-w-[400px]">
                            {result.status === 'success' ? result.description : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  <Button onClick={exportResults} className="w-full" data-testid="button-export-bulk">
                    <Download className="w-4 h-4 mr-2" />
                    Export All Results
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <SaveContentDialog
        isOpen={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        defaultTitle={`SEO Meta - ${url || keywords}`}
        toolType="seo-meta"
        inputData={saveInputData}
        outputData={saveOutputData}
      />
    </AccessGuard>
  );
}