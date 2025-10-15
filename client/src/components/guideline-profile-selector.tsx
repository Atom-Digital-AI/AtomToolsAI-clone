import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { GuidelineProfile, GuidelineContent, BrandGuidelineContent } from "@shared/schema";

// Helper function to check if content is a string
function isStringContent(content: GuidelineContent | string): content is string {
  return typeof content === 'string';
}

// Helper function to compare two GuidelineContent values for equality
function areContentsEqual(a: GuidelineContent | string, b: GuidelineContent | string): boolean {
  // If both are strings, compare directly
  if (typeof a === 'string' && typeof b === 'string') {
    return a === b;
  }
  
  // If types don't match, they're not equal
  if (typeof a !== typeof b) {
    return false;
  }
  
  // Both are objects - do deep comparison via JSON stringification
  return JSON.stringify(a) === JSON.stringify(b);
}

// Helper function to display structured content in a readable format
function displayGuidelineContent(content: GuidelineContent | string): string {
  if (typeof content === 'string') {
    return content;
  }
  
  if (content && typeof content === 'object' && 'legacy_text' in content) {
    return (content as any).legacy_text;
  }
  
  // For structured content, create a formatted display string
  const brandContent = content as BrandGuidelineContent;
  const sections: string[] = [];
  
  if (brandContent.tone_of_voice) sections.push(`Tone: ${brandContent.tone_of_voice}`);
  if (brandContent.style_preferences) sections.push(`Style: ${brandContent.style_preferences}`);
  if (brandContent.language_style) sections.push(`Language: ${brandContent.language_style}`);
  if (brandContent.visual_style) sections.push(`Visual: ${brandContent.visual_style}`);
  if (brandContent.brand_personality && brandContent.brand_personality.length > 0) {
    sections.push(`Personality: ${brandContent.brand_personality.join(', ')}`);
  }
  if (brandContent.content_themes && brandContent.content_themes.length > 0) {
    sections.push(`Themes: ${brandContent.content_themes.join(', ')}`);
  }
  if (brandContent.target_audience && brandContent.target_audience.length > 0) {
    const audiences = brandContent.target_audience.map(a => {
      const parts = [];
      if (a.gender) parts.push(a.gender);
      if (a.age_range) parts.push(`${a.age_range.from_age}-${a.age_range.to_age} yrs`);
      if (a.profession) parts.push(a.profession);
      return parts.join(' ');
    }).join('; ');
    sections.push(`Audience: ${audiences}`);
  }
  if (brandContent.color_palette && brandContent.color_palette.length > 0) {
    sections.push(`Colors: ${brandContent.color_palette.join(', ')}`);
  }
  
  return sections.join('\n') || JSON.stringify(content);
}

interface GuidelineProfileSelectorProps {
  type: 'brand' | 'regulatory';
  value: GuidelineContent | string;
  onChange: (value: GuidelineContent | string) => void;
  placeholder?: string;
  label?: string;
}

export default function GuidelineProfileSelector({ 
  type, 
  value, 
  onChange, 
  placeholder = "Enter guidelines...",
  label = type === 'brand' ? "Brand Guidelines" : "Regulatory Guidelines"
}: GuidelineProfileSelectorProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [profileName, setProfileName] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch profiles of the specific type
  const { data: profiles } = useQuery<GuidelineProfile[]>({
    queryKey: ["/api/guideline-profiles", { type }],
    queryFn: async () => {
      const response = await fetch(`/api/guideline-profiles?type=${type}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch profiles");
      }
      return response.json();
    },
  });

  // Save profile mutation
  const saveProfileMutation = useMutation({
    mutationFn: async (data: { name: string; content: string }) => {
      return apiRequest("POST", "/api/guideline-profiles", {
        name: data.name,
        type,
        content: data.content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guideline-profiles"] });
      setShowSaveDialog(false);
      setProfileName("");
      toast({ title: "Success", description: "Profile saved successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save profile", variant: "destructive" });
    },
  });

  const handleProfileSelect = (profileId: string) => {
    if (profileId === "manual") {
      onChange("");
      return;
    }
    
    const profile = profiles?.find(p => p.id === profileId);
    if (profile) {
      // Pass the structured content directly to preserve all fields
      onChange(profile.content);
    }
  };

  const handleSaveCurrentContent = () => {
    // Only allow saving string content
    if (!isStringContent(value)) {
      toast({ title: "Error", description: "Cannot save structured content", variant: "destructive" });
      return;
    }

    if (!value.trim()) {
      toast({ title: "Error", description: "No content to save", variant: "destructive" });
      return;
    }
    
    if (!profileName.trim()) {
      toast({ title: "Error", description: "Profile name is required", variant: "destructive" });
      return;
    }

    // Check if content already exists as a profile
    const existingProfile = profiles?.find(p => {
      const profileDisplay = displayGuidelineContent(p.content);
      return profileDisplay.trim() === value.trim();
    });
    
    if (existingProfile) {
      toast({ title: "Info", description: "This content is already saved as a profile", variant: "default" });
      setShowSaveDialog(false);
      return;
    }

    saveProfileMutation.mutate({
      name: profileName,
      content: value,
    });
  };

  // Find current profile by comparing content
  const currentProfile = profiles?.find(p => areContentsEqual(p.content, value));

  // Check if value is a string for conditional rendering
  const isString = isStringContent(value);
  const displayValue = displayGuidelineContent(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={`${type}-guidelines`}>{label}</Label>
        <div className="flex items-center gap-2">
          {profiles && profiles.length > 0 && (
            <Select onValueChange={handleProfileSelect} value={currentProfile?.id || "manual"}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue placeholder="Choose saved profile..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual entry</SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Only show save button for string values (manual entry) that aren't already saved */}
          {isString && value.trim() && !currentProfile && (
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 text-xs"
                  data-testid={`button-save-${type}-profile`}
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">Save {label} Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="profile-name" className="text-white">Profile Name</Label>
                    <Input
                      id="profile-name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Enter profile name"
                      className="bg-gray-800 border-gray-700 text-white"
                      data-testid="input-save-profile-name"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Content Preview</Label>
                    <div className="p-3 bg-gray-800 border border-gray-700 rounded-md text-sm max-h-32 overflow-y-auto text-white whitespace-pre-wrap">
                      {value}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowSaveDialog(false)}
                      data-testid="button-cancel-save"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveCurrentContent}
                      disabled={saveProfileMutation.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700"
                      data-testid="button-confirm-save"
                    >
                      {saveProfileMutation.isPending ? "Saving..." : "Save Profile"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      
      {/* Conditional rendering based on value type */}
      {isString ? (
        // Editable textarea for string values
        <Textarea
          id={`${type}-guidelines`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="resize-none"
          data-testid={`textarea-${type}-guidelines`}
        />
      ) : (
        // Readonly formatted display for structured content
        <div className="space-y-2">
          <div 
            id={`${type}-guidelines`}
            className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-sm min-h-[76px] whitespace-pre-wrap"
            data-testid={`display-${type}-guidelines`}
          >
            {displayValue}
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <span>ℹ️</span>
            <span>This is a structured profile. Edit in Profile Settings to modify.</span>
          </div>
        </div>
      )}
      
      {currentProfile && (
        <div className="text-xs text-gray-400">
          Using saved profile: {currentProfile.name}
        </div>
      )}
    </div>
  );
}
