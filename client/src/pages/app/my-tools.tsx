import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, Lock } from "lucide-react";
import { type ProductWithSubscriptionStatus } from "@shared/schema";

export default function MyTools() {
  const { data: products, isLoading, error } = useQuery<ProductWithSubscriptionStatus[]>({
    queryKey: ["/api/products/with-status"],
  });

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">My Tools</h1>
            <p className="text-text-secondary">Access your subscribed marketing tools</p>
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

  const subscribedProducts = products.filter(p => p.isSubscribed);
  const availableProducts = products.filter(p => !p.isSubscribed);

  return (
    <div className="bg-background min-h-screen">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">My Tools</h1>
          <p className="text-text-secondary">
            Access your subscribed marketing tools and discover new ones
          </p>
        </div>

        {/* Subscribed Tools */}
        {subscribedProducts.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-text-primary mb-6">Your Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subscribedProducts.map((product) => (
                <Card key={product.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <CardDescription>{product.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                        Active
                      </span>
                      <Link href={product.routePath}>
                        <Button size="sm" data-testid={`access-tool-${product.id}`}>
                          Access Tool
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Available Tools */}
        {availableProducts.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-text-primary mb-6">
              {subscribedProducts.length > 0 ? "Available Tools" : "Discover Tools"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableProducts.map((product) => (
                <Card key={product.id} className="opacity-75 hover:opacity-100 transition-opacity">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <span>{product.name}</span>
                      <Lock className="w-4 h-4 text-text-secondary" />
                    </CardTitle>
                    <CardDescription>{product.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-primary">
                        ${product.price}
                      </span>
                      <Link href="/pricing">
                        <Button variant="outline" size="sm" data-testid={`subscribe-tool-${product.id}`}>
                          Subscribe
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {subscribedProducts.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-surface rounded-full flex items-center justify-center">
              <Lock className="w-12 h-12 text-text-secondary" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              No Tools Yet
            </h3>
            <p className="text-text-secondary mb-6 max-w-md mx-auto">
              Subscribe to marketing tools to start automating your campaigns and boosting your productivity.
            </p>
            <Link href="/pricing">
              <Button size="lg">
                Browse Available Tools
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}