import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import MobileMenu from "@/components/layout/mobile-menu";

export default function Header() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/tools", label: "Tools" },
    { href: "/pricing", label: "Pricing" },
    { href: "/resources", label: "Resources" },
    { href: "/contact", label: "Contact" },
  ];

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
            <Link href="/">
              <div 
                className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-accent rounded-lg p-1 cursor-pointer"
                data-testid="logo-link"
              >
                <svg width="32" height="32" viewBox="0 0 32 32" className="text-accent">
                  <circle cx="16" cy="16" r="3" fill="currentColor"/>
                  <path 
                    d="M16 8a8 8 0 0 1 8 8 8 8 0 0 1-8 8 8 8 0 0 1-8-8 8 8 0 0 1 8-8z" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    fill="none" 
                    opacity="0.6"
                  />
                  <path 
                    d="M8 16h16M16 8v16" 
                    stroke="currentColor" 
                    strokeWidth="1" 
                    opacity="0.4"
                  />
                </svg>
                <span className="font-display font-semibold text-lg text-text-primary">
                  atomtools.ai
                </span>
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
          
          {/* CTA Button */}
          <div className="hidden md:flex">
            <Link href="/sign-up">
              <Button 
                className="bg-accent hover:bg-accent-2 text-white px-4 py-2 rounded-xl font-medium"
                data-testid="header-signup-button"
              >
                Sign up free
              </Button>
            </Link>
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
