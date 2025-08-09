import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccessGuard } from "@/components/access-guard";
import { Search, Copy, Download, Upload, RefreshCw, AlertCircle, CheckCircle2, Globe } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface MetaData {
  title: string;
  description: string;
  titleLength: number;
  descriptionLength: number;
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
  const [tone, setTone] = useState("");
  const [contentType, setContentType] = useState<'both' | 'titles' | 'descriptions'>('both');
  const [numVariations, setNumVariations] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [metaData, setMetaData] = useState<MetaData | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [urlContent, setUrlContent] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

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
    if (!url || !keywords || !brandName) {
      toast({
        title: "Missing Information",
        description: "Please fill in URL, keywords, and brand name",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      // Simulate progressive generation
      const progressSteps = [
        { step: 20, message: "Analyzing URL content..." },
        { step: 40, message: "Detecting language..." },
        { step: 60, message: "Generating title variations..." },
        { step: 80, message: "Creating meta descriptions..." },
        { step: 100, message: "Optimizing for SEO..." }
      ];

      for (const { step, message } of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 600));
        setProgress(step);
        toast({
          title: "Processing",
          description: message,
        });
      }

      // Generate comprehensive meta data with variations
      const mockTitles = [
        `${brandName} - Premium ${keywords.split(',')[0].trim()} Solutions | Expert Services`,
        `Professional ${keywords.split(',')[0].trim()} by ${brandName} | Trusted Experts`,
        `${brandName}: Leading ${keywords.split(',')[0].trim()} Services & Solutions`
      ];

      const mockDescriptions = [
        `Discover top-quality ${keywords.split(',')[0].trim()} services from ${brandName}. Get expert solutions tailored to your business needs with proven results.`,
        `${brandName} offers premium ${keywords.split(',')[0].trim()} solutions. Transform your business with our professional services and industry expertise.`,
        `Expert ${keywords.split(',')[0].trim()} services by ${brandName}. Boost your business growth with our comprehensive solutions and dedicated support.`
      ];

      const primaryTitle = mockTitles[0];
      const primaryDescription = mockDescriptions[0];

      setMetaData({
        title: primaryTitle,
        description: primaryDescription,
        titleLength: primaryTitle.length,
        descriptionLength: primaryDescription.length,
        keywords: keywords.split(',').map(k => k.trim()),
        language: 'en',
        variations: {
          titles: mockTitles,
          descriptions: mockDescriptions
        }
      });

      toast({
        title: "Generation Complete",
        description: `Generated ${numVariations} variations for ${contentType}`,
      });

    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "An error occurred while generating meta tags",
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
      // Simulate bulk processing
      const mockResults: BulkResult[] = [
        {
          url: "https://example1.com",
          title: "Example 1 - Premium SEO Services | Brand Name",
          description: "Professional SEO services to boost your online presence and drive organic traffic.",
          status: "success"
        },
        {
          url: "https://example2.com",
          title: "Example 2 - Digital Marketing Solutions | Brand Name",
          description: "Comprehensive digital marketing strategies for business growth and success.",
          status: "success"
        },
        {
          url: "https://example3.com",
          title: "",
          description: "",
          status: "error",
          error: "Could not access URL"
        }
      ];

      for (let i = 0; i < mockResults.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setProgress(((i + 1) / mockResults.length) * 100);
        setBulkResults(prev => [...prev, mockResults[i]]);
      }

      toast({
        title: "Bulk Processing Complete",
        description: `Processed ${mockResults.length} URLs with ${mockResults.filter(r => r.status === 'success').length} successful generations`,
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

    let csvContent = "URL,Title,Description,Title Length,Description Length,Status\n";
    
    if (mode === 'single' && metaData) {
      csvContent += `"${url}","${metaData.title}","${metaData.description}",${metaData.titleLength},${metaData.descriptionLength},success\n`;
    } else {
      bulkResults.forEach(result => {
        csvContent += `"${result.url}","${result.title}","${result.description}",${result.title.length},${result.description.length},${result.status}\n`;
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
                    <Label htmlFor="keywords">Target Keywords</Label>
                    <Input
                      id="keywords"
                      placeholder="digital marketing, SEO services, online advertising"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      data-testid="input-keywords"
                    />
                    <p className="text-sm text-text-secondary mt-1">
                      Separate multiple keywords with commas
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="brand">Brand Name</Label>
                    <Input
                      id="brand"
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="tone">Tone</Label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger data-testid="select-tone">
                          <SelectValue placeholder="Select tone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="informative">Informative</SelectItem>
                          <SelectItem value="persuasive">Persuasive</SelectItem>
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
                    
                    <div>
                      <Label htmlFor="variations">Variations</Label>
                      <Select value={numVariations.toString()} onValueChange={(value) => setNumVariations(parseInt(value))}>
                        <SelectTrigger data-testid="select-variations">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Variation</SelectItem>
                          <SelectItem value="3">3 Variations</SelectItem>
                          <SelectItem value="5">5 Variations</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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

                {isGenerating && (
                  <div>
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
                      <Label>Title Tag ({metaData.titleLength} characters)</Label>
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
                    <div className={`text-sm mt-1 ${metaData.titleLength > 60 ? 'text-destructive' : 'text-green-600'}`}>
                      {metaData.titleLength > 60 ? 'Too long - consider shortening' : 'Good length'}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>Meta Description ({metaData.descriptionLength} characters)</Label>
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
                    <div className={`text-sm mt-1 ${metaData.descriptionLength > 160 ? 'text-destructive' : 'text-green-600'}`}>
                      {metaData.descriptionLength > 160 ? 'Too long - consider shortening' : 'Good length'}
                    </div>
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
                
                <Button onClick={exportResults} className="w-full" data-testid="button-export">
                  <Download className="w-4 h-4 mr-2" />
                  Export Results
                </Button>
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
                  {bulkResults.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{result.url}</span>
                        <div className="flex items-center gap-2">
                          {result.status === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className={`text-sm ${result.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            {result.status}
                          </span>
                        </div>
                      </div>
                      
                      {result.status === 'success' ? (
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs">Title</Label>
                            <p className="text-sm">{result.title}</p>
                          </div>
                          <div>
                            <Label className="text-xs">Description</Label>
                            <p className="text-sm">{result.description}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-red-600">{result.error}</p>
                      )}
                    </div>
                  ))}
                  
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
    </AccessGuard>
  );
}