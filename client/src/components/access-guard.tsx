import { ReactNode, useEffect } from "react";
import { useProductAccess } from "@/hooks/useProductAccess";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, CreditCard, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AccessGuardProps {
  productId: string;
  productName: string;
  children: ReactNode;
  fallbackRoute?: string;
}

export function AccessGuard({ 
  productId, 
  productName, 
  children, 
  fallbackRoute = "/app/my-tools" 
}: AccessGuardProps) {
  const { hasAccess, isLoading, error } = useProductAccess(productId);
  const { toast } = useToast();

  useEffect(() => {
    if (error) {
      toast({
        title: "Access Check Failed",
        description: "Unable to verify product access. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6 text-center py-12">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Check Failed</h2>
            <p className="text-text-secondary mb-4">
              Unable to verify your access to this product.
            </p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-2xl">Subscription Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-6 text-lg text-[#ffffff]">
              You need an active subscription to access <strong>{productName}</strong>.
            </p>
            <p className="text-sm mb-6 text-[#ffffff]">
              Subscribe to unlock this powerful marketing tool and start automating your workflow today.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => window.location.href = fallbackRoute}
                data-testid="button-subscribe-now"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Subscribe Now
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = "/app"}
                data-testid="button-back-dashboard"
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}