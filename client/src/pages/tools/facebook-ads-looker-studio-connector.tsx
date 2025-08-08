import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Section from "@/components/ui/section";
import PricingCard from "@/components/ui/pricing-card";
import { ArrowRight, Check } from "lucide-react";

const features = [
  "Connect Facebook Ads account securely",
  "Select specific ad accounts and campaigns",
  "Choose metrics and dimensions",
  "Schedule automatic data refresh",
  "Real-time sync with Looker Studio",
];

const steps = [
  {
    number: "01",
    title: "Authorise Connection",
    description: "Securely connect your Facebook Ads account with one-click OAuth.",
    icon: "fab fa-facebook",
  },
  {
    number: "02", 
    title: "Configure Data",
    description: "Pick ad accounts, metrics, and refresh schedule that works for you.",
    icon: "fas fa-cog",
  },
  {
    number: "03",
    title: "Import to Looker Studio",
    description: "Use the connector in Looker Studio to build beautiful dashboards.",
    icon: "fas fa-chart-bar",
  },
];

const pricingPlans = [
  {
    title: "Facebook Ads Connector",
    price: "£29",
    period: "one-time",
    description: "Pay once, own forever",
    features: [
      "Unlimited Facebook Ads accounts",
      "All metrics & dimensions",
      "Hourly auto-refresh",
      "Priority email support",
      "Lifetime updates",
    ],
    buttonText: "Buy now",
    popular: true,
  },
];

const faqs = [
  {
    question: "How do I connect my Facebook Ads account?",
    answer: "Simply click the 'Authorise' button and log in with your Facebook credentials. We use Facebook's official OAuth flow for maximum security.",
  },
  {
    question: "Which metrics are available?", 
    answer: "We support all standard Facebook Ads metrics including impressions, clicks, CTR, CPC, conversions, ROAS, and more. Custom metrics are available on Pro plans.",
  },
  {
    question: "How often does the data refresh?",
    answer: "Free accounts can manually refresh data. Pro accounts get automatic hourly refreshes, with custom schedules available on request.",
  },
  {
    question: "Is my Facebook data secure?",
    answer: "Yes, we follow Facebook's security best practices and only access the data you explicitly authorise. We never store your credentials.",
  },
];

export default function FacebookAdsTool() {
  return (
    <>
      {/* Tool Header */}
      <Section>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                <i className="fab fa-facebook-f text-blue-400 text-2xl"></i>
              </div>
              <Badge className="bg-success/10 text-success">Free</Badge>
            </div>
            
            <h1 className="font-display text-3xl lg:text-4xl font-bold mb-4 text-text-primary">
              Facebook Ads Looker Studio Connector
            </h1>
            <p className="text-xl text-text-secondary mb-6">
              Bring Facebook Ads performance into Looker Studio in minutes. No technical setup required.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Button className="bg-accent hover:bg-accent-2 text-white px-8 py-3 rounded-xl" data-testid="button-start-free">
                Start for free
              </Button>
              <Link href="/sign-up" data-testid="button-sign-up">
                <Button variant="outline" className="border-border hover:border-accent text-text-primary px-8 py-3 rounded-xl">
                  Sign up
                </Button>
              </Link>
            </div>
            
            <p className="text-sm text-text-secondary">No credit card required</p>
          </div>
          
          {/* Tool UI Mockup */}
          <Card className="bg-surface border-border rounded-2xl">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 bg-success rounded-full"></div>
                  <span className="text-sm text-text-secondary">Connected</span>
                </div>
                
                <div className="bg-background rounded-xl p-4">
                  <h3 className="font-medium text-text-primary mb-3">Facebook Ads Account</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 px-3 bg-surface-2 rounded-lg">
                      <span className="text-sm text-text-primary">Marketing Agency Ltd</span>
                      <Check className="h-4 w-4 text-success" />
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-surface-2 rounded-lg opacity-60">
                      <span className="text-sm text-text-secondary">E-commerce Store</span>
                      <div className="w-4 h-4 border border-border rounded"></div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-accent/10 rounded-xl p-4 text-center">
                  <i className="fas fa-download text-accent mb-2"></i>
                  <p className="text-sm text-accent">Ready to import to Looker Studio</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>
      
      {/* What it does */}
      <Section className="bg-surface">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl font-bold mb-4 text-text-primary">What it does</h2>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3 p-4 bg-background rounded-xl border border-border">
              <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
              <span className="text-text-primary">{feature}</span>
            </div>
          ))}
        </div>
      </Section>
      
      {/* How it works */}
      <Section>
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl font-bold mb-4 text-text-primary">How it works</h2>
          <p className="text-xl text-text-secondary">Get set up in three simple steps</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <i className={`${step.icon} text-accent text-xl`}></i>
              </div>
              <div className="text-2xl font-bold text-accent mb-2">{step.number}</div>
              <h3 className="font-display text-xl font-semibold mb-2 text-text-primary">{step.title}</h3>
              <p className="text-text-secondary">{step.description}</p>
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-8">
                  <ArrowRight className="h-6 w-6 text-text-secondary" />
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>
      
      {/* Pricing */}
      <Section className="bg-surface">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl font-bold mb-4 text-text-primary">Pricing</h2>
          <p className="text-xl text-text-secondary">Pay once, own forever</p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <PricingCard key={index} {...plan} />
          ))}
        </div>
      </Section>
      
      {/* FAQ */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl font-bold mb-8 text-center text-text-primary">Frequently asked questions</h2>
          
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
    </>
  );
}
