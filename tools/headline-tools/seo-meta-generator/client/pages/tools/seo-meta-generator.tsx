import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Section from "@/components/ui/section";
import PricingCard from "@/components/ui/pricing-card";
import { ArrowRight, Check, Upload } from "lucide-react";

const features = [
  "Upload CSV files or enter URLs manually",
  "AI-powered title and meta description generation",
  "Customisable tone and brand voice",
  "Bulk processing for hundreds of pages",
  "Export to CSV or copy individual results",
  "SEO best practices built-in",
];

const steps = [
  {
    number: "01",
    title: "Upload Your Data",
    description: "Import a CSV with URLs or paste them directly into the tool.",
    icon: "fas fa-upload",
  },
  {
    number: "02",
    title: "Set Your Preferences",
    description: "Choose tone, style, and any brand guidelines for consistent output.",
    icon: "fas fa-sliders-h",
  },
  {
    number: "03",
    title: "Generate & Export",
    description: "AI creates optimised meta tags. Review, edit, and export your results.",
    icon: "fas fa-download",
  },
];

const pricingPlans = [
  {
    title: "Free",
    price: "£0",
    period: "/month",
    description: "Perfect for small projects",
    features: [
      "Up to 10 pages per month",
      "Basic tone options",
      "CSV export",
      "Community support",
    ],
    buttonText: "Start for free",
    buttonVariant: "outline" as const,
  },
  {
    title: "Pro",
    price: "£29",
    period: "/month", 
    description: "For SEO professionals",
    features: [
      "Up to 1,000 pages per month",
      "Advanced tone & style options",
      "Custom brand voice training",
      "Priority email support",
      "API access",
    ],
    buttonText: "Start for free",
    popular: true,
  },
];

const faqs = [
  {
    question: "What file formats do you support?",
    answer: "We support CSV files with URLs, page titles, and optional descriptions. You can also paste URLs directly into the tool for smaller batches.",
  },
  {
    question: "How does the AI generate meta tags?",
    answer: "Our AI analyses your page content, considers SEO best practices, and generates titles and descriptions that match your specified tone and brand voice.",
  },
  {
    question: "Can I customise the tone and style?",
    answer: "Yes! Choose from professional, casual, technical, or creative tones. Pro users can upload brand guidelines for consistent voice across all content.",
  },
  {
    question: "Are the generated meta tags SEO-optimised?",
    answer: "Absolutely. We follow Google's guidelines for title lengths (50-60 characters) and meta descriptions (150-160 characters) while ensuring readability and click-worthiness.",
  },
];

export default function SeoMetaTool() {
  return (
    <>
      {/* Tool Header */}
      <Section>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center">
                <i className="fas fa-search text-green-400 text-2xl"></i>
              </div>
              <Badge className="bg-warning/10 text-warning">Pro</Badge>
            </div>
            
            <h1 className="font-display text-3xl lg:text-4xl font-bold mb-4 text-text-primary">
              SEO Meta Generator
            </h1>
            <p className="text-xl text-text-secondary mb-6">
              Generate clean, on-brand titles & meta descriptions at scale. Save hours of manual SEO work.
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
                  <Upload className="h-4 w-4 text-accent" />
                  <span className="text-sm text-text-secondary">CSV Upload</span>
                </div>
                
                <div className="bg-background rounded-xl p-4">
                  <h3 className="font-medium text-text-primary mb-3">Generated Meta Tags</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-surface-2 rounded-lg">
                      <div className="text-xs text-accent mb-1">Title (52 chars)</div>
                      <div className="text-sm text-text-primary">Best Marketing Tools for Small Business Growth</div>
                    </div>
                    <div className="p-3 bg-surface-2 rounded-lg">
                      <div className="text-xs text-accent mb-1">Description (156 chars)</div>
                      <div className="text-sm text-text-secondary">Discover powerful marketing automation tools that help small businesses scale faster. Get started today.</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button size="sm" className="bg-success text-white">
                    <Check className="h-3 w-3 mr-1" />
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" className="border-border">
                    Edit
                  </Button>
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
          <p className="text-xl text-text-secondary">From URLs to optimised meta tags in minutes</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="text-center relative">
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
          <p className="text-xl text-text-secondary">Start free, upgrade when you need more</p>
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
