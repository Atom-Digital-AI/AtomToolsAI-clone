import { Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import CookieBanner from "@/components/layout/cookie-banner";

import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Home from "@/pages/home";
import ToolsIndex from "@/pages/tools/index";
import FacebookAdsTool from "@/pages/tools/facebook-ads-looker-studio-connector";
import SeoMetaTool from "@/pages/tools/seo-meta-generator";
import GoogleAdsTool from "@/pages/tools/google-ads-copy-generator";
import Resources from "@/pages/resources";
import Pricing from "@/pages/pricing";
import Contact from "@/pages/contact";
import SignUp from "@/pages/sign-up";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import Cookies from "@/pages/cookies";
import LogoShowcase from "@/pages/logo-showcase";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not authenticated, show landing page and public pages
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/pricing" component={Pricing} />
          <Route path="/contact" component={Contact} />
          <Route path="/terms" component={Terms} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/cookies" component={Cookies} />
          <Route component={Landing} />
        </Switch>
        <CookieBanner />
      </div>
    );
  }

  // If authenticated, show full app
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/home" component={Home} />
          <Route path="/tools" component={ToolsIndex} />
          <Route path="/tools/facebook-ads-looker-studio-connector" component={FacebookAdsTool} />
          <Route path="/tools/seo-meta-generator" component={SeoMetaTool} />
          <Route path="/tools/google-ads-copy-generator" component={GoogleAdsTool} />
          <Route path="/resources" component={Resources} />
          <Route path="/pricing" component={Pricing} />
          <Route path="/contact" component={Contact} />
          <Route path="/sign-up" component={SignUp} />
          <Route path="/terms" component={Terms} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/cookies" component={Cookies} />
          <Route path="/logo" component={LogoShowcase} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
      <CookieBanner />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}
