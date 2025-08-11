import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Section from "@/components/ui/section";
import { Check, ArrowRight, Rocket, Cog, Star, Plug, Bolt, Shield, ChartBar, Mail, User, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

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

const signUpFormSchema = z.object({
  email: z.string()
    .email("Please enter a valid email address")
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  terms: z.boolean().refine(val => val === true, "You must agree to the terms and conditions"),
});

type SignUpFormData = z.infer<typeof signUpFormSchema>;

function SignUpFormCard() {
  const { toast } = useToast();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      email: "",
      password: "",
      terms: false,
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async (data: SignUpFormData) => {
      return await apiRequest("POST", "/api/auth/register", data);
    },
    onSuccess: () => {
      setShowSuccess(true);
      form.reset();
      toast({
        title: "Account Created!",
        description: "Please check your email to verify your account.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sign Up Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    }
  });

  const googleSignUpMutation = useMutation({
    mutationFn: async () => {
      // Redirect to Google OAuth
      window.location.href = "/api/auth/google";
    },
    onError: (error: any) => {
      toast({
        title: "Google Sign Up Error",
        description: "Unable to connect to Google. Please try email/password signup.",
        variant: "destructive",
      });
    },
  });

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    return strength;
  };

  const getPasswordStrengthText = (strength: number) => {
    if (strength < 3) return "Weak";
    if (strength < 4) return "Medium";
    return "Strong";
  };

  const getPasswordStrengthColor = (strength: number) => {
    if (strength < 3) return "bg-danger";
    if (strength < 4) return "bg-warning";
    return "bg-success";
  };

  const onSubmit = (data: SignUpFormData) => {
    signUpMutation.mutate(data);
  };

  const password = form.watch("password");
  const passwordStrength = getPasswordStrength(password);

  if (showSuccess) {
    return (
      <Card className="bg-surface border-border shadow-2xl max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-accent" />
          </div>
          <CardTitle className="text-xl font-semibold text-text-primary">
            Check Your Email
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-text-secondary mb-6">
            We've sent you a verification link. Click it to activate your account and start using atomtools.ai.
          </p>
          <Button 
            variant="outline" 
            onClick={() => setShowSuccess(false)}
            className="w-full"
            data-testid="back-to-signup-button"
          >
            Back to Sign Up
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-surface border-border shadow-2xl max-w-md w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-text-primary">
          Start for Free
        </CardTitle>
        <p className="text-text-secondary">
          Join thousands of marketers automating their workflows
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Google Sign Up Button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => googleSignUpMutation.mutate()}
              className="w-full flex items-center justify-center gap-3 bg-surface-2 hover:bg-surface border-border hover:border-accent text-text-primary"
              data-testid="google-signup"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
            
            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-surface text-text-secondary">or</span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      data-testid="signup-email-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Password
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Minimum 8 characters"
                        data-testid="signup-password-input"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary h-auto p-0"
                        onClick={() => setShowPassword(!showPassword)}
                        data-testid="toggle-password"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                  
                  {/* Password requirements */}
                  {password && (
                    <div className="mt-2">
                      <p className="text-xs text-text-secondary">
                        Password must be at least 8 characters and contain:
                      </p>
                      <ul className="text-xs text-text-secondary mt-1 space-y-0.5">
                        <li className={password && /[a-z]/.test(password) ? "text-success" : ""}>
                          • At least one lowercase letter
                        </li>
                        <li className={password && /[A-Z]/.test(password) ? "text-success" : ""}>
                          • At least one uppercase letter
                        </li>
                        <li className={password && /\d/.test(password) ? "text-success" : ""}>
                          • At least one number
                        </li>
                      </ul>
                    </div>
                  )}
                </FormItem>
              )}
            />

            {/* Terms checkbox */}
            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="terms-checkbox"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm text-text-secondary">
                      I agree to the{" "}
                      <Link href="/terms">
                        <Button variant="link" className="p-0 h-auto text-sm text-accent hover:text-accent-2">
                          Terms of Service
                        </Button>
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy">
                        <Button variant="link" className="p-0 h-auto text-sm text-accent hover:text-accent-2">
                          Privacy Policy
                        </Button>
                      </Link>
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent-2 text-white"
              disabled={signUpMutation.isPending}
              data-testid="signup-submit-button"
            >
              {signUpMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Creating Account...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Create Free Account
                </div>
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <p className="text-sm text-text-secondary">
            Already have an account?{" "}
            <Link href="/login">
              <Button variant="link" className="p-0 h-auto text-accent hover:text-accent-2" data-testid="login-link">
                Sign in
              </Button>
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-text-secondary">
            By signing up, you agree to our{" "}
            <Link href="/terms">
              <Button variant="link" className="p-0 h-auto text-xs text-accent hover:text-accent-2">
                Terms
              </Button>
            </Link>{" "}
            and{" "}
            <Link href="/privacy">
              <Button variant="link" className="p-0 h-auto text-xs text-accent hover:text-accent-2">
                Privacy Policy
              </Button>
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

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
        {/* Animated Video Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-surface"></div>
          
          {/* Animated particles and geometric shapes */}
          <div className="absolute inset-0">
            {/* Floating orbs */}
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-accent/10 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-accent-2/15 rounded-full blur-lg animate-pulse" style={{animationDelay: '1s'}}></div>
            <div className="absolute top-1/2 left-3/4 w-16 h-16 bg-accent/20 rounded-full blur-md animate-pulse" style={{animationDelay: '2s'}}></div>
            
            {/* Moving geometric lines */}
            <div className="absolute inset-0">
              <svg className="w-full h-full opacity-30" viewBox="0 0 1000 600" fill="none">
                <g className="animate-[drift_20s_ease-in-out_infinite]">
                  <path d="M0,300 Q250,100 500,300 T1000,300" stroke="url(#gradient1)" strokeWidth="2" fill="none" opacity="0.6"/>
                  <path d="M0,350 Q300,150 600,350 T1200,350" stroke="url(#gradient2)" strokeWidth="1.5" fill="none" opacity="0.4"/>
                </g>
                <g className="animate-[drift_25s_ease-in-out_infinite_reverse]">
                  <path d="M0,250 Q400,50 800,250 T1600,250" stroke="url(#gradient3)" strokeWidth="1" fill="none" opacity="0.3"/>
                </g>
                <defs>
                  <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity="0"/>
                    <stop offset="50%" stopColor="#6366F1" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#6366F1" stopOpacity="0"/>
                  </linearGradient>
                  <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0"/>
                    <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.6"/>
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0"/>
                  </linearGradient>
                  <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity="0"/>
                    <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity="0"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            
            {/* Floating code/tech elements */}
            <div className="absolute top-1/3 left-1/6 text-accent/20 font-mono text-sm animate-[float_6s_ease-in-out_infinite]">
              &lt;automation/&gt;
            </div>
            <div className="absolute top-2/3 right-1/5 text-accent-2/20 font-mono text-xs animate-[float_8s_ease-in-out_infinite]" style={{animationDelay: '2s'}}>
              AI()
            </div>
            <div className="absolute top-1/2 left-1/12 text-accent/15 font-mono text-xs animate-[float_7s_ease-in-out_infinite]" style={{animationDelay: '4s'}}>
              scale++
            </div>
            
            {/* Additional floating elements for richness */}
            <div className="absolute top-1/5 right-1/3 w-2 h-2 bg-accent/30 rounded-full animate-[float_10s_ease-in-out_infinite]" style={{animationDelay: '1s'}}></div>
            <div className="absolute bottom-1/4 left-1/3 w-3 h-3 bg-accent-2/25 rounded-full animate-[float_12s_ease-in-out_infinite]" style={{animationDelay: '3s'}}></div>
            <div className="absolute top-3/5 right-1/6 w-1.5 h-1.5 bg-success/40 rounded-full animate-[float_9s_ease-in-out_infinite]" style={{animationDelay: '5s'}}></div>
            
            {/* Subtle grid overlay */}
            <div className="absolute inset-0 opacity-5" style={{
              backgroundImage: `
                linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px),
                linear-gradient(180deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px'
            }}></div>
          </div>
          
          {/* Enhanced glow effects */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-[glow_4s_ease-in-out_infinite_alternate]"></div>
          <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-accent-2/10 rounded-full blur-2xl animate-[glow_6s_ease-in-out_infinite_alternate]" style={{animationDelay: '2s'}}></div>
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
            
            {/* Sign Up Form */}
            <div className="relative animate-fade-in">
              <SignUpFormCard />
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
                <Link href="/pricing">
                  <Button 
                    className="w-full bg-accent hover:bg-accent-2 text-white" 
                    data-testid={`tool-card-${index}`}
                  >
                    View Packages
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
