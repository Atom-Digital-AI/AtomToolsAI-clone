import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PricingCardProps {
  title: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  buttonVariant?: "default" | "outline";
  popular?: boolean;
}

export default function PricingCard({
  title,
  price,
  period,
  description,
  features,
  buttonText,
  buttonVariant = "default",
  popular = false,
}: PricingCardProps) {
  return (
    <Card className={cn(
      "bg-surface border-border relative",
      popular && "border-accent"
    )}>
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-white px-4 py-1 rounded-full text-sm font-medium">
          Most popular
        </div>
      )}
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <h3 className="font-display text-xl font-semibold mb-2 text-text-primary">{title}</h3>
          <div className="text-3xl font-bold mb-2 text-text-primary">
            {price}
            <span className="text-lg text-text-secondary font-normal">{period}</span>
          </div>
          <p className="text-text-secondary">{description}</p>
        </div>
        
        <ul className="space-y-3 mb-8">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-3">
              <Check className="h-4 w-4 text-success flex-shrink-0" />
              <span className="text-sm text-text-primary">{feature}</span>
            </li>
          ))}
        </ul>
        
        <Button
          className={cn(
            "w-full",
            buttonVariant === "outline" 
              ? "border-border hover:border-accent text-text-primary bg-transparent" 
              : "bg-accent hover:bg-accent-2 text-white"
          )}
          variant={buttonVariant}
          data-testid={`button-pricing-${title.toLowerCase()}`}
        >
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );
}
