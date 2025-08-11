import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, LogOut } from "lucide-react";
import { type User } from "@shared/schema";
import AuthGuard from "@/components/auth-guard";

function DashboardContent() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    retry: false,
    refetchOnMount: true,
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { 
        method: "POST",
        credentials: "include"
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
    window.location.href = "/";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  if (error || !user) {
    console.log("Authentication failed:", { error, user });
    // Only redirect if we have an actual error, not just no user data yet
    if (error && !isLoading) {
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-text-secondary">
          {error ? "Authentication failed, redirecting..." : "Loading user data..."}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen w-full">{/* Removed duplicate header - using main Header component instead */}

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Welcome back, {user.firstName}!
          </h1>
          <p className="text-text-secondary">
            Manage your marketing automation tools and campaigns from your dashboard.
          </p>
        </div>



        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 max-w-7xl mx-auto">
          <Card className="border-border bg-surface">
            <CardHeader>
              <CardTitle className="text-text-primary">Quick Actions</CardTitle>
              <CardDescription className="text-text-secondary">
                Get started with your most used tools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start bg-accent hover:bg-accent-2 text-white"
                data-testid="manage-subscriptions-button"
                onClick={() => window.location.href = "/app/account"}
              >
                Manage Package Subscriptions
              </Button>
              <Button 
                variant="outline"
                className="w-full justify-start border-border text-text-secondary hover:text-text-primary"
                data-testid="facebook-ads-button"
                onClick={() => window.location.href = "/app/tools/facebook-ads-connector"}
              >
                Facebook Ads Connector
              </Button>
              <Button 
                variant="outline"
                className="w-full justify-start border-border text-text-secondary hover:text-text-primary"
                data-testid="seo-meta-button"
                onClick={() => window.location.href = "/app/tools/seo-meta-generator"}
              >
                SEO Meta Generator
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-surface">
            <CardHeader>
              <CardTitle className="text-text-primary">Account Settings</CardTitle>
              <CardDescription className="text-text-secondary">
                Manage your profile and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                <div>
                  <div className="font-medium text-text-primary">Email</div>
                  <div className="text-sm text-text-secondary">{user.email}</div>
                </div>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                <div>
                  <div className="font-medium text-text-primary">Name</div>
                  <div className="text-sm text-text-secondary">{user.firstName} {user.lastName}</div>
                </div>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <AuthGuard requiresAuth={true}>
      <DashboardContent />
    </AuthGuard>
  );
}