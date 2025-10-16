import { Link, useLocation } from "wouter";
import { useBrand } from "@/contexts/BrandContext";
import { FileText, History, Sparkles } from "lucide-react";

export default function BrandSubNav() {
  const { selectedBrand } = useBrand();
  const [location] = useLocation();

  if (!selectedBrand) {
    return null;
  }

  const subNavItems = [
    {
      href: `/app/profile-settings?edit=${selectedBrand.id}`,
      label: "Brand Guidelines",
      icon: FileText,
      testId: "subnav-brand-guidelines"
    },
    {
      href: `/app/content-history?brand=${selectedBrand.id}`,
      label: "Content Library",
      icon: History,
      testId: "subnav-content-library"
    }
  ];

  return (
    <div className="border-b border-border/50 bg-surface/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-6 h-12">
          {/* Selected Brand Indicator */}
          <div className="flex items-center gap-2 text-sm" data-testid="selected-brand-indicator">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-text-secondary">Brand:</span>
            <span className="font-medium text-text-primary">{selectedBrand.name}</span>
          </div>

          {/* Divider */}
          <div className="h-4 w-px bg-border/50" />

          {/* Quick Links */}
          <nav className="flex items-center gap-4" aria-label="Brand navigation">
            {subNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.startsWith(item.href.split('?')[0]);
              
              return (
                <Link key={item.href} href={item.href} data-testid={item.testId}>
                  <span 
                    className={`flex items-center gap-2 text-sm transition-colors cursor-pointer ${
                      isActive
                        ? "text-accent font-medium"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
