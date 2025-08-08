import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, LogOut, Zap, Database, BarChart3, Target } from "lucide-react";
import type { User } from "@shared/schema";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const typedUser = user as User;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="/logo-icon.svg" alt="atomtools.ai" className="h-8 w-8" />
            <span className="text-xl font-bold">atomtools.ai</span>
          </div>
          <div className="flex items-center space-x-4">
            <Avatar className="h-8 w-8">
              <AvatarImage src={typedUser?.profileImageUrl || undefined} />
              <AvatarFallback>
                {typedUser?.firstName?.[0] || ''}{typedUser?.lastName?.[0] || ''}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              {typedUser?.firstName} {typedUser?.lastName}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = "/api/logout"}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {typedUser?.firstName || 'User'}!
          </h1>
          <p className="text-muted-foreground">
            Here's your marketing tools dashboard
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" data-testid="card-connectors">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Data Connectors</CardTitle>
              <CardDescription>
                Connect your marketing platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full">
                Manage Connections
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" data-testid="card-generators">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">AI Generators</CardTitle>
              <CardDescription>
                Generate ad copy and content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full">
                Start Generating
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" data-testid="card-automation">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Automation</CardTitle>
              <CardDescription>
                Set up automated workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full">
                Create Workflow
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" data-testid="card-analytics">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Analytics</CardTitle>
              <CardDescription>
                View performance reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full">
                View Reports
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest tool usage and automations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <p>No recent activity yet.</p>
              <p className="text-sm mt-2">Start using tools to see your activity here.</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}