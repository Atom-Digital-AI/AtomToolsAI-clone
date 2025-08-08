import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-4 z-50 transform transition-transform duration-300" data-testid="banner-cookie">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-text-secondary">
          We use essential cookies and similar technologies to improve your experience.{' '}
          <Link href="/privacy" data-testid="link-cookie-privacy">
            <a className="text-accent hover:text-accent-2 underline">Manage preferences</a>
          </Link>
        </p>
        <div className="flex gap-3">
          <Button 
            onClick={handleAccept}
            className="bg-accent hover:bg-accent-2 text-white px-4 py-2 rounded-lg text-sm font-medium"
            data-testid="button-cookie-accept"
          >
            Accept
          </Button>
          <Button 
            onClick={handleDecline}
            variant="ghost"
            className="text-text-secondary hover:text-text-primary px-4 py-2 rounded-lg text-sm"
            data-testid="button-cookie-decline"
          >
            Decline
          </Button>
        </div>
      </div>
    </div>
  );
}
