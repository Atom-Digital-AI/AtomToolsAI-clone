import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

interface AuthGuardProps {
  children: React.ReactNode;
  requiresAuth?: boolean;
}

export default function AuthGuard({ children, requiresAuth = false }: AuthGuardProps) {
  const { isLoading, isAuthenticated, requiresVerification, requiresProfileCompletion } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;

    // If auth is required and user is not authenticated, redirect to login
    if (requiresAuth && !isAuthenticated) {
      setLocation("/login");
      return;
    }

    // If user needs email verification, redirect to verification page
    if (requiresVerification) {
      setLocation("/verify-email");
      return;
    }

    // If user needs to complete profile, redirect to profile completion
    if (requiresProfileCompletion) {
      setLocation("/complete-profile");
      return;
    }
  }, [isLoading, isAuthenticated, requiresVerification, requiresProfileCompletion, requiresAuth, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  // Show children if all requirements are met
  if (!requiresAuth || (isAuthenticated && !requiresVerification && !requiresProfileCompletion)) {
    return <>{children}</>;
  }

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
    </div>
  );
}