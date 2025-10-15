import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { User, Mail, Package, CreditCard, X, Star, Settings, Edit, Trash2, Save, XIcon, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import UsageStatsDisplay from "@/components/UsageStatsDisplay";

interface TierSubscription {
  id: string;
  tierId: string;
  subscribedAt: string;
  tier?: {
    id: string;
    name: string;
    promotionalTag?: string;
    prices: Array<{
      amountMinor: number;
      interval: string;
    }>;
    package?: {
      name: string;
      description: string;
    };
  };
}

interface PackageWithTiers {
  id: string;
  name: string;
  description: string;
  tiers: Array<{
    id: string;
    name: string;
    promotionalTag?: string;
    prices: Array<{
      amountMinor: number;
      interval: string;
    }>;
  }>;
}

export default function Account() {
  const { user, isLoading: userLoading } = useAuth();
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Edit mode states
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editedFirstName, setEditedFirstName] = useState("");
  const [editedLastName, setEditedLastName] = useState("");
  const [editedEmail, setEditedEmail] = useState("");

  // Get tier subscriptions (new system)
  const { data: tierSubscriptions = [], isLoading: tierSubscriptionsLoading } = useQuery<TierSubscription[]>({
    queryKey: ["/api/user/tier-subscriptions"],
    enabled: !!user,
    retry: false,
  });

  // Get available packages for subscription
  const { data: packages = [], isLoading: packagesLoading } = useQuery<PackageWithTiers[]>({
    queryKey: ["/api/packages"],
    enabled: !!user,
    retry: false,
  });

  // Tier subscription mutations
  const subscribeTierMutation = useMutation({
    mutationFn: async (tierId: string) => {
      return apiRequest("POST", "/api/tier-subscriptions", { tierId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/tier-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/with-status"] });
      toast({
        title: "Success",
        description: "Successfully subscribed to package tier",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to subscribe",
        variant: "destructive",
      });
    }
  });

  const unsubscribeTierMutation = useMutation({
    mutationFn: async (tierId: string) => {
      return apiRequest("DELETE", `/api/tier-subscriptions/${tierId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/tier-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/with-status"] });
      toast({
        title: "Success",
        description: "Successfully unsubscribed from tier package",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unsubscribe",
        variant: "destructive",
      });
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName?: string; lastName?: string; email?: string }) => {
      return apiRequest("PUT", "/api/auth/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setIsEditingName(false);
      setIsEditingEmail(false);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    }
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/auth/account");
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted",
      });
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    }
  });

  // Edit handlers
  const handleEditName = () => {
    setEditedFirstName(user?.firstName || "");
    setEditedLastName(user?.lastName || "");
    setIsEditingName(true);
  };

  const handleEditEmail = () => {
    setEditedEmail(user?.email || "");
    setIsEditingEmail(true);
  };

  const handleSaveName = () => {
    updateProfileMutation.mutate({
      firstName: editedFirstName,
      lastName: editedLastName
    });
  };

  const handleSaveEmail = () => {
    updateProfileMutation.mutate({
      email: editedEmail
    });
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setIsEditingEmail(false);
    setEditedFirstName("");
    setEditedLastName("");
    setEditedEmail("");
  };

  const loading = userLoading || tierSubscriptionsLoading || packagesLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-text-secondary">
          Failed to load account information. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Account Settings</h1>
          <p className="text-text-secondary">
            Manage your account information and package subscriptions.
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Profile Information</span>
              </CardTitle>
              <CardDescription>
                Your basic account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Name</label>
                  {isEditingName ? (
                    <div className="mt-1 space-y-2">
                      <div className="flex space-x-2">
                        <Input
                          placeholder="First Name"
                          value={editedFirstName}
                          onChange={(e) => setEditedFirstName(e.target.value)}
                          data-testid="input-first-name"
                        />
                        <Input
                          placeholder="Last Name"
                          value={editedLastName}
                          onChange={(e) => setEditedLastName(e.target.value)}
                          data-testid="input-last-name"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleCancelEdit}
                          data-testid="button-cancel-name-edit"
                        >
                          <XIcon className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={handleSaveName}
                          disabled={updateProfileMutation.isPending}
                          data-testid="button-save-name"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 p-3 border border-border rounded-lg bg-surface flex items-center justify-between">
                      <span>{user.firstName} {user.lastName}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleEditName}
                        data-testid="button-edit-name"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Email</label>
                  {isEditingEmail ? (
                    <div className="mt-1 space-y-2">
                      <Input
                        type="email"
                        placeholder="Email Address"
                        value={editedEmail}
                        onChange={(e) => setEditedEmail(e.target.value)}
                        data-testid="input-email"
                      />
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleCancelEdit}
                          data-testid="button-cancel-email-edit"
                        >
                          <XIcon className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={handleSaveEmail}
                          disabled={updateProfileMutation.isPending}
                          data-testid="button-save-email"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 p-3 border border-border rounded-lg bg-surface flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-text-secondary" />
                        <span>{user.email}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleEditEmail}
                        data-testid="button-edit-email"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary">Account Created</label>
                <div className="mt-1 p-3 border border-border rounded-lg bg-surface">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Package Subscriptions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Package className="w-5 h-5" />
                  <span>Package Subscriptions</span>
                </div>
                <Link href="/pricing">
                  <Button variant="outline" size="sm" data-testid="view-all-packages">
                    <CreditCard className="w-4 h-4 mr-2" />
                    View All Packages
                  </Button>
                </Link>
              </CardTitle>
              <CardDescription>
                Your active package tier subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Active Package Subscriptions */}
              {tierSubscriptions?.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-text-primary">Active Subscriptions</h3>
                  {tierSubscriptions.map((subscription: any) => (
                    <div
                      key={subscription.id}
                      className="flex items-center justify-between p-4 border border-success/30 rounded-lg bg-success/5"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {subscription.tier?.promotionalTag && (
                            <Star className="w-4 h-4 text-yellow-500" />
                          )}
                          <h4 className="font-semibold text-text-primary">
                            {subscription.tier?.name}
                          </h4>
                          <Badge className="bg-success/20 text-success border-success/30">
                            Active
                          </Badge>
                        </div>
                        <p className="text-sm text-text-secondary mb-2">
                          {subscription.tier?.package?.name} - {subscription.tier?.package?.description}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-text-secondary">
                          <span>
                            Subscribed: {new Date(subscription.subscribedAt).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span>
                            {subscription.tier?.prices?.[0] ? 
                              `$${(subscription.tier.prices[0].amountMinor / 100).toFixed(2)}/${subscription.tier.prices[0].interval}` : 
                              'Free'
                            }
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unsubscribeTierMutation.mutate(subscription.tierId)}
                          disabled={unsubscribeTierMutation.isPending}
                          data-testid={`unsubscribe-tier-${subscription.tierId}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Available Package Tiers to Subscribe To */}
                  {packages?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary mb-3">Available Packages</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {packages.map((packageItem: any) => (
                          <div key={packageItem.id}>
                            <h4 className="font-medium text-text-primary mb-2">{packageItem.name}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {packageItem.tiers
                                ?.filter((tier: any) => !tierSubscriptions?.some((sub: any) => sub.tierId === tier.id))
                                .map((tier: any) => (
                                <div
                                  key={tier.id}
                                  className="flex items-center justify-between p-3 border border-border rounded-lg bg-surface hover:border-accent/50 transition-colors"
                                >
                                  <div>
                                    <div className="flex items-center space-x-2 mb-1">
                                      {tier.promotionalTag && (
                                        <Star className="w-3 h-3 text-yellow-500" />
                                      )}
                                      <span className="font-medium text-text-primary text-sm">
                                        {tier.name}
                                      </span>
                                    </div>
                                    <div className="text-xs text-text-secondary">
                                      {tier.prices?.[0] ? 
                                        `$${(tier.prices[0].amountMinor / 100).toFixed(2)}/${tier.prices[0].interval}` : 
                                        'Free'
                                      }
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => subscribeTierMutation.mutate(tier.id)}
                                    disabled={subscribeTierMutation.isPending}
                                    data-testid={`subscribe-tier-${tier.id}`}
                                  >
                                    Subscribe
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="w-16 h-16 text-text-secondary opacity-50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-text-primary mb-2">No Active Package Subscriptions</h3>
                  <p className="text-text-secondary mb-6">
                    Subscribe to a package tier to access marketing tools and automation features.
                  </p>
                  <Link href="/pricing">
                    <Button data-testid="browse-packages-button">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Browse Packages
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usage Statistics */}
          <UsageStatsDisplay />

          {/* Guideline Profiles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Guideline Profiles</span>
              </CardTitle>
              <CardDescription>
                Manage your brand and regulatory guideline profiles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-surface">
                <div>
                  <h4 className="font-medium text-text-primary">Brand & Regulatory Guidelines</h4>
                  <p className="text-sm text-text-secondary">Create and manage reusable guideline profiles for AI tools</p>
                </div>
                <Link href="/app/profile-settings">
                  <Button variant="outline" data-testid="manage-guidelines-button">
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Profiles
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Account Actions</span>
              </CardTitle>
              <CardDescription>
                Manage your account settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div>
                  <h4 className="font-medium text-text-primary">Logout</h4>
                  <p className="text-sm text-text-secondary">Sign out of your account</p>
                </div>
                <a href="/api/auth/logout">
                  <Button variant="outline" data-testid="logout-button">
                    Logout
                  </Button>
                </a>
              </div>
              <div className="flex items-center justify-between p-4 border border-danger/30 rounded-lg bg-danger/5">
                <div>
                  <h4 className="font-medium text-text-primary">Delete Account</h4>
                  <p className="text-sm text-text-secondary">Permanently delete your account and all data</p>
                </div>
                {showDeleteConfirm ? (
                  <div className="space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => deleteAccountMutation.mutate()}
                      disabled={deleteAccountMutation.isPending}
                      data-testid="confirm-delete-account-button"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {deleteAccountMutation.isPending ? "Deleting..." : "Confirm Delete"}
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowDeleteConfirm(true)}
                    data-testid="delete-account-button"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}