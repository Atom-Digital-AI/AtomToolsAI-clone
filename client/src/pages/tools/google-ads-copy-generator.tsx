import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Section from "@/components/ui/section";
import PricingCard from "@/components/ui/pricing-card";
import { ArrowRight, Check, Sparkles } from "lucide-react";

const features = [
  "AI-generated headlines and descriptions",
  "Keyword-optimised copy variations",
  "Brand voice and tone customisation",
  "A/B testing recommendations",
  "Direct export to Google Ads Editor",
  "Performance prediction scoring",
];

const steps = [
  {
    number: "01",
    title: "Enter Your Product",
    description: "Add your product details, target keywords, and key selling points.",
    icon: "fas fa-edit",
  },
  {
    number: "02",
    title: "Set Brand Guidelines",
    description: "Define your brand voice, tone, and any specific messaging requirements.",
    icon: "fas fa-palette",
  },
  {
    number: "03",
    title: "Generate & Export",
    description: "Get multiple ad variations and export directly to Google Ads Editor.",
    icon: "fab fa-google",
  },
];

const pricingPlans = [
  {
    title: "Free",
    price: "£0",
    period: "/month",
    description: "Perfect for testing",
    features: [
      "Up to 5 ad sets per month",
      "Basic headline & description variants",
      "Standard export formats",
      "Community support",
    ],
    buttonText: "Start for free",
    buttonVariant: "outline" as const,
  },
  {
    title: "Pro",
    price: "£39",
    period: "/month",
    description: "For serious advertisers",
    features: [
      "Unlimited ad generation",
      "Advanced brand voice training",
      "A/B testing recommendations", 
      "Performance predictions",
      "Google Ads Editor integration",
      "Priority support",
    ],
    buttonText: "Start for free",
    popular: true,
  },
];

const faqs = [
  {
    question: "How does the AI generate ad copy?",
    answer: "Our AI uses advanced language models trained on high-performing ad copy. It considers your keywords, brand voice, and Google Ads best practices to generate compelling headlines and descriptions.",
  },
  {
    question: "Can I customise the brand voice?",
    answer: "Yes! You can set tone (professional, casual, urgent), style preferences, and even upload existing ad copy for the AI to learn your specific brand voice.",
  },
  {
    question: "How many ad variations do I get?",
    answer: "Free accounts get 3-5 variations per generation. Pro accounts get 10+ variations with different approaches and styles for comprehensive A/B testing.",
  },
  {
    question: "Does this integrate with Google Ads?",
    answer: "Yes, Pro accounts can export directly to Google Ads Editor format. We also provide CSV exports that work with Google Ads bulk upload tools.",
  },
];

export default function GoogleAdsTool() {
  return (
    <>
      {/* Tool Header */}
      <Section>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center">
                <i className="fab fa-google text-red-400 text-2xl"></i>
              </div>
              <Badge className="bg-accent/10 text-accent">New</Badge>
            </div>
            
            <h1 className="font-display text-3xl lg:text-4xl font-bold mb-4 text-text-primary">
              Google Ads Copy Generator
            </h1>
            <p className="text-xl text-text-secondary mb-6">
              High-performing headlines & descriptions in seconds. AI-powered copy that converts.
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
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span className="text-sm text-text-secondary">AI Generation Complete</span>
                </div>
                
                <div className="bg-background rounded-xl p-4">
                  <h3 className="font-medium text-text-primary mb-3">Generated Ad Copy</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-surface-2 rounded-lg">
                      <div className="text-xs text-accent mb-1">Headline 1</div>
                      <div className="text-sm text-text-primary">Transform Your Marketing with AI Tools</div>
                    </div>
                    <div className="p-3 bg-surface-2 rounded-lg">
                      <div className="text-xs text-accent mb-1">Headline 2</div>
                      <div className="text-sm text-text-primary">Automate Campaigns, Scale Results</div>
                    </div>
                    <div className="p-3 bg-surface-2 rounded-lg">
                      <div className="text-xs text-accent mb-1">Description</div>
                      <div className="text-sm text-text-secondary">Save 10+ hours per week with AI-powered marketing automation. Start free, upgrade when ready. Join 1000+ marketers scaling faster.</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-success">Performance Score: 89/100</div>
                  <Button size="sm" className="bg-accent text-white">
                    Export to Google Ads
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
          <p className="text-xl text-text-secondary">From product details to winning ad copy</p>
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
