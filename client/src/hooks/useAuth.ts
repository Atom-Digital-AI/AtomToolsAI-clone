import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 401) {
          return null; // User is not authenticated, return null instead of throwing
        }
        if (response.status === 403) {
          const errorData = await response.json();
          // Return special state for email verification or profile completion
          throw new Error(JSON.stringify(errorData));
        }
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Parse 403 errors to check for specific requirements
  let requiresVerification = false;
  let requiresProfileCompletion = false;
  
  if (error?.message) {
    try {
      const errorData = JSON.parse(error.message);
      requiresVerification = errorData.requiresVerification;
      requiresProfileCompletion = errorData.requiresProfileCompletion;
    } catch {
      // Not a JSON error, ignore
    }
  }

  return {
    user: user as User | undefined,
    isLoading,
    isAuthenticated: !!user && !error,
    requiresVerification,
    requiresProfileCompletion,
    error,
  };
}