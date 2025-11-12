import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, X, CreditCard, Package } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { ProductWithSubscriptionStatus } from "@shared/schema";

export default function Subscriptions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery<
    ProductWithSubscriptionStatus[]
  >({
    queryKey: ["products-with-status"],
    queryFn: async () => {
      const response = await fetch("/api/products/with-status", {
        credentials: "include",
      });
      if (!response.ok)
        throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: async (productId: string) => {
      await apiRequest("POST", "/api/subscriptions", { productId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-with-status"] });
      toast({
        title: "Success!",
        description: "You have successfully subscribed to this product.",
      });
    },
    onError: (error) => {
      toast({
        title: "Subscription Failed",
        description: error.message || "Failed to subscribe to product",
        variant: "destructive",
      });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async (productId: string) => {
      await apiRequest("DELETE", `/api/subscriptions/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-with-status"] });
      toast({
        title: "Unsubscribed",
        description: "You have successfully unsubscribed from this product.",
      });
    },
    onError: (error) => {
      toast({
        title: "Unsubscribe Failed",
        description: error.message || "Failed to unsubscribe from product",
        variant: "destructive",
      });
    },
  });

  const subscribedProducts = products.filter((p) => p.isSubscribed);
  const availableProducts = products.filter((p) => !p.isSubscribed);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="h-64 flex items-center justify-center">
          <div
            className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
            aria-label="Loading"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Subscriptions</h1>
        <p className="text-text-secondary">
          Manage your product subscriptions and discover new tools
        </p>
      </div>

      {/* Subscribed Products */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <Package className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-semibold">Active Subscriptions</h2>
          <Badge variant="secondary">{subscribedProducts.length}</Badge>
        </div>

        {subscribedProducts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center py-12">
              <Package className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                No Active Subscriptions
              </h3>
              <p className="text-text-secondary">
                Subscribe to products below to get started with your marketing
                automation tools.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subscribedProducts.map((product) => (
              <Card
                key={product.id}
                className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg leading-tight">
                      {product.name}
                    </CardTitle>
                    <Badge
                      variant="default"
                      className="bg-green-600 text-white"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-text-secondary text-sm mb-4 line-clamp-3">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {/* Products don't have direct prices - prices are on tiers */}
                      Free
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unsubscribeMutation.mutate(product.id)}
                      disabled={unsubscribeMutation.isPending}
                      data-testid={`button-unsubscribe-${product.id}`}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Unsubscribe
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Available Products */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-semibold">Available Products</h2>
          <Badge variant="outline">{availableProducts.length}</Badge>
        </div>

        {availableProducts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <CreditCard className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                All Products Subscribed
              </h3>
              <p className="text-text-secondary">
                You have subscribed to all available products. New products will
                appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableProducts.map((product) => (
              <Card
                key={product.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <CardTitle className="text-lg leading-tight">
                    {product.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-text-secondary text-sm mb-4 line-clamp-3">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">
                      {/* Products don't have direct prices - prices are on tiers */}
                      Free
                    </span>
                    <Button
                      onClick={() => subscribeMutation.mutate(product.id)}
                      disabled={subscribeMutation.isPending}
                      data-testid={`button-subscribe-${product.id}`}
                    >
                      <CreditCard className="w-4 h-4 mr-1" />
                      Subscribe
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
