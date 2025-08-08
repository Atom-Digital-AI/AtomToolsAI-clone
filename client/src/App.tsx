import { Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import CookieBanner from "@/components/layout/cookie-banner";

import Home from "@/pages/home";
import ToolsIndex from "@/pages/tools/index";
import FacebookAdsTool from "@/pages/tools/facebook-ads-looker-studio-connector";
import SeoMetaTool from "@/pages/tools/seo-meta-generator";
import GoogleAdsTool from "@/pages/tools/google-ads-copy-generator";
import Resources from "@/pages/resources";
import Pricing from "@/pages/pricing";
import Contact from "@/pages/contact";
import SignUp from "@/pages/sign-up";
import Login from "@/pages/login";
import Dashboard from "@/pages/app/dashboard";
import Account from "@/pages/app/account";
import Subscriptions from "@/pages/app/subscriptions";
import FacebookAdsConnector from "@/pages/app/tools/facebook-ads-connector";
import GoogleAdsCopyGeneratorApp from "@/pages/app/tools/google-ads-copy-generator";
import SEOMetaGeneratorApp from "@/pages/app/tools/seo-meta-generator";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import Cookies from "@/pages/cookies";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-text-primary flex flex-col">
        <Header />
        <main className="flex-1">
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/tools" component={ToolsIndex} />
            <Route path="/tools/facebook-ads-looker-studio-connector" component={FacebookAdsTool} />
            <Route path="/tools/seo-meta-generator" component={SeoMetaTool} />
            <Route path="/tools/google-ads-copy-generator" component={GoogleAdsTool} />
            <Route path="/resources" component={Resources} />
            <Route path="/pricing" component={Pricing} />
            <Route path="/contact" component={Contact} />
            <Route path="/sign-up" component={SignUp} />
            <Route path="/login" component={Login} />
            <Route path="/app" component={Dashboard} />
            <Route path="/app/account" component={Account} />
            <Route path="/app/subscriptions" component={Subscriptions} />
            <Route path="/app/tools/facebook-ads-connector" component={FacebookAdsConnector} />
            <Route path="/app/tools/google-ads-copy-generator" component={GoogleAdsCopyGeneratorApp} />
            <Route path="/app/tools/seo-meta-generator" component={SEOMetaGeneratorApp} />
            <Route path="/terms" component={Terms} />
            <Route path="/privacy" component={Privacy} />
            <Route path="/cookies" component={Cookies} />
            <Route component={NotFound} />
          </Switch>
        </main>
        <Footer />
        <CookieBanner />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}
