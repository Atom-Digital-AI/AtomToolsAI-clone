import { useQuery } from "@tanstack/react-query";

interface AccessCheckResult {
  hasAccess: boolean;
  isLoading: boolean;
  error: Error | null;
}

export function useProductAccess(productId: string): AccessCheckResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["product-access", productId],
    queryFn: async () => {
      const response = await fetch(`/api/products/${productId}/access`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!productId,
  });

  return {
    hasAccess: data?.hasAccess ?? false,
    isLoading,
    error,
  };
}