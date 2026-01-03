import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Bell,
  Package,
  Zap,
  ArrowRight,
  Check,
  Star,
  Settings,
} from "lucide-react";
import { type User, type ProductWithSubscriptionStatus } from "@shared/schema";
import AuthGuard from "@/components/auth-guard";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedResourceType?: string;
  relatedResourceId?: string;
  createdAt: string;
}

function DashboardContent() {
  const { toast } = useToast();

  const {
    data: user,
    isLoading,
    error,
  } = useQuery<User>({
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

  // Get tier subscriptions
  const { data: tierSubscriptions, isLoading: tiersLoading } = useQuery<
    Array<{ id: string; tierId: string; subscribedAt: string }>
  >({
    queryKey: ["/api/user/tier-subscriptions"],
    retry: false,
  });

  // Get all products for display
  const { data: products, isLoading: productsLoading } = useQuery<
    ProductWithSubscriptionStatus[]
  >({
    queryKey: ["/api/products/with-status"],
    retry: false,
  });

  // Get notifications
  const { data: notificationsData } = useQuery<{
    notifications: Notification[];
  }>({
    queryKey: ["/api/notifications"],
    retry: false,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      apiRequest("PATCH", `/api/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const notifications: Notification[] = notificationsData?.notifications || [];
  const unreadNotifications: Notification[] = notifications
    .filter((n) => !n.isRead)
    .slice(0, 3);

  if (isLoading || tiersLoading || productsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  if (error || !user) {
    console.log("Authentication failed:", { error, user });
    if (error && !isLoading) {
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-text-secondary">
          {error
            ? "Authentication failed, redirecting..."
            : "Loading user data..."}
        </div>
      </div>
    );
  }

  const subscribedProducts = products?.filter((p) => p.isSubscribed) || [];

  return (
    <div className="bg-background min-h-screen w-full">
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Welcome back, {user.firstName}!
          </h1>
          <p className="text-text-secondary">
            Manage your marketing automation tools and campaigns from your
            dashboard.
          </p>
        </div>

        {/* Notifications Widget */}
        {unreadNotifications.length > 0 && (
          <div className="max-w-7xl mx-auto mb-8">
            <Card className="border-border bg-surface">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-accent" />
                    <CardTitle className="text-text-primary">
                      Recent Notifications
                    </CardTitle>
                    {unreadNotifications.length > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {unreadNotifications.length} new
                      </Badge>
                    )}
                  </div>
                  <Link href="/app">
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid="view-all-notifications"
                    >
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {unreadNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start justify-between p-3 bg-background rounded-lg border border-border hover:border-accent/50 transition-colors"
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-text-primary">
                        {notification.title}
                      </div>
                      <div className="text-sm text-text-secondary mt-1">
                        {notification.message}
                      </div>
                      <div className="text-xs text-text-secondary mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsReadMutation.mutate(notification.id)}
                      disabled={markAsReadMutation.isPending}
                      data-testid={`mark-read-${notification.id}`}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active Packages/Tiers */}
        {tierSubscriptions &&
          Array.isArray(tierSubscriptions) &&
          tierSubscriptions.length > 0 && (
            <div className="max-w-7xl mx-auto mb-8">
              <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Your Active Packages
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(tierSubscriptions as any[]).map((subscription: any) => (
                  <Card
                    key={subscription.id}
                    className="border-green-500/30 bg-green-500/5 dark:border-green-400/30 dark:bg-green-400/5"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center text-text-primary">
                          {subscription.tier?.promotionalTag && (
                            <Star className="w-4 h-4 mr-2 text-yellow-500" />
                          )}
                          {subscription.tier?.name}
                        </CardTitle>
                        <Badge
                          variant="default"
                          className="bg-green-600 text-white dark:bg-green-500 dark:text-white"
                        >
                          Active
                        </Badge>
                      </div>
                      <CardDescription className="text-text-secondary">
                        {subscription.tier?.package?.name} -{" "}
                        {subscription.tier?.package?.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-text-secondary">
                        Subscribed:{" "}
                        {new Date(
                          subscription.subscribedAt
                        ).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

        {/* My Tools Section */}
        {subscribedProducts.length > 0 && (
          <div className="max-w-7xl mx-auto mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              My Tools
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subscribedProducts.map((product) => (
                <Card
                  key={product.id}
                  className="hover:shadow-md transition-shadow border-border bg-surface"
                >
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center text-text-primary">
                      <Zap className="w-5 h-5 mr-2 text-green-500" />
                      {product.name}
                    </CardTitle>
                    <CardDescription className="text-text-secondary">
                      {product.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href={product.routePath}>
                      <Button
                        className="w-full gap-2 bg-accent hover:bg-accent-2"
                        data-testid={`access-${product.id}`}
                      >
                        Access Tool
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="max-w-7xl mx-auto">
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            Quick Links
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle className="text-lg text-text-primary">
                  Content Library
                </CardTitle>
                <CardDescription className="text-text-secondary">
                  View all your generated content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/app/content-history">
                  <Button
                    variant="outline"
                    className="w-full"
                    data-testid="content-library-link"
                  >
                    View Content
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle className="text-lg text-text-primary">
                  Brand Guidelines
                </CardTitle>
                <CardDescription className="text-text-secondary">
                  Manage your brand profiles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/app/account">
                  <Button
                    variant="outline"
                    className="w-full"
                    data-testid="brand-guidelines-link"
                  >
                    Manage Brands
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle className="text-lg text-text-primary">
                  Account Settings
                </CardTitle>
                <CardDescription className="text-text-secondary">
                  Manage subscriptions and profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/app/account">
                  <Button
                    variant="outline"
                    className="w-full"
                    data-testid="account-settings-link"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
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
