import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Section from "@/components/ui/section";
import { Check, ArrowRight, Rocket, Cog, Star, Plug, Bolt, Shield, ChartBar } from "lucide-react";

const trustIndicators = [
  { icon: Rocket, text: "Build and launch campaigns faster" },
  { icon: Cog, text: "Reduce manual ops" },
  { icon: Star, text: "Standardise quality" },
];

const features = [
  {
    icon: Plug,
    title: "Plug-and-play tools",
    description: "Install and use in minutes. No complex setup or technical knowledge required.",
  },
  {
    icon: Bolt,
    title: "Built for speed",
    description: "Opinionated defaults, undo/redo, smart presets. Get results faster than ever.",
  },
  {
    icon: Shield,
    title: "Data-safe by design",
    description: "Clear privacy, export controls. Your data stays yours, always.",
  },
];

const stackFeatures = [
  {
    title: "Connectors",
    description: "Facebook Ads, Looker Studio integration",
  },
  {
    title: "Generators",
    description: "AI-powered ad copy, SEO meta tags, content creation",
  },
  {
    title: "Reporting helpers",
    description: "Automated dashboards, custom metrics, scheduled reports",
  },
  {
    title: "Flexible pricing",
    description: "Free to start, upgrade per tool as you grow",
  },
];

const tools = [
  {
    title: "Facebook Ads Looker Studio Connector Guide",
    description: "Complete guide to building your own Facebook Ads connector. No monthly fees or data storage costs.",
    icon: "fab fa-facebook-f",
    iconColor: "bg-blue-500/10 text-blue-400",
    badge: { text: "Pay once, own forever", color: "success" },
    features: [
      "Step-by-step instructions",
      "Complete source code included",
      "Full control & oversight",
    ],
    href: "/tools/facebook-ads-looker-studio-connector",
  },
  {
    title: "SEO Meta Generator",
    description: "Generate clean, on-brand titles & metas at scale.",
    icon: "fas fa-search",
    iconColor: "bg-green-500/10 text-green-400",
    badge: { text: "Pro", color: "warning" },
    features: [
      "Upload CSV or enter URLs",
      "Pick tone and style",
      "AI generates, you review",
    ],
    href: "/tools/seo-meta-generator",
  },
  {
    title: "Google Ads Copy Generator",
    description: "High-performing headlines & descriptions in seconds.",
    icon: "fab fa-google",
    iconColor: "bg-red-500/10 text-red-400",
    badge: { text: "New", color: "accent" },
    features: [
      "Enter product/keywords",
      "Set brand guidelines",
      "Export to Google Ads",
    ],
    href: "/tools/google-ads-copy-generator",
  },
];

