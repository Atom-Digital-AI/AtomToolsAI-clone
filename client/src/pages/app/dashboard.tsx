import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, Zap, Settings, LogOut } from "lucide-react";
import { type User } from "@shared/schema";

export default function Dashboard() {
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <svg width="120" height="32" viewBox="0 0 140 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-text-primary">
                {/* Atomic symbol */}
                <g>
                  {/* Central nucleus */}
                  <circle cx="16" cy="16" r="2.5" fill="#6366F1"/>
                  
                  {/* Electron orbits */}
                  <ellipse cx="16" cy="16" rx="12" ry="4" stroke="#6366F1" strokeWidth="1.2" fill="none" opacity="0.6" transform="rotate(0 16 16)"/>
                  <ellipse cx="16" cy="16" rx="12" ry="4" stroke="#6366F1" strokeWidth="1.2" fill="none" opacity="0.6" transform="rotate(60 16 16)"/>
                  <ellipse cx="16" cy="16" rx="12" ry="4" stroke="#6366F1" strokeWidth="1.2" fill="none" opacity="0.6" transform="rotate(120 16 16)"/>
                  
                  {/* Electrons */}
                  <circle cx="28" cy="16" r="1.5" fill="#6366F1" opacity="0.8"/>
                  <circle cx="8" cy="8" r="1.5" fill="#6366F1" opacity="0.8"/>
                  <circle cx="24" cy="24" r="1.5" fill="#6366F1" opacity="0.8"/>
                </g>
                
                {/* Typography */}
                <text x="36" y="22" fontFamily="Inter, system-ui, sans-serif" fontSize="16" fontWeight="600" fill="currentColor">
                  atom<tspan fill="#6366F1">tools</tspan>.ai
                </text>
              </svg>
              <span className="text-text-secondary">Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-text-secondary">Welcome, {user.username}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-text-secondary hover:text-text-primary"
                data-testid="logout-button"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Welcome back, {user.username}!
          </h1>
          <p className="text-text-secondary">
            Manage your marketing automation tools and campaigns from your dashboard.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-border bg-surface">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                Active Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-text-primary">12</div>
              <p className="text-xs text-text-secondary">+2 from last month</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-surface">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Total Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-text-primary">1,247</div>
              <p className="text-xs text-text-secondary">+18% from last month</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-surface">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary flex items-center">
                <Zap className="h-4 w-4 mr-2" />
                Automations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-text-primary">8</div>
              <p className="text-xs text-text-secondary">3 running now</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
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
                data-testid="create-campaign-button"
              >
                Create New Campaign
              </Button>
              <Button 
                variant="outline"
                className="w-full justify-start border-border text-text-secondary hover:text-text-primary"
                data-testid="facebook-ads-button"
              >
                Facebook Ads Connector
              </Button>
              <Button 
                variant="outline"
                className="w-full justify-start border-border text-text-secondary hover:text-text-primary"
                data-testid="seo-meta-button"
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
                  <div className="font-medium text-text-primary">Username</div>
                  <div className="text-sm text-text-secondary">{user.username}</div>
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