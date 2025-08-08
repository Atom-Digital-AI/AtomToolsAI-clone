import { useState } from "react";
import Section from "@/components/ui/section";
import PricingCard from "@/components/ui/pricing-card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const pricingPlans = [
  {
    title: "Free",
    price: "£0",
    period: "/month",
    description: "Perfect to get started",
    features: [
      "Up to 10 queries per month",
      "Basic connectors",
      "Community support",
    ],
    buttonText: "Start for free",
    buttonVariant: "outline" as const,
  },
  {
    title: "Pro",
    price: "£29",
    period: "/month",
    description: "For growing teams",
    features: [
      "Up to 1,000 queries per month",
      "All connectors & generators",
      "Priority email support",
      "Custom branding",
    ],
    buttonText: "Start for free",
    popular: true,
  },
  {
    title: "Team",
    price: "£99",
    period: "/month",
    description: "For agencies & enterprises",
    features: [
      "Unlimited queries",
      "Team collaboration",
      "API access",
      "Phone support",
    ],
    buttonText: "Contact sales",
    buttonVariant: "outline" as const,
  },
];

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

  const getAdjustedPrice = (price: string) => {
    if (billingPeriod === "annual" && price !== "£0") {
      const numPrice = parseInt(price.replace("£", ""));
      const annualPrice = Math.round(numPrice * 12 * 0.8); // 20% discount
      return `£${annualPrice}`;
    }
    return price;
  };

  const getPeriod = () => {
    return billingPeriod === "annual" ? "/year" : "/month";
  };

  return (
    <Section>
      <div className="text-center mb-12">
        <h1 className="font-display text-3xl lg:text-4xl font-bold mb-4 text-text-primary">
          Simple, per-tool pricing
        </h1>
        <p className="text-xl text-text-secondary mb-8">
          Start free, upgrade when you need more. Cancel anytime.
        </p>
        
        {/* Monthly/Annual Toggle */}
        <div className="inline-flex bg-surface-2 rounded-2xl p-1 mb-8">
          <Button
            variant={billingPeriod === "monthly" ? "default" : "ghost"}
            onClick={() => setBillingPeriod("monthly")}
            className={`px-6 py-3 rounded-xl font-medium transition-colors ${
              billingPeriod === "monthly"
                ? "bg-accent text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
            data-testid="billing-monthly"
          >
            Monthly
          </Button>
          <Button
            variant={billingPeriod === "annual" ? "default" : "ghost"}
            onClick={() => setBillingPeriod("annual")}
            className={`px-6 py-3 rounded-xl font-medium transition-colors ${
              billingPeriod === "annual"
                ? "bg-accent text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
            data-testid="billing-annual"
          >
            Annual <span className="text-success text-sm ml-1">(20% off)</span>
          </Button>
        </div>
      </div>
      
      {/* Pricing Grid */}
      <div className="grid lg:grid-cols-3 gap-8 mb-12">
        {pricingPlans.map((plan, index) => (
          <PricingCard
            key={index}
            {...plan}
            price={getAdjustedPrice(plan.price)}
            period={getPeriod()}
          />
        ))}
      </div>
      
      {/* Pricing FAQ */}
      <div className="max-w-2xl mx-auto">
        <h2 className="font-display text-2xl font-semibold text-center mb-8 text-text-primary">
          Frequently asked questions
        </h2>
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-surface border border-border rounded-xl px-6 data-[state=open]:border-accent/50"
            >
              <AccordionTrigger className="text-left font-medium text-text-primary hover:text-accent [&[data-state=open]]:text-accent">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-text-secondary pt-2">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>
  );
}