export default function Home() {
  const getBadgeColors = (color: string) => {
    const colors = {
      success: "bg-success/10 text-success",
      warning: "bg-warning/10 text-warning",
      accent: "bg-accent/10 text-accent",
    };
    return colors[color as keyof typeof colors] || colors.success;
  };

  return (
    <div id="main">
      {/* Hero Section */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-accent-2/10 rounded-full blur-2xl"></div>
        </div>
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div className="max-w-2xl animate-slide-up">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary mb-6 leading-tight">
                Automate your marketing. 
                <span className="text-accent"> Scale without hiring.</span>
              </h1>
              <p className="text-xl text-text-secondary mb-8 leading-relaxed">
                atomtools.ai gives marketers and agencies the tools to create, launch and report faster - with AI-powered generators and zero-friction workflows.
              </p>
              
              {/* Trust indicators */}
              <div className="flex flex-wrap gap-6 mb-8 text-sm text-text-secondary">
                {trustIndicators.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-accent" />
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
              
              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/sign-up">
                  <Button 
                    size="lg"
                    className="bg-accent hover:bg-accent-2 text-white px-8 py-4 rounded-2xl font-semibold text-center w-full sm:w-auto"
                    data-testid="hero-signup-button"
                  >
                    Start for free - no credit card
                  </Button>
                </Link>
                <Link href="/tools">
                  <Button 
                    variant="outline"
                    size="lg" 
                    className="border-border hover:border-accent text-text-primary px-8 py-4 rounded-2xl font-semibold text-center w-full sm:w-auto"
                    data-testid="hero-tools-button"
                  >
                    View tools
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Hero Visual */}
            <div className="relative animate-fade-in">
              <Card className="bg-surface border-border shadow-2xl">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Tool grid mockup */}
                    <div className="bg-surface-2 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-accent rounded-full"></div>
                        <span className="text-xs text-text-secondary">Tools Dashboard</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-background rounded-lg p-3">
                          <i className="fab fa-facebook text-accent mb-1"></i>
                          <div className="text-xs text-text-primary">Facebook Ads</div>
                        </div>
                        <div className="bg-background rounded-lg p-3">
                          <i className="fas fa-search text-accent mb-1"></i>
                          <div className="text-xs text-text-primary">SEO Meta</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Generator form mockup */}
                    <div className="bg-surface-2 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-success rounded-full"></div>
                        <span className="text-xs text-text-secondary">AI Generator</span>
                      </div>
                      <div className="space-y-2">
                        <div className="bg-background rounded h-3"></div>
                        <div className="bg-background rounded h-3 w-3/4"></div>
                        <div className="bg-accent/20 rounded h-6 flex items-center px-2">
                          <span className="text-xs text-accent">Generate</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
      
      {/* Feature Row 1 */}
      <Section>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-surface border-border hover:border-accent/50 transition-colors">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-4 text-text-primary">
                  {feature.title}
                </h3>
                <p className="text-text-secondary">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>
      
      {/* Feature Row 2 */}
      <Section className="bg-surface">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display text-3xl lg:text-4xl font-bold mb-6 text-text-primary">
              Your stack, your way.
            </h2>
            <ul className="space-y-4">
              {stackFeatures.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <strong className="text-text-primary">{feature.title}</strong>
                    <p className="text-text-secondary">{feature.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          
          <Card className="bg-background border-border">
            <CardContent className="p-8">
              <div className="text-center">
                <h3 className="font-display text-lg font-semibold mb-6 text-text-primary">
                  Seamless Integration
                </h3>
                <div className="flex justify-center items-center gap-4 flex-wrap">
                  <div className="w-12 h-12 bg-surface-2 rounded-xl flex items-center justify-center">
                    <i className="fab fa-facebook-f text-accent"></i>
                  </div>
                  <ArrowRight className="h-4 w-4 text-text-secondary" />
                  <div className="w-12 h-12 bg-surface-2 rounded-xl flex items-center justify-center">
                    <i className="fas fa-atom text-accent"></i>
                  </div>
                  <ArrowRight className="h-4 w-4 text-text-secondary" />
                  <div className="w-12 h-12 bg-surface-2 rounded-xl flex items-center justify-center">
                    <ChartBar className="h-5 w-5 text-accent" />
                  </div>
                </div>
                <p className="text-text-secondary text-sm mt-4">
                  Connect, automate, report - all in one place
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>
      
      {/* Tools Section */}
      <Section id="tools">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl lg:text-4xl font-bold mb-4 text-text-primary">
            Choose a tool to start fast
          </h2>
          <p className="text-xl text-text-secondary mb-8">
            Upgrade when you're ready. No long-term commitments.
          </p>
        </div>
        
        {/* Tool Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {tools.map((tool, index) => (
            <Card key={index} className="bg-surface border-border hover:border-accent/50 transition-all group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 ${tool.iconColor} rounded-xl flex items-center justify-center`}>
                    <i className={`${tool.icon} text-xl`}></i>
                  </div>
                  <Badge className={getBadgeColors(tool.badge.color)}>
                    {tool.badge.text}
                  </Badge>
                </div>
                <h3 className="font-display text-lg font-semibold mb-2 text-text-primary">
                  {tool.title}
                </h3>
                <p className="text-text-secondary text-sm mb-4">{tool.description}</p>
                <ul className="text-xs text-text-secondary space-y-1 mb-6">
                  {tool.features.map((feature, featureIndex) => (
                    <li key={featureIndex}>• {feature}</li>
                  ))}
                </ul>
                <Link href={tool.href}>
                  <Button 
                    className="w-full bg-accent hover:bg-accent-2 text-white" 
                    data-testid={`tool-card-${index}`}
                  >
                    Start for free
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>
      
      {/* Pricing Teaser */}
      <Section className="bg-surface">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl font-bold mb-4 text-text-primary">
            Only pay for what you use
          </h2>
          <p className="text-xl text-text-secondary mb-8">
            Flexible plans per tool. Start free, upgrade when ready.
          </p>
          <Link href="/pricing">
            <Button 
              size="lg"
              className="bg-accent hover:bg-accent-2 text-white px-8 py-4 rounded-2xl font-semibold"
              data-testid="pricing-teaser-button"
            >
              View pricing
            </Button>
          </Link>
        </div>
      </Section>
      
      {/* Final CTA */}
      <Section>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl lg:text-4xl font-bold mb-6 text-text-primary">
            Ready to automate more, do less?
          </h2>
          <p className="text-xl text-text-secondary mb-8">
            Join thousands of marketers who've streamlined their workflows with atomtools.ai
          </p>
          <Link href="/sign-up">
            <Button 
              size="lg"
              className="bg-accent hover:bg-accent-2 text-white px-8 py-4 rounded-2xl font-semibold"
              data-testid="final-cta-button"
            >
              Start for free
            </Button>
          </Link>
        </div>
      </Section>
    </div>
  );
}
