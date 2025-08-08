import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: Array<{ href: string; label: string }>;
}

export default function MobileMenu({ isOpen, onClose, navItems }: MobileMenuProps) {
  if (!isOpen) return null;

  const handleLinkClick = () => {
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
    </div>
  );
}
