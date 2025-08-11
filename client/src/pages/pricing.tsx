import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Section from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Loader2 } from "lucide-react";
import type { PackageWithTiers } from "@shared/schema";

// Helper function to format pricing
const formatPrice = (amountMinor: number, currency: string = 'GBP') => {
  const amount = amountMinor / 100;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
};

// Helper to get tier features based on limits and subfeatures
const getTierFeatures = (tier: any, products: any[]) => {
  const features: string[] = [];
  
  tier.limits.forEach((limit: any) => {
    const product = products.find(p => p.id === limit.productId);
    if (product && limit.includedInTier) {
      const quantity = limit.quantity ? `${limit.quantity} ${product.name} uses` : `Unlimited ${product.name}`;
      features.push(`${quantity}/${limit.periodicity}`);
      
      // Add subfeature details
      if (limit.subfeatures) {
        Object.entries(limit.subfeatures as Record<string, boolean>).forEach(([feature, enabled]) => {
          if (enabled) {
            features.push(`${feature.replace('_', ' ')} enabled`);
          }
        });
      }
    }
  });
  
  return features;
};

const faqs = [
  {
    question: "Can I change plans anytime?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.",
  },
  {
    question: "What happens to my data if I cancel?",
    answer: "Your data remains accessible for 30 days after cancellation. You can export everything at any time.",
  },
  {
    question: "Do you offer refunds?",
    answer: "We offer a 14-day money-back guarantee on all paid plans, no questions asked.",
  },
  {
    question: "How does billing work?",
    answer: "You're billed monthly or annually depending on your chosen plan. All prices are in GBP and exclude VAT where applicable.",
  },
  {
    question: "Can I use multiple tools on one plan?",
    answer: "Yes! Your plan covers access to all available tools within your usage limits.",
  },
];

export default function Pricing() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  
  const { data: packages, isLoading } = useQuery<PackageWithTiers[]>({
    queryKey: ["/api/packages"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-6">
              Simple, transparent pricing
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Choose the plan that works best for you. All plans include our core features with different usage limits.
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex justify-center mb-12">
            <div className="bg-gray-900 rounded-lg p-1 inline-flex">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingPeriod === "monthly"
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
                data-testid="button-monthly-billing"
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("annual")}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingPeriod === "annual"
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
                data-testid="button-annual-billing"
              >
                Annual
                <span className="ml-2 text-green-400 text-xs">Save 20%</span>
              </button>
            </div>
          </div>

          {/* Dynamic Package Pricing */}
          {packages && packages.length > 0 ? (
            <div className="space-y-16">
              {packages.map((packageData) => (
                <div key={packageData.id} className="max-w-7xl mx-auto">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                      {packageData.name}
                    </h2>
                    <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                      {packageData.description}
                    </p>
                    <Badge variant="outline" className="mt-4">
                      {packageData.category}
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {packageData.tiers
                      .filter(tier => tier.isActive)
                      .map((tier) => {
                        const relevantPrice = tier.prices.find(price => 
                          price.interval === (billingPeriod === "monthly" ? "month" : "year")
                        ) || tier.prices[0];
                        
                        const features = getTierFeatures(tier, packageData.products);
                        const isPopular = tier.promotionalTag?.toLowerCase().includes('popular');
                        
                        return (
                          <div
                            key={tier.id}
                            className={`relative bg-gray-900 rounded-2xl p-8 ${
                              isPopular ? 'ring-2 ring-indigo-600 scale-105' : ''
                            }`}
                          >
                            {tier.promotionalTag && (
                              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                <Badge className="bg-indigo-600 text-white px-4 py-1">
                                  {tier.promotionalTag}
                                </Badge>
                              </div>
                            )}
                            
                            <div className="text-center mb-8">
                              <h3 className="text-2xl font-bold text-white mb-2">
                                {tier.name}
                              </h3>
                              <div className="text-4xl font-bold text-white mb-2">
                                {relevantPrice ? formatPrice(relevantPrice.amountMinor, relevantPrice.currency) : 'Free'}
                                {relevantPrice && relevantPrice.interval !== 'lifetime' && (
                                  <span className="text-lg text-gray-400">
                                    /{relevantPrice.interval}
                                  </span>
                                )}
                              </div>
                              {relevantPrice?.interval === 'lifetime' && (
                                <p className="text-sm text-gray-400">One-time payment</p>
                              )}
                            </div>

                            <div className="space-y-4 mb-8">
                              {features.map((feature, index) => (
                                <div key={index} className="flex items-start gap-3">
                                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                                  <span className="text-gray-300 capitalize">{feature}</span>
                                </div>
                              ))}
                            </div>

                            <Button 
                              className="w-full bg-indigo-600 hover:bg-indigo-700"
                              data-testid={`button-select-${tier.name.toLowerCase()}`}
                            >
                              {relevantPrice?.amountMinor === 0 ? 'Start Free' : 'Get Started'}
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-400">No pricing packages available at the moment.</p>
            </div>
          )}

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto mt-24">
            <h2 className="text-3xl font-bold text-white text-center mb-12">
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="bg-gray-900 rounded-lg border-gray-800"
                >
                  <AccordionTrigger className="px-6 py-4 text-white hover:text-indigo-400 transition-colors">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4 text-gray-400">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </Section>
    </div>
  );
}