import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Trash2, Edit, Plus, Save, X, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BrandGuidelineForm from "@/components/BrandGuidelineForm";
import type { GuidelineProfile, BrandGuidelineContent, GuidelineContent } from "@shared/schema";

export default function ProfileSettings() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<GuidelineProfile | null>(null);
  const [newProfile, setNewProfile] = useState<{ name: string; type: "brand" | "regulatory"; content: GuidelineContent }>({ 
    name: "", 
    type: "brand", 
    content: {} as BrandGuidelineContent 
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch guideline profiles
  const { data: profiles, isLoading } = useQuery<GuidelineProfile[]>({
    queryKey: ["/api/guideline-profiles"],
    queryFn: async () => {
      const response = await fetch("/api/guideline-profiles", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch profiles");
      }
      return response.json();
    },
  });

  // Create profile mutation
  const createProfileMutation = useMutation({
    mutationFn: async (profile: { name: string; type: "brand" | "regulatory"; content: GuidelineContent }) => {
      return await apiRequest("POST", "/api/guideline-profiles", profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guideline-profiles"] });
      setIsCreateDialogOpen(false);
      setNewProfile({ name: "", type: "brand", content: {} as BrandGuidelineContent });
      toast({ title: "Success", description: "Profile created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create profile", variant: "destructive" });
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async ({ id, ...profile }: { id: string; name: string; content: GuidelineContent }) => {
      return await apiRequest("PUT", `/api/guideline-profiles/${id}`, profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guideline-profiles"] });
      setEditingProfile(null);
      toast({ title: "Success", description: "Profile updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    },
  });

  // Delete profile mutation
  const deleteProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/guideline-profiles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guideline-profiles"] });
      toast({ title: "Success", description: "Profile deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete profile", variant: "destructive" });
    },
  });

  // Duplicate profile mutation
  const duplicateProfileMutation = useMutation({
    mutationFn: async (profile: GuidelineProfile) => {
      const duplicateName = `${profile.name} (Copy)`;
      return await apiRequest("POST", "/api/guideline-profiles", {
        name: duplicateName,
        type: profile.type,
        content: profile.content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guideline-profiles"] });
      toast({ title: "Success", description: "Profile duplicated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to duplicate profile", variant: "destructive" });
    },
  });

  const handleCreateProfile = () => {
    if (!newProfile.name.trim()) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }
    
    // Validate content based on type
    if (typeof newProfile.content === "string" && !newProfile.content.trim()) {
      toast({ title: "Error", description: "Content is required", variant: "destructive" });
      return;
    }
    
    createProfileMutation.mutate(newProfile);
  };

  const handleUpdateProfile = () => {
    if (!editingProfile) return;
    updateProfileMutation.mutate({
      id: editingProfile.id,
      name: editingProfile.name,
      content: editingProfile.content,
    });
  };

  // Memoized onChange handlers to prevent infinite loops
  const handleNewProfileContentChange = useCallback((value: BrandGuidelineContent) => {
    setNewProfile(prev => ({ ...prev, content: value }));
  }, []);

  const handleEditProfileContentChange = useCallback((value: BrandGuidelineContent) => {
    setEditingProfile(prev => prev ? { ...prev, content: value } : null);
  }, []);

  const brandProfiles = profiles?.filter(p => p.type === "brand") || [];
  const regulatoryProfiles = profiles?.filter(p => p.type === "regulatory") || [];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Guideline Profile Settings</h1>
          
          <div className="mb-6">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-profile" className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">Create Guideline Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="profile-name" className="text-white">Profile Name</Label>
                    <Input
                      id="profile-name"
                      data-testid="input-profile-name"
                      value={newProfile.name}
                      onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                      placeholder="Enter profile name"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="profile-type" className="text-white">Type</Label>
                    <Select 
                      value={newProfile.type} 
                      onValueChange={(value: "brand" | "regulatory") => {
                        setNewProfile({ 
                          ...newProfile, 
                          type: value,
                          content: value === "brand" ? {} as BrandGuidelineContent : ""
                        });
                      }}
                    >
                      <SelectTrigger data-testid="select-profile-type" className="bg-gray-800 border-gray-700 text-[#ffffff]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="brand" className="text-white">Brand Guidelines</SelectItem>
                        <SelectItem value="regulatory" className="text-white">Regulatory Guidelines</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="profile-content" className="text-white">Guidelines Content</Label>
                    {newProfile.type === "brand" ? (
                      <BrandGuidelineForm
                        value={newProfile.content as BrandGuidelineContent}
                        onChange={handleNewProfileContentChange}
                      />
                    ) : (
                      <Textarea
                        id="profile-content"
                        data-testid="textarea-profile-content"
                        value={typeof newProfile.content === "string" ? newProfile.content : ""}
                        onChange={(e) => setNewProfile({ ...newProfile, content: e.target.value })}
                        placeholder="Enter your regulatory guidelines..."
                        rows={6}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      data-testid="button-save-profile"
                      onClick={handleCreateProfile} 
                      disabled={createProfileMutation.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {createProfileMutation.isPending ? "Creating..." : "Create Profile"}
                    </Button>
                    <Button 
                      data-testid="button-cancel-create"
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs defaultValue="brand" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800 mb-6">
              <TabsTrigger value="brand" data-testid="tab-brand-guidelines">Brand Guidelines</TabsTrigger>
              <TabsTrigger value="regulatory" data-testid="tab-regulatory-guidelines">Regulatory Guidelines</TabsTrigger>
            </TabsList>

            <TabsContent value="brand" className="mt-0">
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl">Brand Guidelines</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div data-testid="loading-brand-profiles">Loading...</div>
                  ) : brandProfiles.length === 0 ? (
                    <p data-testid="no-brand-profiles" className="text-gray-400">No brand guideline profiles created yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {brandProfiles.map((profile: GuidelineProfile) => (
                      <div key={profile.id} data-testid={`profile-brand-${profile.id}`} className="p-3 bg-gray-800 rounded-lg">
                        {editingProfile?.id === profile.id ? (
                          <div className="space-y-3">
                            <Input
                              value={editingProfile.name}
                              onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                              className="bg-gray-700 border-gray-600"
                            />
                            <BrandGuidelineForm
                              value={editingProfile.content as BrandGuidelineContent}
                              onChange={handleEditProfileContentChange}
                              profileId={editingProfile.id}
                            />
                            <div className="flex gap-2">
                              <Button
                                data-testid={`button-save-${profile.id}`}
                                size="sm"
                                onClick={handleUpdateProfile}
                                disabled={updateProfileMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Save className="w-3 h-3 mr-1" />
                                Save
                              </Button>
                              <Button
                                data-testid={`button-cancel-edit-${profile.id}`}
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingProfile(null)}
                              >
                                <X className="w-3 h-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <h4 data-testid={`text-profile-name-${profile.id}`} className="font-medium">{profile.name}</h4>
                              <div className="flex gap-1">
                                <Button
                                  data-testid={`button-duplicate-${profile.id}`}
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => duplicateProfileMutation.mutate(profile)}
                                  title="Duplicate profile"
                                  className="text-blue-400 hover:text-blue-300"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                                <Button
                                  data-testid={`button-edit-${profile.id}`}
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingProfile(profile)}
                                  title="Edit profile"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  data-testid={`button-delete-${profile.id}`}
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteProfileMutation.mutate(profile.id)}
                                  title="Delete profile"
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            <p data-testid={`text-profile-content-${profile.id}`} className="text-sm text-gray-300 line-clamp-3">
                              {typeof profile.content === "string" 
                                ? profile.content
                                : ((profile.content as any)?.legacy_text 
                                  ? (profile.content as any).legacy_text
                                  : "Structured brand guidelines")}
                            </p>
                          </div>
                        )}
                      </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="regulatory" className="mt-0">
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl">Regulatory Guidelines</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div data-testid="loading-regulatory-profiles">Loading...</div>
                  ) : regulatoryProfiles.length === 0 ? (
                    <p data-testid="no-regulatory-profiles" className="text-gray-400">No regulatory guideline profiles created yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {regulatoryProfiles.map((profile: GuidelineProfile) => (
                      <div key={profile.id} data-testid={`profile-regulatory-${profile.id}`} className="p-3 bg-gray-800 rounded-lg">
                        {editingProfile?.id === profile.id ? (
                          <div className="space-y-3">
                            <Input
                              value={editingProfile.name}
                              onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                              className="bg-gray-700 border-gray-600"
                            />
                            <Textarea
                              value={typeof editingProfile.content === "string" ? editingProfile.content : JSON.stringify(editingProfile.content, null, 2)}
                              onChange={(e) => {
                                try {
                                  const parsed = JSON.parse(e.target.value);
                                  setEditingProfile({ ...editingProfile, content: parsed });
                                } catch {
                                  setEditingProfile({ ...editingProfile, content: e.target.value });
                                }
                              }}
                              rows={4}
                              className="bg-gray-700 border-gray-600"
                            />
                            <div className="flex gap-2">
                              <Button
                                data-testid={`button-save-${profile.id}`}
                                size="sm"
                                onClick={handleUpdateProfile}
                                disabled={updateProfileMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Save className="w-3 h-3 mr-1" />
                                Save
                              </Button>
                              <Button
                                data-testid={`button-cancel-edit-${profile.id}`}
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingProfile(null)}
                              >
                                <X className="w-3 h-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <h4 data-testid={`text-profile-name-${profile.id}`} className="font-medium">{profile.name}</h4>
                              <div className="flex gap-1">
                                <Button
                                  data-testid={`button-duplicate-${profile.id}`}
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => duplicateProfileMutation.mutate(profile)}
                                  title="Duplicate profile"
                                  className="text-blue-400 hover:text-blue-300"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                                <Button
                                  data-testid={`button-edit-${profile.id}`}
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingProfile(profile)}
                                  title="Edit profile"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  data-testid={`button-delete-${profile.id}`}
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteProfileMutation.mutate(profile.id)}
                                  title="Delete profile"
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            <p data-testid={`text-profile-content-${profile.id}`} className="text-sm text-gray-300 line-clamp-3">
                              {typeof profile.content === "string" 
                                ? profile.content
                                : JSON.stringify(profile.content)}
                            </p>
                          </div>
                        )}
                      </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}