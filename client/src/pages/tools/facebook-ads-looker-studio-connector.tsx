import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Section from "@/components/ui/section";
import PricingCard from "@/components/ui/pricing-card";
import { ArrowRight, Check } from "lucide-react";

const features = [
  "Complete step-by-step guide with videos",
  "Full source code and configuration files",
  "No monthly subscriptions or recurring fees",
  "No data storage costs or management required",
  "Full control over your data integration",
  "Works without relying on middle men",
];

const steps = [
  {
    number: "01",
    title: "Log in to Facebook and Google",
    description: "Download the main code file and configuration JSON to get started.",
    icon: "fas fa-sign-in-alt",
    hasDownloads: true,
    downloads: [
      { name: "Main Code File", filename: "facebook-ads-connector.js" },
      { name: "Configuration JSON", filename: "config.json" }
    ]
  },
  {
    number: "02", 
    title: "Create Facebook App",
    description: "Set up your Facebook App to access the Ads API with step-by-step video guidance.",
    icon: "fab fa-facebook-f",
    hasVideo: true
  },
  {
    number: "03",
    title: "Set up Google Cloud",
    description: "Configure your Google Cloud project and enable necessary APIs.",
    icon: "fab fa-google",
    hasVideo: true
  },
  {
    number: "04",
    title: "Set up Google App Script", 
    description: "Deploy your connector code using Google Apps Script platform.",
    icon: "fas fa-code",
    hasVideo: true
  },
  {
    number: "05",
    title: "Add Connector to Looker Studio",
    description: "Connect your custom data source to Looker Studio and start reporting.",
    icon: "fas fa-chart-bar",
    hasVideo: true
  },
];

const pricingPlans = [
  {
    title: "Facebook Ads Connector Guide",
    price: "£499",
    period: "one-time",
    description: "Complete DIY guide with source code",
    features: [
      "Complete step-by-step guide with videos",
      "Full source code included",
      "Unlimited uses - build as many as you want",
      "No monthly subscriptions",
      "No data storage costs",
      "30 days priority email support",
    ],
    buttonText: "Buy guide now",
    popular: true,
  },
];

const faqs = [
  {
    question: "What exactly do I get for £499?",
    answer: "You get a complete step-by-step guide with videos, full source code, configuration files, and detailed instructions to build your own Facebook Ads connector for Looker Studio.",
  },
  {
    question: "Why build it myself instead of using a service?", 
    answer: "Building it yourself means no monthly subscriptions, no data storage costs, and full control over your integration. You're not dependent on third-party services or middle men.",
  },
  {
    question: "Do I need technical skills to follow the guide?",
    answer: "The guide is designed to be beginner-friendly with detailed step-by-step instructions and videos. No technical background required.",
  },
  {
    question: "What if I need help implementing the guide?",
    answer: "The guide includes 30 days of priority email support after purchase. If you get stuck, we'll help you through any issues you encounter during implementation.",
  },
  {
    question: "Will this work with multiple Facebook Ads accounts?",
    answer: "Each connector works with one Facebook Ads account, but you can build unlimited connectors - one for each ad account you want to connect. The guide shows you how to build as many as you need.",
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
            
            <p className="text-sm text-text-secondary">One-time payment, unlimited uses</p>
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
                      <p className="text-sm text-text-secondary">No reliance on middle men</p>
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
      
      {/* Implementation Guide */}
      <Section>
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl font-bold mb-4 text-text-primary">Implementation Guide</h2>
          <p className="text-xl text-text-secondary">Follow these 5 steps to build your connector</p>
        </div>
        
        <div className="max-w-4xl mx-auto space-y-8">
          {steps.map((step, index) => (
            <Card key={index} className="bg-surface border-border">
              <CardContent className="p-8">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Step Icon and Number */}
                  <div className="flex items-center gap-4 lg:flex-col lg:items-center lg:gap-2">
                    <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center">
                      <i className={`${step.icon} text-accent text-xl`}></i>
                    </div>
                    <div className="text-2xl font-bold text-accent lg:text-center">{step.number}</div>
                  </div>
                  
                  {/* Step Content */}
                  <div className="flex-1">
                    <h3 className="font-display text-xl font-semibold mb-3 text-text-primary">
                      {step.title}
                    </h3>
                    <p className="text-text-secondary mb-6">{step.description}</p>
                    
                    {/* Downloads Section */}
                    {step.hasDownloads && (
                      <div className="mb-6">
                        <h4 className="font-medium text-text-primary mb-3">Download Files:</h4>
                        <div className="flex flex-col sm:flex-row gap-3">
                          {step.downloads?.map((download, downloadIndex) => (
                            <Button
                              key={downloadIndex}
                              variant="outline"
                              className="border-accent text-accent hover:bg-accent hover:text-white"
                              data-testid={`download-${download.filename}`}
                            >
                              <i className="fas fa-download mr-2"></i>
                              {download.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Video Section */}
                    {step.hasVideo && (
                      <div className="bg-background rounded-xl p-6 border border-border">
                        <div className="aspect-video bg-surface-2 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                              <i className="fas fa-play text-accent text-xl"></i>
                            </div>
                            <p className="text-text-secondary text-sm">
                              Video guide coming soon
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>
      
      {/* Pricing */}
      <Section className="bg-surface">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl font-bold mb-4 text-text-primary">Pricing</h2>
          <p className="text-xl text-text-secondary">Pay once, unlimited uses</p>
        </div>
        
        <div className="flex justify-center">
          <div className="max-w-md">
            {pricingPlans.map((plan, index) => (
              <PricingCard key={index} {...plan} />
            ))}
          </div>
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
