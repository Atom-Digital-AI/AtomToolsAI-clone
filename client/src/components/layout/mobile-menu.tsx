import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, User, Shield, FileText, History, Bell, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useBrand } from "@/contexts/BrandContext";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: Array<{ href: string; label: string }>;
}

export default function MobileMenu({ isOpen, onClose, navItems }: MobileMenuProps) {
  if (!isOpen) return null;
  
  const { isAuthenticated, isLoading, user } = useAuth();
  const { selectedBrand } = useBrand();
  const { toast } = useToast();

  // Fetch notifications for unread count
  const { data: notificationsData } = useQuery<{ notifications: any[]; unreadCount: number }>({
    queryKey: ["/api/notifications"],
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

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
            <span 
              className="block text-text-secondary hover:text-text-primary transition-colors font-medium cursor-pointer"
              onClick={handleLinkClick}
              data-testid={`mobile-nav-link-${item.label.toLowerCase()}`}
            >
              {item.label}
            </span>
          </Link>
        ))}
        
        {isAuthenticated ? (
          <div className="space-y-3">
            {/* Brand Context Section */}
            {selectedBrand && (
              <>
                <Separator className="my-4" />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-2 py-1 text-sm" data-testid="mobile-selected-brand">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <span className="text-text-secondary">Brand:</span>
                    <span className="font-medium text-text-primary">{selectedBrand.name}</span>
                  </div>
                  
                  <Link href={`/app/profile-settings?edit=${selectedBrand.id}`}>
                    <Button 
                      variant="ghost"
                      className="flex w-full items-center justify-start space-x-2 text-text-secondary hover:text-text-primary"
                      onClick={handleLinkClick}
                      data-testid="mobile-brand-guidelines-button"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Brand Guidelines</span>
                    </Button>
                  </Link>
                  
                  <Link href={`/app/content-history?brand=${selectedBrand.id}`}>
                    <Button 
                      variant="ghost"
                      className="flex w-full items-center justify-start space-x-2 text-text-secondary hover:text-text-primary"
                      onClick={handleLinkClick}
                      data-testid="mobile-content-library-button"
                    >
                      <History className="w-4 h-4" />
                      <span>Content Library</span>
                    </Button>
                  </Link>
                </div>
              </>
            )}
            
            <Separator className="my-4" />
            
            {/* User Actions Section */}
            <div className="space-y-3">
              <Link href="/app/notifications">
                <Button 
                  variant="ghost"
                  className="flex w-full items-center justify-between text-text-secondary hover:text-text-primary"
                  onClick={handleLinkClick}
                  data-testid="mobile-notifications-button"
                >
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4" />
                    <span>Notifications</span>
                  </div>
                  {notificationsData?.unreadCount && notificationsData.unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                      {notificationsData.unreadCount}
                    </span>
                  )}
                </Button>
              </Link>
              
              <Link href="/app/account">
                <Button 
                  variant="ghost"
                  className="flex w-full items-center justify-start space-x-2 text-text-secondary hover:text-text-primary"
                  onClick={handleLinkClick}
                  data-testid="mobile-account-button"
                >
                  <User className="w-4 h-4" />
                  <span>Account</span>
                </Button>
              </Link>
              
              {user?.isAdmin && (
                <Link href="/admin">
                  <Button 
                    variant="ghost"
                    className="flex w-full items-center justify-start space-x-2 text-orange-400 hover:text-orange-300"
                    onClick={handleLinkClick}
                    data-testid="mobile-admin-button"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin</span>
                  </Button>
                </Link>
              )}
              
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
