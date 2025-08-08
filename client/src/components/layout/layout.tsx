import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import Header from "./header";
import Footer from "./footer";
import CookieBanner from "@/components/ui/cookie-banner";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  // Update document title based on route
  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "atomtools.ai - Automate your marketing. Scale without hiring.",
      "/tools": "Tools - atomtools.ai",
      "/tools/facebook-ads-looker-studio-connector": "Facebook Ads Looker Studio Connector - atomtools.ai",
      "/tools/seo-meta-generator": "SEO Meta Generator - atomtools.ai", 
      "/tools/google-ads-copy-generator": "Google Ads Copy Generator - atomtools.ai",
      "/pricing": "Pricing - atomtools.ai",
      "/resources": "Resources - atomtools.ai",
      "/contact": "Contact - atomtools.ai",
      "/sign-up": "Sign Up - atomtools.ai",
      "/terms": "Terms of Service - atomtools.ai",
      "/privacy": "Privacy Policy - atomtools.ai",
      "/cookies": "Cookie Policy - atomtools.ai",
    };

    document.title = titles[location] || "atomtools.ai";
  }, [location]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Skip to content link */}
      <a 
        href="#main" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-accent text-white px-4 py-2 rounded-lg z-50"
      >
        Skip to main content
      </a>
      
      <Header />
      
      <main id="main" role="main">
        {children}
      </main>
      
      <Footer />
      <CookieBanner />
    </div>
  );
}
