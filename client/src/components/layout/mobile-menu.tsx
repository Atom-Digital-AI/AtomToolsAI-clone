import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: Array<{ href: string; label: string }>;
}

export default function MobileMenu({ isOpen, onClose, navItems }: MobileMenuProps) {
  if (!isOpen) return null;
  
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  const handleLinkClick = () => {
    onClose();
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      
      if (response.ok) {
        // Clear the auth cache and redirect
        const { queryClient } = await import("@/lib/queryClient");
        queryClient.clear();
        window.location.href = "/";
      } else {
        throw new Error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
    onClose();
  };

  return (
    <div 
      className="md:hidden bg-surface border-t border-border" 
      role="navigation" 
      aria-label="Mobile navigation"
      data-testid="mobile-menu"
    >
      <div className="px-4 py-6 space-y-4">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a 
              className="block text-text-secondary hover:text-text-primary transition-colors font-medium"
              onClick={handleLinkClick}
              data-testid={`mobile-nav-link-${item.label.toLowerCase()}`}
            >
              {item.label}
            </a>
          </Link>
        ))}
        
        {isAuthenticated ? (
          <div className="space-y-3 border-t border-border pt-4">
            <Button 
              variant="ghost"
              className="flex w-full items-center justify-start space-x-2 text-text-secondary hover:text-text-primary"
              onClick={handleLinkClick}
              data-testid="mobile-account-button"
            >
              <User className="w-4 h-4" />
              <span>Account</span>
            </Button>
            <Button 
              variant="ghost"
              className="flex w-full items-center justify-start space-x-2 text-text-secondary hover:text-text-primary"
              onClick={handleLogout}
              data-testid="mobile-logout-button"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-3 border-t border-border pt-4">
            <Link href="/login">
              <Button 
                variant="ghost"
                className="block w-full text-left text-text-secondary hover:text-text-primary"
                onClick={handleLinkClick}
                data-testid="mobile-login-button"
              >
                Login
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button 
                className="block w-full bg-accent hover:bg-accent-2 text-white px-4 py-2 rounded-xl font-medium text-center"
                onClick={handleLinkClick}
                data-testid="mobile-signup-button"
              >
                Sign up free
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
