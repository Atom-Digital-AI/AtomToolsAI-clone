import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Section from "@/components/ui/section";
import PricingCard from "@/components/ui/pricing-card";
import { ArrowRight, Check } from "lucide-react";

const features = [
  "Complete step-by-step guide with screenshots",
  "Full source code and configuration files",
  "No monthly subscriptions or recurring fees",
  "No data storage costs or management required",
  "Full control over your data integration",
  "Works without relying on third-party middleware",
];

const steps = [
  {
    number: "01",
    title: "Purchase & Download",
    description: "Get instant access to the complete guide and source code files.",
    icon: "fas fa-download",
  },
  {
    number: "02", 
    title: "Follow the Guide",
    description: "Step-by-step instructions with screenshots to build your connector.",
    icon: "fas fa-book",
  },
  {
    number: "03",
    title: "Deploy & Connect",
    description: "Deploy your custom connector and connect it to Looker Studio.",
    icon: "fas fa-rocket",
  },
];

const pricingPlans = [
  {
    title: "Facebook Ads Connector Guide",
    price: "£499",
    period: "one-time",
    description: "Complete DIY guide with source code",
    features: [
      "Complete step-by-step guide",
      "Full source code included",
      "No monthly subscriptions",
      "No data storage costs",
      "Full control over integration",
      "Priority email support",
    ],
    buttonText: "Buy guide now",
    popular: true,
  },
];

const faqs = [
  {
    question: "What exactly do I get for £499?",
    answer: "You get a complete step-by-step guide with screenshots, full source code, configuration files, and detailed instructions to build your own Facebook Ads connector for Looker Studio.",
  },
  {
    question: "Why build it myself instead of using a service?", 
    answer: "Building it yourself means no monthly subscriptions, no data storage costs, and full control over your integration. You're not dependent on third-party services or middleware.",
  },
  {
    question: "Do I need technical skills to follow the guide?",
    answer: "The guide is designed to be beginner-friendly with detailed step-by-step instructions and screenshots. Basic familiarity with APIs and Google Cloud Platform is helpful but not required.",
  },
  {
    question: "What if I need help implementing the guide?",
    answer: "The guide includes priority email support. If you get stuck, we'll help you through any issues you encounter during implementation.",
  },
  {
    question: "Will this work with multiple Facebook Ads accounts?",
    answer: "Yes, the connector you build will support multiple Facebook Ads accounts and all standard metrics including impressions, clicks, CTR, CPC, conversions, and ROAS.",
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
              <Badge className="bg-secondary/10 text-secondary">£499</Badge>
            </div>
            
            <h1 className="font-display text-3xl lg:text-4xl font-bold mb-4 text-text-primary">
              Facebook Ads Looker Studio Connector Guide
            </h1>
            <p className="text-xl text-text-secondary mb-6">
              Complete guide to building your own Facebook Ads connector. No monthly fees, full control over your data.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Button className="bg-accent hover:bg-accent-2 text-white px-8 py-3 rounded-xl" data-testid="button-buy-guide">
                Buy guide - £499
              </Button>
              <Link href="/contact" data-testid="button-learn-more">
                <Button variant="outline" className="border-border hover:border-accent text-text-primary px-8 py-3 rounded-xl">
                  Learn more
                </Button>
              </Link>
            </div>
            
            <p className="text-sm text-text-secondary">One-time payment, full ownership</p>
          </div>
          
          {/* Benefits Card */}
          <Card className="bg-surface border-border rounded-2xl">
            <CardContent className="p-6">
              <div className="space-y-6">
                <h3 className="font-medium text-text-primary text-xl mb-4">Why build your own?</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
                      <i className="fas fa-pound-sign text-success text-sm"></i>
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">One-time fee</p>
                      <p className="text-sm text-text-secondary">No expensive monthly subscriptions</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                      <i className="fas fa-database text-accent text-sm"></i>
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">No data storage costs</p>
                      <p className="text-sm text-text-secondary">Direct connection, no middleware</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <i className="fas fa-shield-alt text-blue-400 text-sm"></i>
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">Full control</p>
                      <p className="text-sm text-text-secondary">No reliance on black box services</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>
      
      {/* What you get */}
      <Section className="bg-surface">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl font-bold mb-4 text-text-primary">What you get</h2>
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
