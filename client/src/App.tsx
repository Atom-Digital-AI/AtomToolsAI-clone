import { Route, Switch, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import CookieBanner from "@/components/layout/cookie-banner";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

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
import VerifyEmail from "@/pages/verify-email";
import EmailVerificationSent from "@/pages/email-verification-sent";
import CompleteProfile from "@/pages/complete-profile";
import Dashboard from "@/pages/app/dashboard";
import Account from "@/pages/app/account";
import MyTools from "@/pages/app/my-tools";
import ProfileSettings from "@/pages/profile-settings";
import FacebookAdsConnector from "@/pages/app/tools/facebook-ads-connector";
import GoogleAdsCopyGeneratorApp from "@/pages/app/tools/google-ads-copy-generator";
import SEOMetaGeneratorApp from "@/pages/app/tools/seo-meta-generator";
import AdminDashboard from "@/pages/admin/dashboard";
import CmsManagement from "@/pages/admin/cms";
import DynamicCmsPage, { CmsHomePage } from "@/pages/cms-page";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import Cookies from "@/pages/cookies";
import NotFound from "@/pages/not-found";



function AuthRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;

    // If user is authenticated and on home/login/signup, redirect to app
    if (isAuthenticated && (location === "/" || location === "/login" || location === "/sign-up")) {
      setLocation("/app");
      return;
    }

    // If user is not authenticated and trying to access protected routes, redirect to login
    if (!isAuthenticated && location.startsWith("/app")) {
      setLocation("/login");
      return;
    }
  }, [isAuthenticated, isLoading, location, setLocation]);

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-text-primary flex flex-col w-full">
        <AuthRedirect />
        <Header />
        <main className="flex-1 w-full">
          <Switch>
            <Route path="/" component={CmsHomePage} />
            <Route path="/tools" component={ToolsIndex} />
            <Route path="/tools/facebook-ads-looker-studio-connector" component={FacebookAdsTool} />
            <Route path="/tools/seo-meta-generator" component={SeoMetaTool} />
            <Route path="/tools/google-ads-copy-generator" component={GoogleAdsTool} />
            <Route path="/resources" component={Resources} />
            <Route path="/pricing" component={Pricing} />
            <Route path="/contact" component={Contact} />
            <Route path="/sign-up" component={SignUp} />
            <Route path="/login" component={Login} />
            <Route path="/verify-email" component={VerifyEmail} />
            <Route path="/email-verification-sent" component={EmailVerificationSent} />
            <Route path="/complete-profile" component={CompleteProfile} />
            <Route path="/app" component={Dashboard} />
            <Route path="/app/account" component={Account} />
            <Route path="/app/profile-settings" component={ProfileSettings} />
            <Route path="/app/my-tools" component={MyTools} />
            <Route path="/app/tools/facebook-ads-connector" component={FacebookAdsConnector} />
            <Route path="/app/tools/google-ads-copy-generator" component={GoogleAdsCopyGeneratorApp} />
            <Route path="/app/tools/seo-meta-generator" component={SEOMetaGeneratorApp} />
            <Route path="/admin" component={AdminDashboard} />
            <Route path="/admin/cms" component={CmsManagement} />
            <Route path="/terms" component={Terms} />
            <Route path="/privacy" component={Privacy} />
            <Route path="/cookies" component={Cookies} />
            {/* Dynamic CMS pages - must be last before NotFound */}
            <Route path="/:slug*" component={DynamicCmsPage} />
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
