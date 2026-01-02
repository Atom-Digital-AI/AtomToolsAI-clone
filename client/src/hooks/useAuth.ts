import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import * as Sentry from "@sentry/react";
import { useEffect } from "react";

// Response type for auth state including verification/completion requirements
interface AuthResponse {
  user: User | null;
  requiresVerification?: boolean;
  requiresProfileCompletion?: boolean;
}

export function useAuth() {
  const { data, isLoading, error, refetch } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    queryFn: async (): Promise<AuthResponse> => {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          // User is not authenticated
          return { user: null };
        }
        if (response.status === 403) {
          // User is authenticated but needs verification or profile completion
          const errorData = await response.json();
          return {
            user: null,
            requiresVerification: errorData.requiresVerification || false,
            requiresProfileCompletion: errorData.requiresProfileCompletion || false,
          };
        }
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      const user = await response.json();
      return { user };
    },
    retry: (failureCount, error) => {
      // Retry up to 2 times for network errors, but not for auth errors
      if (error?.message?.startsWith("401") || error?.message?.startsWith("403")) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * (attemptIndex + 1), 3000),
    // Shorter stale time to catch session changes faster
    staleTime: 30 * 1000, // 30 seconds
    // Refetch when window regains focus to catch session expiry
    refetchOnWindowFocus: true,
    // Don't refetch on mount if data is fresh
    refetchOnMount: true,
  });

  // Extract user and flags from response
  const user = data?.user;
  const requiresVerification = data?.requiresVerification || false;
  const requiresProfileCompletion = data?.requiresProfileCompletion || false;

  // Set user context in Sentry when user data changes
  useEffect(() => {
    if (import.meta.env.VITE_SENTRY_DSN && user) {
      Sentry.setUser({
        id: user.id.toString(),
        email: user.email,
        username: user.email,
      });
    } else if (import.meta.env.VITE_SENTRY_DSN && !user && !isLoading) {
      // Clear user context when logged out
      Sentry.setUser(null);
    }
  }, [user, isLoading]);

  return {
    user: user as User | undefined,
    isLoading,
    isAuthenticated: !!user && !error && !requiresVerification && !requiresProfileCompletion,
    requiresVerification,
    requiresProfileCompletion,
    error,
    refetch,
  };
}