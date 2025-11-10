import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import type { QCAgentType } from "@shared/schema";

interface QCSettingsProps {
  guidelineProfileId?: string;
  toolType?: string;
  onSave?: () => void;
}

interface QCConfig {
  enabled: boolean;
  enabledAgents: QCAgentType[];
  autoApplyThreshold: number;
  conflictResolutionStrategy: string;
}

const agentLabels: Record<QCAgentType, { name: string; description: string }> = {
  proofreader: {
    name: "Proofreader",
    description: "Checks grammar, spelling, and punctuation",
  },
  brand_guardian: {
    name: "Brand Guardian",
    description: "Ensures content matches brand guidelines",
  },
  fact_checker: {
    name: "Fact Checker",
    description: "Verifies factual accuracy and citations",
  },
  regulatory: {
    name: "Regulatory Compliance",
    description: "Checks regulatory requirements",
  },
};

export function QCSettings({ guidelineProfileId, toolType, onSave }: QCSettingsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<QCConfig>({
    enabled: false,
    enabledAgents: ['proofreader', 'brand_guardian', 'fact_checker', 'regulatory'],
    autoApplyThreshold: 90,
    conflictResolutionStrategy: 'human_review',
  });

  useEffect(() => {
    loadConfig();
  }, [guidelineProfileId, toolType]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (guidelineProfileId) params.append('guidelineProfileId', guidelineProfileId);
      if (toolType) params.append('toolType', toolType);

      const response = await apiRequest(`/api/qc/config?${params.toString()}`);
      setConfig(response);
    } catch (error) {
      console.error("Error loading QC config:", error);
      toast({
        title: "Error",
        description: "Failed to load QC settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiRequest('/api/qc/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guidelineProfileId,
          toolType,
          ...config,
        }),
      });

      toast({
        title: "Settings Saved",
        description: "Your QC settings have been updated successfully",
      });

      if (onSave) onSave();
    } catch (error) {
      console.error("Error saving QC config:", error);
      toast({
        title: "Error",
        description: "Failed to save QC settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleAgent = (agent: QCAgentType) => {
    setConfig(prev => ({
      ...prev,
      enabledAgents: prev.enabledAgents.includes(agent)
        ? prev.enabledAgents.filter(a => a !== agent)
        : [...prev.enabledAgents, agent],
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quality Control Settings</CardTitle>
        <CardDescription>
          Configure automated quality checking for your content
          {toolType && ` (${toolType})`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable QC */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="qc-enabled">Enable Quality Control</Label>
            <p className="text-sm text-muted-foreground">
              Run automated quality checks on generated content
            </p>
          </div>
          <Switch
            id="qc-enabled"
            checked={config.enabled}
            onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
          />
        </div>

        {config.enabled && (
          <>
            {/* Agent Selection */}
            <div className="space-y-4">
              <Label>Quality Agents</Label>
              <p className="text-sm text-muted-foreground">
                Select which quality control agents to run
              </p>
              <div className="space-y-3">
                {(Object.keys(agentLabels) as QCAgentType[]).map((agent) => (
                  <div key={agent} className="flex items-start space-x-3">
                    <Checkbox
                      id={agent}
                      checked={config.enabledAgents.includes(agent)}
                      onCheckedChange={() => toggleAgent(agent)}
                    />
                    <div className="space-y-1 leading-none">
                      <Label htmlFor={agent} className="font-medium cursor-pointer">
                        {agentLabels[agent].name}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {agentLabels[agent].description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Auto-Apply Threshold */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Auto-Apply Threshold</Label>
                <span className="text-sm font-medium">{config.autoApplyThreshold}%</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Automatically apply changes with confidence ? this threshold
              </p>
              <Slider
                value={[config.autoApplyThreshold]}
                onValueChange={([value]) => setConfig({ ...config, autoApplyThreshold: value })}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Never auto-apply (0%)</span>
                <span>Always apply (100%)</span>
              </div>
            </div>

            {/* Info Box */}
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="font-medium mb-2">How it works:</p>
              <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                <li>Agents run sequentially after content generation</li>
                <li>High-confidence suggestions are applied automatically</li>
                <li>Conflicts between agents require your review</li>
                <li>Your decisions are saved for future use</li>
              </ul>
            </div>
          </>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
