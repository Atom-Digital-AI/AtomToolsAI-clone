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
    <AccessGuard productId="9dfbe2c0-1128-4ec1-891b-899e1b28e097" productName="Facebook Ads Looker Studio Connector">
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
          {/* Step 1: Connect Facebook */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-6 h-6 bg-primary/10 text-primary rounded-full text-sm flex items-center justify-center font-bold">1</span>
                Connect Facebook Ads Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isConnected ? (
                <div className="space-y-4">
                  <p className="text-text-secondary">
                    Connect your Facebook Ads account to start importing data.
                  </p>
                  <Button onClick={handleConnect} className="w-full" data-testid="button-connect-facebook">
                    <Facebook className="w-4 h-4 mr-2" />
                    Connect Facebook Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Successfully connected to Facebook Ads account.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Select Ad Accounts */}
          <Card className={!isConnected ? "opacity-50 pointer-events-none" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-6 h-6 bg-primary/10 text-primary rounded-full text-sm flex items-center justify-center font-bold">2</span>
                Select Ad Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-text-secondary">
                  Choose which ad accounts to include in your Looker Studio connector.
                </p>
                
                <div className="space-y-3">
                  {mockAccounts.map((account) => (
                    <div key={account.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={account.id}
                        checked={selectedAccounts.includes(account.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedAccounts([...selectedAccounts, account.id]);
                          } else {
                            setSelectedAccounts(selectedAccounts.filter(id => id !== account.id));
                          }
                        }}
                        data-testid={`checkbox-account-${account.id}`}
                      />
                      <Label htmlFor={account.id} className="flex-1 cursor-pointer">
                        {account.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Configure Settings */}
          <Card className={!isConnected ? "opacity-50 pointer-events-none" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-6 h-6 bg-primary/10 text-primary rounded-full text-sm flex items-center justify-center font-bold">3</span>
                Configure Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="refresh-rate">Data Refresh Rate</Label>
                  <Select value={refreshRate} onValueChange={setRefreshRate}>
                    <SelectTrigger data-testid="select-refresh-rate">
                      <SelectValue placeholder="Select refresh frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Every Hour</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 4: Generate Connector */}
          <Card className={!isConnected ? "opacity-50 pointer-events-none" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-6 h-6 bg-primary/10 text-primary rounded-full text-sm flex items-center justify-center font-bold">4</span>
                Generate Connector
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-text-secondary">
                  Generate your custom Looker Studio connector with the selected configuration.
                </p>
                
                <Button 
                  onClick={handleGenerateConnection} 
                  className="w-full" 
                  disabled={!isConnected || selectedAccounts.length === 0 || !refreshRate}
                  data-testid="button-generate-connector"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Generate Looker Studio Connector
                </Button>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Once generated, you'll receive a connector URL to use in Looker Studio.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AccessGuard>
  );
}