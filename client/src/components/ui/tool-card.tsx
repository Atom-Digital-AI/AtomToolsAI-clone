import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

interface ToolCardProps {
  name: string;
  description: string;
  icon: string;
  iconColor: string;
  badge: {
    text: string;
    variant: "success" | "warning" | "accent";
  };
  features: string[];
  href: string;
}

export default function ToolCard({ 
  name, 
  description, 
  icon, 
  iconColor, 
  badge, 
  features, 
  href 
}: ToolCardProps) {
  const getBadgeColors = (variant: string) => {
    const colors = {
      success: "bg-success/10 text-success",
      warning: "bg-warning/10 text-warning",
      accent: "bg-accent/10 text-accent",
    };
    return colors[variant as keyof typeof colors] || colors.success;
  };

  return (
    <Card className="bg-surface border-border hover:border-accent/50 transition-all group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 ${iconColor} rounded-xl flex items-center justify-center`}>
            <i className={`${icon} text-xl`}></i>
          </div>
          <Badge className={getBadgeColors(badge.variant)}>{badge.text}</Badge>
        </div>
        
        <h3 className="font-display text-lg font-semibold mb-2 text-text-primary">{name}</h3>
        <p className="text-text-secondary text-sm mb-4">{description}</p>
        
        <ul className="text-xs text-text-secondary space-y-1 mb-6">
          {features.map((feature, index) => (
            <li key={index}>• {feature}</li>
          ))}
        </ul>
        
        <div className="space-y-3">
          <p className="text-xs text-text-secondary text-center">
            Available in package subscriptions
          </p>
          <Link href="/pricing">
            <Button 
              className="w-full bg-accent hover:bg-accent-2 text-white" 
              data-testid={`button-view-packages-${name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              View Packages
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
