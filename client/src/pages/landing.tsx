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
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
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