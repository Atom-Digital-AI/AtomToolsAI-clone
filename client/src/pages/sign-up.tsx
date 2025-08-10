import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import Section from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Eye, EyeOff } from "lucide-react";

const signUpSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  terms: z.boolean().refine(val => val === true, "You must agree to the terms and conditions"),
});

type SignUpFormData = z.infer<typeof signUpSchema>;

export default function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      terms: false,
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async (data: SignUpFormData) => {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: data.username, email: data.email, password: data.password }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create account");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account created!",
        description: "Welcome to atomtools.ai. You can now start using our tools.",
      });
      // Redirect to dashboard
      window.location.href = "/app";
    },
    onError: (error) => {
      toast({
        title: "Failed to create account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const googleSignUpMutation = useMutation({
    mutationFn: async () => {
      window.location.href = "/api/auth/google";
    },
  });

  const onSubmit = (data: SignUpFormData) => {
    signUpMutation.mutate(data);
  };

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

  const password = form.watch("password");
  const passwordStrength = getPasswordStrength(password);

  return (
    <Section className="bg-surface">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold mb-4 text-text-primary">
            Sign up for free
          </h1>
          <p className="text-text-secondary">
            Start automating your marketing today. No credit card required.
          </p>
        </div>
        
        <Card className="bg-background border-border">
          <CardContent className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Google Sign Up */}
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
                    <span className="px-2 bg-background text-text-secondary">or</span>
                  </div>
                </div>
                
                {/* Username Field */}
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-text-primary">Username</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          {...field}
                          className="bg-surface border-border focus:ring-accent"
                          data-testid="signup-username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email Field */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-text-primary">Email address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          {...field}
                          className="bg-surface border-border focus:ring-accent"
                          data-testid="signup-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Password Field */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-text-primary">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            {...field}
                            className="bg-surface border-border focus:ring-accent pr-12"
                            data-testid="signup-password"
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
                      
                      {/* Password strength indicator */}
                      {password && (
                        <div className="mt-2">
                          <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getPasswordStrengthColor(passwordStrength)} rounded-full transition-all duration-300`}
                              style={{ width: `${(passwordStrength / 5) * 100}%` }}
                              data-testid="password-strength-bar"
                            />
                          </div>
                          <p className="text-xs text-text-secondary mt-1" data-testid="password-strength-text">
                            Password strength: {getPasswordStrengthText(passwordStrength)}
                          </p>
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
                        <FormLabel className="text-sm text-text-secondary cursor-pointer">
                          I agree to the{" "}
                          <Link href="/terms" className="text-accent hover:text-accent-2 underline">
                            Terms of Service
                          </Link>{" "}
                          and{" "}
                          <Link href="/privacy" className="text-accent hover:text-accent-2 underline">
                            Privacy Policy
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
                  data-testid="create-account"
                >
                  {signUpMutation.isPending ? "Creating account..." : "Create account"}
                </Button>
                
                <p className="text-center text-sm text-text-secondary">
                  Already have an account?{" "}
                  <Link href="/sign-in" className="text-accent hover:text-accent-2 underline" data-testid="sign-in-link">
                    Sign in
                  </Link>
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}
