import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Download, Trash2, Lock, Settings, CreditCard, X, Plus } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type User as UserType, type ProductWithSubscriptionStatus } from "@shared/schema";

export default function Account() {
  const { data: user, isLoading, error } = useQuery<UserType>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const { data: products, isLoading: productsLoading, error: productsError } = useQuery<ProductWithSubscriptionStatus[]>({
    queryKey: ["/api/products/with-status"],
    enabled: !!user,
    retry: false,
    queryFn: async () => {
      const response = await fetch("/api/products/with-status", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [deletePassword, setDeletePassword] = useState("");

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest("POST", "/api/auth/change-password", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      setShowPasswordDialog(false);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    }
  });

  // Download account data mutation
  const downloadDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/account-data", {
        method: "GET",
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to download data");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `atomtools-account-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Account data downloaded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to download account data",
        variant: "destructive",
      });
    }
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (password: string) => {
      return apiRequest("DELETE", "/api/auth/account", { password });
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted",
      });
      // Redirect to home page
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    }
  });

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match",
        variant: "destructive",
      });
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
  };

  const handleDeleteAccount = () => {
    if (!deletePassword) {
      toast({
        title: "Error",
        description: "Please enter your password to confirm account deletion",
        variant: "destructive",
      });
      return;
    }

    deleteAccountMutation.mutate(deletePassword);
  };

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async (productId: string) => {
      return apiRequest("POST", "/api/subscriptions", { productId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/with-status"] });
      toast({
        title: "Success",
        description: "Successfully subscribed to product",
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

  // Unsubscribe mutation
  const unsubscribeMutation = useMutation({
    mutationFn: async (productId: string) => {
      return apiRequest("DELETE", `/api/subscriptions/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/with-status"] });
      toast({
        title: "Success",
        description: "Successfully unsubscribed from product",
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

  const subscribedProducts = products?.filter(p => p.isSubscribed) || [];
  const availableProducts = products?.filter(p => !p.isSubscribed) || [];
  
  // Debug logging - remove in production
  if (productsError) {
    console.log('Products error:', productsError);
  }
  if (products) {
    console.log('Products loaded successfully:', products.length);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  if (error || !user) {
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
            Manage your account information and preferences.
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
                  <label className="text-sm font-medium text-text-secondary">Username</label>
                  <div className="mt-1 p-3 border border-border rounded-lg bg-surface">
                    {user.username}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Email</label>
                  <div className="mt-1 p-3 border border-border rounded-lg bg-surface flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-text-secondary" />
                    <span>{user.email}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" disabled>
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* My Subscriptions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>My Subscriptions</span>
              </CardTitle>
              <CardDescription>
                Manage your active subscriptions and discover new tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Active Subscriptions */}
                <div>
                  <h3 className="text-sm font-semibold text-text-secondary mb-3">Active Subscriptions</h3>
                  {productsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-surface animate-pulse rounded-lg" />
                      ))}
                    </div>
                  ) : subscribedProducts.length > 0 ? (
                    <div className="space-y-2">
                      {subscribedProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-3 border border-border rounded-lg bg-surface"
                        >
                          <div className="flex-1">
                            <h4 className="font-medium text-text-primary">{product.name}</h4>
                            <p className="text-sm text-text-secondary">{product.description}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                              Active
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => unsubscribeMutation.mutate(product.id)}
                              disabled={unsubscribeMutation.isPending}
                              data-testid={`unsubscribe-${product.id}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-text-secondary">
                      <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No active subscriptions</p>
                      <p className="text-sm">Subscribe to tools to get started</p>
                    </div>
                  )}
                </div>

                {/* Available Products */}
                {availableProducts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-text-secondary mb-3">Available Tools</h3>
                    <div className="space-y-2">
                      {availableProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-3 border border-border rounded-lg"
                        >
                          <div className="flex-1">
                            <h4 className="font-medium text-text-primary">{product.name}</h4>
                            <p className="text-sm text-text-secondary">{product.description}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-primary">
                              ${product.price}
                            </span>
                            <Button
                              size="sm"
                              onClick={() => subscribeMutation.mutate(product.id)}
                              disabled={subscribeMutation.isPending}
                              data-testid={`subscribe-${product.id}`}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              {subscribeMutation.isPending ? "Adding..." : "Subscribe"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>
                Manage your account and data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-3">
                <Button 
                  variant="outline"
                  onClick={() => setShowPasswordDialog(true)}
                  data-testid="change-password-button"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => downloadDataMutation.mutate()}
                  disabled={downloadDataMutation.isPending}
                  data-testid="download-data-button"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {downloadDataMutation.isPending ? "Downloading..." : "Download Account Data"}
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  data-testid="delete-account-button"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Change Password Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Enter your current password and choose a new one.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  data-testid="current-password-input"
                />
              </div>
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  data-testid="new-password-input"
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  data-testid="confirm-password-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPasswordDialog(false)}
                data-testid="cancel-password-change"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePasswordChange}
                disabled={changePasswordMutation.isPending}
                data-testid="confirm-password-change"
              >
                {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Account Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Account</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4">
              <Label htmlFor="delete-password">Enter your password to confirm</Label>
              <Input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Your password"
                data-testid="delete-password-input"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="cancel-delete-account">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="bg-destructive hover:bg-destructive/90"
                disabled={deleteAccountMutation.isPending}
                data-testid="confirm-delete-account"
              >
                {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}