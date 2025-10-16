import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, User, Settings, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import MobileMenu from "@/components/layout/mobile-menu";
import BrandSelector from "@/components/layout/BrandSelector";

export default function Header() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();



  const publicNavItems = [
    { href: "/tools", label: "Tools" },
    { href: "/pricing", label: "Pricing" },
    { href: "/resources", label: "Resources" },
    { href: "/contact", label: "Contact" },
  ];

  const authenticatedNavItems = [
    { href: "/app", label: "Dashboard" },
    { href: "/app/my-tools", label: "My Tools" },
    { href: "/app/content-history", label: "Content History" },
    { href: "/app/profile-settings", label: "Guideline Profiles" },
    { href: "/resources", label: "Resources" },
  ];

  const navItems = isAuthenticated ? authenticatedNavItems : publicNavItems;

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      
      if (response.ok) {
        // Clear the auth cache and redirect
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
  };

  return (
    <header 
      className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border" 
      role="banner"
    >
      {/* Skip to content link */}
      <a 
        href="#main" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-accent text-white px-4 py-2 rounded-lg z-50"
        data-testid="skip-to-content"
      >
        Skip to main content
      </a>

      <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href={isAuthenticated ? "/app" : "/"}>
              <div 
                className="flex items-center focus:outline-none focus:ring-2 focus:ring-accent rounded-lg p-1 cursor-pointer text-text-primary"
                data-testid="logo-link"
              >
                <svg width="200" height="48" viewBox="0 0 140 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Atomic symbol */}
                  <g>
                    {/* Central nucleus */}
                    <circle cx="16" cy="16" r="2.5" fill="#6366F1"/>
                    
                    {/* Electron orbits */}
                    <ellipse cx="16" cy="16" rx="12" ry="4" stroke="#6366F1" strokeWidth="1.2" fill="none" opacity="0.6" transform="rotate(0 16 16)"/>
                    <ellipse cx="16" cy="16" rx="12" ry="4" stroke="#6366F1" strokeWidth="1.2" fill="none" opacity="0.6" transform="rotate(60 16 16)"/>
                    <ellipse cx="16" cy="16" rx="12" ry="4" stroke="#6366F1" strokeWidth="1.2" fill="none" opacity="0.6" transform="rotate(120 16 16)"/>
                    
                    {/* Electrons */}
                    <circle cx="28" cy="16" r="1.5" fill="#6366F1" opacity="0.8"/>
                    <circle cx="8" cy="8" r="1.5" fill="#6366F1" opacity="0.8"/>
                    <circle cx="24" cy="24" r="1.5" fill="#6366F1" opacity="0.8"/>
                  </g>
                  
                  {/* Typography */}
                  <text x="36" y="22" fontFamily="Inter, system-ui, sans-serif" fontSize="16" fontWeight="600" fill="currentColor">
                    atom<tspan fill="#6366F1">tools</tspan>.ai
                  </text>
                </svg>
              </div>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <span 
                  className={`transition-colors font-medium cursor-pointer ${
                    location === item.href
                      ? "text-text-primary"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                  data-testid={`nav-link-${item.label.toLowerCase()}`}
                >
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
          
          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {isLoading ? (
              <div className="w-20 h-8 bg-surface animate-pulse rounded-md" />
            ) : isAuthenticated ? (
              <>
                <BrandSelector />
                <Link href="/app/account">
                  <Button 
                    variant="ghost" 
                    className="text-text-secondary hover:text-text-primary flex items-center space-x-2"
                    data-testid="account-button"
                  >
                    <User className="w-4 h-4" />
                    <span>Account</span>
                  </Button>
                </Link>
                {user?.isAdmin && (
                  <Link href="/admin">
                    <Button 
                      variant="ghost" 
                      className="text-orange-400 hover:text-orange-300 flex items-center space-x-2"
                      data-testid="admin-button"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin</span>
                    </Button>
                  </Link>
                )}
                <Button 
                  variant="ghost" 
                  className="text-text-secondary hover:text-text-primary flex items-center space-x-2"
                  onClick={handleLogout}
                  data-testid="logout-button"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <span 
                    className="text-text-secondary hover:text-text-primary font-medium cursor-pointer transition-colors"
                    data-testid="header-login-link"
                  >
                    Login
                  </span>
                </Link>
                <Link href="/sign-up">
                  <Button 
                    className="bg-accent hover:bg-accent-2 text-white px-4 py-2 rounded-xl font-medium"
                    data-testid="header-signup-button"
                  >
                    Sign up free
                  </Button>
                </Link>
              </>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-text-secondary hover:text-text-primary p-2"
              aria-label="Toggle mobile menu"
              data-testid="mobile-menu-toggle"
            >
              <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
            </Button>
          </div>
        </div>
      </nav>
      
      {/* Mobile menu */}
      <MobileMenu 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
        navItems={navItems}
      />
    </header>
  );
}
