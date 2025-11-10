import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AccessGuard } from "@/components/access-guard";
import { Facebook, Database, Download, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { PRODUCT_IDS } from "@shared/schema";

export default function FacebookAdsConnector() {
  const [isConnected, setIsConnected] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [refreshRate, setRefreshRate] = useState("");
  const { toast } = useToast();

  const mockAccounts = [
    { id: "123456789", name: "Marketing Agency Ltd" },
    { id: "987654321", name: "E-commerce Store" },
    { id: "456789123", name: "SaaS Company" },
  ];

  const handleConnect = () => {
    // Simulate OAuth connection
    setTimeout(() => {
      setIsConnected(true);
      toast({
        title: "Connected!",
        description: "Successfully connected to Facebook Ads account.",
      });
    }, 1500);
  };

  const handleGenerateConnection = () => {
    if (selectedAccounts.length === 0 || !refreshRate) {
      toast({
        title: "Missing Information",
        description: "Please select at least one ad account and set a refresh rate.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Connector Generated!",
      description: "Your Looker Studio connector is ready to use.",
    });
  };

  return (
    <AccessGuard productId={PRODUCT_IDS.FACEBOOK_ADS_CONNECTOR} productName="Facebook Ads Looker Studio Connector">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Facebook className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Facebook Ads Connector</h1>
              <p className="text-text-secondary">Connect Facebook Ads to Looker Studio</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Step 1: Log in to Facebook and Google */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-6 h-6 bg-primary/10 text-primary rounded-full text-sm flex items-center justify-center font-bold">1</span>
                Log in to Facebook and Google
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-text-secondary">
                  Download the main code file and configuration JSON to get started.
                </p>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-text-primary">Download Files:</h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      className="border-accent text-accent hover:bg-accent hover:text-white"
                      data-testid="download-main-code"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Main Code File
                    </Button>
                    <Button
                      variant="outline"
                      className="border-accent text-accent hover:bg-accent hover:text-white"
                      data-testid="download-config-json"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Configuration JSON
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Create Facebook App */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-6 h-6 bg-primary/10 text-primary rounded-full text-sm flex items-center justify-center font-bold">2</span>
                Create Facebook App
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-text-secondary">
                  Set up your Facebook App to access the Ads API with step-by-step video guidance.
                </p>
                
                <div className="bg-background rounded-xl p-6 border border-border">
                  <div className="aspect-video bg-surface-2 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i className="fas fa-play text-accent text-xl"></i>
                      </div>
                      <p className="text-text-secondary text-sm">
                        Video guide coming soon
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Set up Google Cloud */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-6 h-6 bg-primary/10 text-primary rounded-full text-sm flex items-center justify-center font-bold">3</span>
                Set up Google Cloud
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-text-secondary">
                  Configure your Google Cloud project and enable necessary APIs.
                </p>
                
                <div className="bg-background rounded-xl p-6 border border-border">
                  <div className="aspect-video bg-surface-2 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i className="fas fa-play text-accent text-xl"></i>
                      </div>
                      <p className="text-text-secondary text-sm">
                        Video guide coming soon
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 4: Set up Google App Script */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-6 h-6 bg-primary/10 text-primary rounded-full text-sm flex items-center justify-center font-bold">4</span>
                Set up Google App Script
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-text-secondary">
                  Deploy your connector code using Google Apps Script platform.
                </p>
                
                <div className="bg-background rounded-xl p-6 border border-border">
                  <div className="aspect-video bg-surface-2 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i className="fas fa-play text-accent text-xl"></i>
                      </div>
                      <p className="text-text-secondary text-sm">
                        Video guide coming soon
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 5: Add Connector to Looker Studio */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-6 h-6 bg-primary/10 text-primary rounded-full text-sm flex items-center justify-center font-bold">5</span>
                Add Connector to Looker Studio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-text-secondary">
                  Connect your custom data source to Looker Studio and start reporting.
                </p>
                
                <div className="bg-background rounded-xl p-6 border border-border">
                  <div className="aspect-video bg-surface-2 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i className="fas fa-play text-accent text-xl"></i>
                      </div>
                      <p className="text-text-secondary text-sm">
                        Video guide coming soon
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AccessGuard>
  );
}