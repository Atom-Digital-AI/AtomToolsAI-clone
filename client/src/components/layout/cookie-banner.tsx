import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasConsented, setHasConsented] = useState<string | null>(null);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    setHasConsented(consent);
    
    // Show banner after 1 second if no consent recorded
    if (!consent) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setIsVisible(false);
    setHasConsented('accepted');
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setIsVisible(false);
    setHasConsented('declined');
  };

  if (!isVisible || hasConsented) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-4 z-50 animate-slide-up"
      data-testid="cookie-banner"
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-text-secondary" data-testid="cookie-message">
          We use essential cookies and similar technologies to improve your experience. 
          <a 
            href="/privacy" 
            className="text-accent hover:text-accent-2 underline ml-1"
            data-testid="cookie-privacy-link"
          >
            Manage preferences
          </a>
        </p>
        <div className="flex gap-3">
          <Button
            onClick={handleAccept}
            className="bg-accent hover:bg-accent-2 text-white px-4 py-2 rounded-lg text-sm font-medium"
            data-testid="cookie-accept"
          >
            Accept
          </Button>
          <Button
            variant="ghost"
            onClick={handleDecline}
            className="text-text-secondary hover:text-text-primary px-4 py-2 rounded-lg text-sm"
            data-testid="cookie-decline"
          >
            Decline
          </Button>
        </div>
      </div>
    </div>
  );
}
