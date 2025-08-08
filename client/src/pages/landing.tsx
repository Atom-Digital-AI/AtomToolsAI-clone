import { Button } from "@/components/ui/button";
import { ArrowRight, Atom, Zap, Target, BarChart3 } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <img src="/logo-icon.svg" alt="atomtools.ai" className="h-8 w-8" />
          <span className="text-xl font-bold">atomtools.ai</span>
        </div>
        <Button
          onClick={() => window.location.href = "/api/login"}
          className="bg-primary hover:bg-primary/90"
          data-testid="button-login"
        >
          Sign In
        </Button>
      </header>

      {/* Hero Section */}
      <section className="relative container mx-auto px-4 py-20 text-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10"></div>
          {/* Animated Particles */}
          <div className="absolute inset-0">
            {/* Large floating atoms */}
            <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-primary/20 rounded-full animate-float-large">
              <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-primary/40 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
              <div className="absolute top-2 left-1/2 w-2 h-2 bg-primary/60 rounded-full transform -translate-x-1/2 animate-orbit" style={{animationDelay: '0s'}}></div>
              <div className="absolute bottom-2 right-1/4 w-2 h-2 bg-primary/60 rounded-full animate-orbit" style={{animationDelay: '2s'}}></div>
              <div className="absolute top-1/2 right-2 w-2 h-2 bg-primary/60 rounded-full animate-orbit" style={{animationDelay: '4s'}}></div>
            </div>
            
            <div className="absolute top-3/4 right-1/4 w-24 h-24 border border-primary/15 rounded-full animate-float" style={{animationDelay: '1s'}}>
              <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-primary/30 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
              <div className="absolute top-1 left-1/3 w-1.5 h-1.5 bg-primary/50 rounded-full animate-orbit" style={{animationDelay: '1s'}}></div>
              <div className="absolute bottom-1 right-1/3 w-1.5 h-1.5 bg-primary/50 rounded-full animate-orbit" style={{animationDelay: '3s'}}></div>
            </div>

            <div className="absolute top-1/2 right-1/6 w-16 h-16 border border-primary/10 rounded-full animate-float" style={{animationDelay: '2s'}}>
              <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-primary/25 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
              <div className="absolute top-0 left-1/2 w-1 h-1 bg-primary/40 rounded-full transform -translate-x-1/2 animate-orbit" style={{animationDelay: '2s'}}></div>
            </div>

            {/* Connecting lines */}
            <svg className="absolute inset-0 w-full h-full opacity-20" style={{background: 'transparent'}}>
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.2"/>
                  <stop offset="50%" stopColor="currentColor" stopOpacity="0.8"/>
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.2"/>
                </linearGradient>
              </defs>
              <g className="text-primary">
                <line x1="25%" y1="25%" x2="75%" y2="75%" stroke="url(#lineGradient)" strokeWidth="1" className="animate-pulse"/>
                <line x1="75%" y1="25%" x2="25%" y2="75%" stroke="url(#lineGradient)" strokeWidth="1" className="animate-pulse" style={{animationDelay: '1s'}}/>
                <line x1="50%" y1="10%" x2="50%" y2="90%" stroke="url(#lineGradient)" strokeWidth="1" className="animate-pulse" style={{animationDelay: '2s'}}/>
              </g>
            </svg>

            {/* Floating particles */}
            <div className="absolute top-1/3 left-1/6 w-1 h-1 bg-primary/60 rounded-full animate-ping"></div>
            <div className="absolute top-2/3 right-1/5 w-1 h-1 bg-primary/60 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
            <div className="absolute top-1/6 right-1/3 w-0.5 h-0.5 bg-primary/40 rounded-full animate-ping" style={{animationDelay: '2s'}}></div>
            <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-primary/60 rounded-full animate-ping" style={{animationDelay: '3s'}}></div>
          </div>
        </div>
        
        <div className="relative max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
            Marketing Tools Built for Performance
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Connect data, generate campaigns, and automate workflows with our suite of powerful marketing tools. Free to start, pay once to own forever.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={() => window.location.href = "/api/login"}
              className="bg-primary hover:bg-primary/90 text-lg px-8 py-6"
              data-testid="button-get-started"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6"
              data-testid="button-view-tools"
            >
              View All Tools
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need to Scale Your Marketing
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Atom className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Data Connectors</h3>
              <p className="text-muted-foreground text-sm">
                Connect Facebook Ads, Google Analytics, and more to centralize your data
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">AI Generators</h3>
              <p className="text-muted-foreground text-sm">
                Generate ad copy, meta descriptions, and campaign ideas instantly
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Automation</h3>
              <p className="text-muted-foreground text-sm">
                Automate reporting, bid management, and campaign optimization
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Analytics</h3>
              <p className="text-muted-foreground text-sm">
                Track performance across channels with unified dashboards
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 border-t">
        <div className="text-center text-muted-foreground">
          <p>&copy; 2025 atomtools.ai. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}