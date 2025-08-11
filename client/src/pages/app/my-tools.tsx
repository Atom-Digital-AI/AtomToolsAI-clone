import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowRight, Lock, Zap, Package, Star } from "lucide-react";
import { type ProductWithSubscriptionStatus } from "@shared/schema";

export default function MyTools() {
  // Get tier subscriptions (new system)
  const { data: tierSubscriptions, isLoading: tiersLoading } = useQuery({
    queryKey: ["/api/user/tier-subscriptions"],
    retry: false,
  });

  // Get all products for display
  const { data: products, isLoading: productsLoading, error } = useQuery<ProductWithSubscriptionStatus[]>({
    queryKey: ["/api/products/with-status"],
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

  const isLoading = tiersLoading || productsLoading;

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">My Tools</h1>
            <p className="text-text-secondary">Access your marketing tools</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-surface animate-pulse rounded-lg" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error || !products) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="text-text-secondary">
          Failed to load tools. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">My Tools</h1>
          <p className="text-text-secondary">
            Access your marketing tools based on your package subscriptions
          </p>
        </div>

        {/* Active Package Subscriptions */}
        {tierSubscriptions && Array.isArray(tierSubscriptions) && tierSubscriptions.length > 0 ? (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-text-primary mb-6 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Your Active Packages
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {(tierSubscriptions as any[]).map((subscription: any) => (
                <Card key={subscription.id} className="border-green-500/30 bg-green-500/5 dark:border-green-400/30 dark:bg-green-400/5">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center text-text-primary">
                        {subscription.tier?.promotionalTag && (
                          <Star className="w-4 h-4 mr-2 text-yellow-500" />
                        )}
                        {subscription.tier?.name}
                      </CardTitle>
                      <Badge variant="default" className="bg-green-600 text-white dark:bg-green-500 dark:text-white">
                        Active
                      </Badge>
                    </div>
                    <CardDescription className="text-text-secondary">
                      {subscription.tier?.package?.name} - {subscription.tier?.package?.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-text-secondary">
                      Subscribed: {new Date(subscription.subscribedAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tools Available Through Subscriptions */}
            <h3 className="text-lg font-semibold text-text-primary mb-6">Available Tools</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products?.filter(p => p.isSubscribed).map((product) => (
                <Card key={product.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Zap className="w-5 h-5 mr-2 text-green-500" />
                      {product.name}
                    </CardTitle>
                    <CardDescription>{product.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href={product.routePath}>
                      <Button className="w-full gap-2" data-testid={`access-${product.id}`}>
                        Access Tool
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-12">
            {/* No Active Subscriptions */}
            <Card className="border-dashed border-2 border-border">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Package className="w-16 h-16 text-text-secondary opacity-50 mb-4" />
                <h3 className="text-xl font-semibold text-text-primary mb-2">No Active Package Subscriptions</h3>
                <p className="text-text-secondary text-center mb-6 max-w-md">
                  Subscribe to a package tier to access marketing tools and automation features.
                </p>
                <Link href="/pricing">
                  <Button data-testid="view-packages-button">
                    View Available Packages
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* All Available Tools Preview */}
        <div>
          <h2 className="text-xl font-semibold text-text-primary mb-6">All Available Tools</h2>
          <p className="text-text-secondary mb-6">
            These tools are available through our package subscriptions. Access depends on your tier.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products?.map((product) => (
              <Card key={product.id} className={`hover:shadow-md transition-shadow ${!product.isSubscribed ? 'opacity-75' : ''}`}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    {product.isSubscribed ? (
                      <Zap className="w-5 h-5 mr-2 text-green-500" />
                    ) : (
                      <Lock className="w-5 h-5 mr-2 text-text-secondary" />
                    )}
                    {product.name}
                  </CardTitle>
                  <CardDescription>{product.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {product.isSubscribed ? (
                    <Link href={product.routePath}>
                      <Button className="w-full gap-2" data-testid={`access-${product.id}`}>
                        Access Tool
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-text-secondary mb-3">Available in package tiers</p>
                      <Link href="/pricing">
                        <Button variant="outline" className="w-full" data-testid={`upgrade-for-${product.id}`}>
                          View Packages
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}