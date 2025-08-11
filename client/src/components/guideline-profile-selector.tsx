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
import type { GuidelineProfile } from "@shared/schema";

interface GuidelineProfileSelectorProps {
  type: 'brand' | 'regulatory';
  value: string;
  onChange: (value: string) => void;
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
      onChange(profile.content);
    }
  };

  const handleSaveCurrentContent = () => {
    if (!value.trim()) {
      toast({ title: "Error", description: "No content to save", variant: "destructive" });
      return;
    }
    
    if (!profileName.trim()) {
      toast({ title: "Error", description: "Profile name is required", variant: "destructive" });
      return;
    }

    // Check if content already exists as a profile
    const existingProfile = profiles?.find(p => p.content.trim() === value.trim());
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

  const currentProfile = profiles?.find(p => p.content === value);

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
          
          {value.trim() && !currentProfile && (
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
                    <div className="p-3 bg-gray-800 border border-gray-700 rounded-md text-sm max-h-32 overflow-y-auto text-white">
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
      
      <Textarea
        id={`${type}-guidelines`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="resize-none"
        data-testid={`textarea-${type}-guidelines`}
      />
      
      {currentProfile && (
        <div className="text-xs text-gray-400">
          Using saved profile: {currentProfile.name}
        </div>
      )}
    </div>
  );
}