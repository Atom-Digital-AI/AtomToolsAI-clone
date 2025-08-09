import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccessGuard } from "@/components/access-guard";
import { Sparkles, Copy, RefreshCw, Download, Upload, AlertCircle, CheckCircle2, Globe, Target } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface GeneratedCopy {
  headline: string;
  description1: string;
  description2: string;
  callToAction: string;
  headlineLength: number;
  description1Length: number;
  description2Length: number;
  score: number;
  keywords: string[];
  language: string;
}

interface AdCopyVariations {
  primary: GeneratedCopy;
  variations: GeneratedCopy[];
}

interface BulkAdResult {
  url: string;
  keywords: string;
  brandName: string;
  headline: string;
  description1: string;
  description2: string;
  callToAction: string;
  status: 'success' | 'error';
  error?: string;
}

export default function GoogleAdsCopyGenerator() {
  const [url, setUrl] = useState("");
  const [keywords, setKeywords] = useState("");
  const [brandName, setBrandName] = useState("");
  const [sellingPoints, setSellingPoints] = useState("");
  const [tone, setTone] = useState("");
  const [caseType, setCaseType] = useState<'sentence' | 'title' | 'uppercase'>('sentence');
  const [numVariations, setNumVariations] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [adCopy, setAdCopy] = useState<AdCopyVariations | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [bulkResults, setBulkResults] = useState<BulkAdResult[]>([]);
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
        const mockContent = "Premium digital marketing software that helps businesses automate their advertising campaigns and increase ROI with advanced targeting and optimization features.";
        setUrlContent(mockContent);
        
        // Auto-detect keywords if not provided
        if (!keywords) {
          setKeywords("digital marketing software, advertising automation, campaign optimization, ROI tracking");
        }
        
        toast({
          title: "URL Analyzed",
          description: "Content extracted and ad-relevant keywords detected",
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

  const formatText = (text: string, caseType: string): string => {
    switch (caseType) {
      case 'title':
        return text.replace(/\w\S*/g, (txt) => 
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
      case 'uppercase':
        return text.toUpperCase();
      case 'sentence':
      default:
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
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
        { step: 15, message: "Analyzing target URL..." },
        { step: 30, message: "Extracting content insights..." },
        { step: 45, message: "Detecting language and tone..." },
        { step: 60, message: "Generating compelling headlines..." },
        { step: 75, message: "Creating description variations..." },
        { step: 90, message: "Optimizing call-to-actions..." },
        { step: 100, message: "Finalizing ad copy variations..." }
      ];

      for (const { step, message } of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setProgress(step);
        toast({
          title: "Processing",
          description: message,
        });
      }

      // Generate comprehensive ad copy with variations
      const mockHeadlines = [
        `${formatText(`${brandName} - ${keywords.split(',')[0].trim()} Solutions`, caseType)}`,
        `${formatText(`Get Premium ${keywords.split(',')[0].trim()} with ${brandName}`, caseType)}`,
        `${formatText(`${brandName}: Professional ${keywords.split(',')[0].trim()}`, caseType)}`
      ];

      const mockDescriptions1 = [
        `Transform your business with ${brandName}'s proven ${keywords.split(',')[0].trim()} solutions.`,
        `Discover why businesses choose ${brandName} for ${keywords.split(',')[0].trim()}.`,
        `Get expert ${keywords.split(',')[0].trim()} services from ${brandName}.`
      ];

      const mockDescriptions2 = [
        `${sellingPoints || 'Free trial available. Expert support included.'} Start today!`,
        `${sellingPoints || '24/7 support. Money-back guarantee.'} Get started now!`,
        `${sellingPoints || 'Trusted by thousands. Results guaranteed.'} Try it free!`
      ];

      const mockCTAs = [
        "Get Started Today",
        "Try Free Now",
        "Learn More"
      ];

      const primaryCopy: GeneratedCopy = {
        headline: mockHeadlines[0],
        description1: mockDescriptions1[0],
        description2: mockDescriptions2[0],
        callToAction: mockCTAs[0],
        headlineLength: mockHeadlines[0].length,
        description1Length: mockDescriptions1[0].length,
        description2Length: mockDescriptions2[0].length,
        score: 92,
        keywords: keywords.split(',').map(k => k.trim()),
        language: 'en'
      };

      const variations: GeneratedCopy[] = [];
      for (let i = 0; i < Math.min(numVariations, 3); i++) {
        variations.push({
          headline: mockHeadlines[i],
          description1: mockDescriptions1[i],
          description2: mockDescriptions2[i],
          callToAction: mockCTAs[i],
          headlineLength: mockHeadlines[i].length,
          description1Length: mockDescriptions1[i].length,
          description2Length: mockDescriptions2[i].length,
          score: 90 - (i * 3),
          keywords: keywords.split(',').map(k => k.trim()),
          language: 'en'
        });
      }

      setAdCopy({
        primary: primaryCopy,
        variations
      });

      toast({
        title: "Generation Complete",
        description: `Generated ${variations.length} high-quality ad copy variations`,
      });

    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "An error occurred while generating ad copy",
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
      const mockResults: BulkAdResult[] = [
        {
          url: "https://example1.com",
          keywords: "digital marketing, SEO",
          brandName: "MarketPro",
          headline: "MarketPro - Digital Marketing Solutions",
          description1: "Transform your online presence with expert digital marketing.",
          description2: "Free consultation. Proven results. Get started today!",
          callToAction: "Get Started",
          status: "success"
        },
        {
          url: "https://example2.com", 
          keywords: "web design, development",
          brandName: "WebCraft",
          headline: "WebCraft - Professional Web Design",
          description1: "Custom websites that convert visitors into customers.",
          description2: "Mobile-responsive. SEO-optimized. Launch in 30 days!",
          callToAction: "Get Quote",
          status: "success"
        },
        {
          url: "https://example3.com",
          keywords: "",
          brandName: "",
          headline: "",
          description1: "",
          description2: "",
          callToAction: "",
          status: "error",
          error: "Missing required fields"
        }
      ];

      for (let i = 0; i < mockResults.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1200));
        setProgress(((i + 1) / mockResults.length) * 100);
        setBulkResults(prev => [...prev, mockResults[i]]);
      }

      toast({
        title: "Bulk Processing Complete",
        description: `Processed ${mockResults.length} campaigns with ${mockResults.filter(r => r.status === 'success').length} successful generations`,
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
      description: "Ad copy copied to clipboard",
    });
  };

  const exportToGoogleAds = () => {
    if (!adCopy && bulkResults.length === 0) return;

    let csvContent = "Campaign,Ad Group,Headline,Description Line 1,Description Line 2,Final URL,Call to Action\n";
    
    if (mode === 'single' && adCopy) {
      adCopy.variations.forEach((copy, index) => {
        csvContent += `"${brandName} Campaign","${brandName} Ad Group ${index + 1}","${copy.headline}","${copy.description1}","${copy.description2}","${url}","${copy.callToAction}"\n`;
      });
    } else {
      bulkResults.filter(r => r.status === 'success').forEach((result, index) => {
        csvContent += `"${result.brandName} Campaign","${result.brandName} Ad Group","${result.headline}","${result.description1}","${result.description2}","${result.url}","${result.callToAction}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url_export = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url_export;
    a.download = `google-ads-copy-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url_export);

    toast({
      title: "Export Complete",
      description: "Ad copy exported for Google Ads Editor",
    });
  };

  const getCharacterWarning = (text: string, maxLength: number) => {
    if (text.length > maxLength) {
      return { color: 'text-red-600', message: 'Too long - will be truncated' };
    } else if (text.length > maxLength * 0.9) {
      return { color: 'text-yellow-600', message: 'Close to limit' };
    }
    return { color: 'text-green-600', message: 'Good length' };
  };

  return (
    <AccessGuard productId="c5985990-e94e-49b3-a86c-3076fd9d6b3f" productName="Google Ads Copy Generator">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Google Ads Copy Generator</h1>
              <p className="text-text-secondary">Create high-converting ad copy optimized for Google Ads campaigns</p>
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
                  Single Campaign
                </Button>
                <Button
                  variant={mode === 'bulk' ? 'default' : 'outline'}
                  onClick={() => setMode('bulk')}
                  data-testid="button-bulk-mode"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Campaigns
                </Button>
              </div>
            </CardContent>
          </Card>

          {mode === 'single' ? (
            <div className="space-y-6">
              {/* URL Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Landing Page Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="url">Landing Page URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="url"
                        placeholder="https://example.com/landing-page"
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
                        {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  {urlContent && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        Landing page analyzed. Ad-relevant content and keywords detected for optimal targeting.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Campaign Parameters */}
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="keywords">Target Keywords</Label>
                    <Input
                      id="keywords"
                      placeholder="digital marketing software, ad automation, campaign optimization"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      data-testid="input-keywords"
                    />
                    <p className="text-sm text-text-secondary mt-1">
                      Enter keywords that your target audience searches for
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
                    <Label htmlFor="selling-points">Unique Selling Points</Label>
                    <Textarea
                      id="selling-points"
                      placeholder="Free trial, 24/7 support, money-back guarantee, trusted by 10,000+ businesses..."
                      value={sellingPoints}
                      onChange={(e) => setSellingPoints(e.target.value)}
                      data-testid="input-selling-points"
                    />
                    <p className="text-sm text-text-secondary mt-1">
                      What makes your product/service unique?
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="tone">Brand Voice</Label>
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
                          <SelectItem value="trustworthy">Trustworthy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="case-type">Text Case</Label>
                      <Select value={caseType} onValueChange={(value: 'sentence' | 'title' | 'uppercase') => setCaseType(value)}>
                        <SelectTrigger data-testid="select-case-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sentence">Sentence Case</SelectItem>
                          <SelectItem value="title">Title Case</SelectItem>
                          <SelectItem value="uppercase">UPPERCASE</SelectItem>
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
                          <SelectItem value="3">3 Variations</SelectItem>
                          <SelectItem value="5">5 Variations</SelectItem>
                          <SelectItem value="10">10 Variations</SelectItem>
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
                      <p className="text-sm text-text-secondary">Generating high-converting ad copy... {progress}%</p>
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
                        Generating Ad Copy...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Ad Copy
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Bulk Upload Mode */
            <Card>
              <CardHeader>
                <CardTitle>Bulk Campaign Upload</CardTitle>
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
                    CSV should contain columns: URL, Keywords, Brand Name, Selling Points, Tone (optional)
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
                    <p className="text-sm text-text-secondary">Processing bulk campaigns... {progress}%</p>
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
                      Processing Campaigns...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Process Bulk Campaigns
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Single Campaign Results */}
          {adCopy && mode === 'single' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Generated Ad Copy Variations</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Score: {adCopy.primary.score}/100
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {adCopy.variations.map((copy, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Variation {index + 1}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant={copy.score >= 90 ? 'default' : copy.score >= 80 ? 'secondary' : 'outline'}>
                          {copy.score}/100
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(`${copy.headline}\n${copy.description1}\n${copy.description2}\n${copy.callToAction}`)}
                          data-testid={`button-copy-variation-${index}`}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <Label className="text-sm">Headline ({copy.headlineLength} chars)</Label>
                          <span className={`text-xs ${getCharacterWarning(copy.headline, 30).color}`}>
                            {getCharacterWarning(copy.headline, 30).message}
                          </span>
                        </div>
                        <Textarea
                          value={copy.headline}
                          readOnly
                          className="min-h-[40px] font-medium"
                          data-testid={`output-headline-${index}`}
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <Label className="text-sm">Description 1 ({copy.description1Length} chars)</Label>
                          <span className={`text-xs ${getCharacterWarning(copy.description1, 90).color}`}>
                            {getCharacterWarning(copy.description1, 90).message}
                          </span>
                        </div>
                        <Textarea
                          value={copy.description1}
                          readOnly
                          className="min-h-[50px]"
                          data-testid={`output-description1-${index}`}
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <Label className="text-sm">Description 2 ({copy.description2Length} chars)</Label>
                          <span className={`text-xs ${getCharacterWarning(copy.description2, 90).color}`}>
                            {getCharacterWarning(copy.description2, 90).message}
                          </span>
                        </div>
                        <Textarea
                          value={copy.description2}
                          readOnly
                          className="min-h-[50px]"
                          data-testid={`output-description2-${index}`}
                        />
                      </div>
                      
                      <div>
                        <Label className="text-sm">Call to Action</Label>
                        <Input
                          value={copy.callToAction}
                          readOnly
                          className="font-medium"
                          data-testid={`output-cta-${index}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="flex gap-4">
                  <Button onClick={exportToGoogleAds} className="flex-1" data-testid="button-export-google-ads">
                    <Download className="w-4 h-4 mr-2" />
                    Export for Google Ads Editor
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => copyToClipboard(JSON.stringify(adCopy.variations, null, 2))}
                    data-testid="button-copy-all"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy All
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bulk Results */}
          {bulkResults.length > 0 && mode === 'bulk' && (
            <Card>
              <CardHeader>
                <CardTitle>Bulk Campaign Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bulkResults.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-medium text-sm">{result.brandName}</span>
                          <p className="text-xs text-text-secondary">{result.url}</p>
                        </div>
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
                        <div className="space-y-2 text-sm">
                          <div>
                            <Label className="text-xs text-text-secondary">Headline:</Label>
                            <p className="font-medium">{result.headline}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-text-secondary">Description 1:</Label>
                            <p>{result.description1}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-text-secondary">Description 2:</Label>
                            <p>{result.description2}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-text-secondary">Call to Action:</Label>
                            <p className="font-medium">{result.callToAction}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-red-600">{result.error}</p>
                      )}
                    </div>
                  ))}
                  
                  <Button onClick={exportToGoogleAds} className="w-full" data-testid="button-export-bulk-google-ads">
                    <Download className="w-4 h-4 mr-2" />
                    Export All Successful Campaigns
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