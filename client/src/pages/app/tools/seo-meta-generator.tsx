import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AccessGuard } from "@/components/access-guard";
import { Search, Copy, RefreshCw, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface MetaData {
  title: string;
  description: string;
  titleLength: number;
  descriptionLength: number;
}

export default function SEOMetaGenerator() {
  const [pageContent, setPageContent] = useState("");
  const [targetKeywords, setTargetKeywords] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [generatedMeta, setGeneratedMeta] = useState<MetaData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateMeta = async () => {
    if (!pageContent || !targetKeywords) {
      toast({
        title: "Missing Information",
        description: "Please provide page content and target keywords.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    // Simulate AI generation
    setTimeout(() => {
      const mockMeta: MetaData[] = [
        {
          title: `${targetKeywords} - ${businessName || 'Your Business'} | Expert Solutions`,
          description: `Discover professional ${targetKeywords} services with ${businessName || 'our company'}. Get started today with industry-leading solutions.`,
          titleLength: 0,
          descriptionLength: 0,
        },
        {
          title: `Best ${targetKeywords} Services | ${businessName || 'Professional Solutions'}`,
          description: `Transform your business with our ${targetKeywords} expertise. Trusted by thousands of satisfied customers worldwide.`,
          titleLength: 0,
          descriptionLength: 0,
        },
        {
          title: `${businessName || 'Your Business'}: Premium ${targetKeywords} Provider`,
          description: `Leading ${targetKeywords} solutions designed to drive growth. Contact us today for a personalized consultation.`,
          titleLength: 0,
          descriptionLength: 0,
        },
      ];
      
      // Calculate lengths
      mockMeta.forEach(meta => {
        meta.titleLength = meta.title.length;
        meta.descriptionLength = meta.description.length;
      });
      
      setGeneratedMeta(mockMeta);
      setIsGenerating(false);
      
      toast({
        title: "Meta Tags Generated!",
        description: "Your SEO-optimized meta tags are ready.",
      });
    }, 2000);
  };

  const copyToClipboard = (meta: MetaData) => {
    const formatted = `<title>${meta.title}</title>\n<meta name="description" content="${meta.description}">`;
    navigator.clipboard.writeText(formatted);
    toast({
      title: "Copied!",
      description: "Meta tags have been added to clipboard.",
    });
  };

  const getLengthStatus = (length: number, type: 'title' | 'description') => {
    const limits = type === 'title' ? { min: 30, max: 60 } : { min: 120, max: 160 };
    
    if (length >= limits.min && length <= limits.max) {
      return { status: 'good', color: 'text-green-600 dark:text-green-400' };
    } else if (length < limits.min) {
      return { status: 'short', color: 'text-yellow-600 dark:text-yellow-400' };
    } else {
      return { status: 'long', color: 'text-red-600 dark:text-red-400' };
    }
  };

  return (
    <AccessGuard productId="531de90b-12ef-4169-b664-0d55428435a6" productName="SEO Meta Generator">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
              <Search className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">SEO Meta Generator</h1>
              <p className="text-text-secondary">Generate optimized meta titles and descriptions</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>Page Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="page-content">Page Content Description *</Label>
                  <Textarea
                    id="page-content"
                    value={pageContent}
                    onChange={(e) => setPageContent(e.target.value)}
                    placeholder="Describe what this page is about, its main content, and purpose..."
                    className="min-h-[100px]"
                    data-testid="textarea-page-content"
                  />
                </div>

                <div>
                  <Label htmlFor="target-keywords">Primary Keywords *</Label>
                  <Input
                    id="target-keywords"
                    value={targetKeywords}
                    onChange={(e) => setTargetKeywords(e.target.value)}
                    placeholder="e.g. digital marketing, SEO services"
                    data-testid="input-target-keywords"
                  />
                </div>

                <div>
                  <Label htmlFor="business-name">Business/Brand Name</Label>
                  <Input
                    id="business-name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Your company name"
                    data-testid="input-business-name"
                  />
                </div>

                <Button 
                  onClick={generateMeta} 
                  className="w-full" 
                  disabled={isGenerating}
                  data-testid="button-generate-meta"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Generate Meta Tags
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Meta Tags</CardTitle>
            </CardHeader>
            <CardContent>
              {generatedMeta.length === 0 ? (
                <div className="text-center py-12 text-text-secondary">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Generate your first meta tags to see results here</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {generatedMeta.map((meta, index) => (
                    <Card key={index} className="border border-border">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-sm font-medium text-text-secondary">
                            Option {index + 1}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(meta)}
                            data-testid={`button-copy-meta-${index}`}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <Label className="text-xs text-text-secondary">Title Tag:</Label>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs ${getLengthStatus(meta.titleLength, 'title').color}`}>
                                  {meta.titleLength}/60
                                </span>
                                {getLengthStatus(meta.titleLength, 'title').status === 'good' && (
                                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                                )}
                              </div>
                            </div>
                            <p className="text-sm font-medium border rounded p-2 bg-background">
                              {meta.title}
                            </p>
                          </div>
                          
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <Label className="text-xs text-text-secondary">Meta Description:</Label>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs ${getLengthStatus(meta.descriptionLength, 'description').color}`}>
                                  {meta.descriptionLength}/160
                                </span>
                                {getLengthStatus(meta.descriptionLength, 'description').status === 'good' && (
                                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-text-secondary border rounded p-2 bg-background">
                              {meta.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium mb-2">SEO Best Practices:</h4>
                    <ul className="text-xs text-text-secondary space-y-1">
                      <li>• Titles: 30-60 characters optimal</li>
                      <li>• Descriptions: 120-160 characters optimal</li>
                      <li>• Include primary keywords naturally</li>
                      <li>• Make titles and descriptions unique per page</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AccessGuard>
  );
}