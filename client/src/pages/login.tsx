import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to login");
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      console.log("Login successful, user data:", data);
      
      // Check if user needs email verification or profile completion
      try {
        const authResponse = await fetch("/api/auth/me", {
          credentials: "include",
        });
        
        if (authResponse.status === 403) {
          const authData = await authResponse.json();
          
          if (authData.requiresVerification) {
            toast({
              title: "Email verification required",
              description: "Please check your email to verify your account.",
              variant: "destructive",
            });
            setTimeout(() => {
              window.location.href = `/email-verification-sent?email=${encodeURIComponent(data.user.email)}`;
            }, 1000);
            return;
          }
          
          if (authData.requiresProfileCompletion) {
            toast({
              title: "Profile completion required",
              description: "Please complete your profile to continue.",
            });
            setTimeout(() => {
              window.location.href = "/complete-profile";
            }, 500);
            return;
          }
        }
        
        if (authResponse.ok) {
          toast({
            title: "Welcome back!",
            description: "You have been successfully logged in.",
          });
          setTimeout(() => {
            window.location.href = "/app";
          }, 500);
        }
      } catch (error) {
        console.error("Authentication check failed:", error);
        toast({
          title: "Login successful",
          description: "Redirecting...",
        });
        setTimeout(() => {
          window.location.href = "/app";
        }, 500);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Welcome back
          </h1>
          <p className="text-text-secondary">
            Sign in to your atomtools.ai account
          </p>
        </div>

        {/* Login Form */}
        <Card className="border-border bg-surface shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-text-primary">
              Sign in
            </CardTitle>
            <CardDescription className="text-center text-text-secondary">
              Enter your email and password to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Email Field */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-text-primary">Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
                          <Input
                            type="email"
                            placeholder="Enter your email"
                            className="pl-10 bg-background border-border text-text-primary placeholder:text-text-secondary focus:border-accent"
                            data-testid="input-email"
                            {...field}
                          />
                        </div>
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
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="pl-10 pr-10 bg-background border-border text-text-primary placeholder:text-text-secondary focus:border-accent"
                            data-testid="input-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="toggle-password-visibility"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-text-secondary" />
                            ) : (
                              <Eye className="h-4 w-4 text-text-secondary" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Forgot Password Link */}
                <div className="text-right">
                  <Link href="/forgot-password">
                    <span className="text-sm text-accent hover:text-accent-2 cursor-pointer transition-colors">
                      Forgot your password?
                    </span>
                  </Link>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-accent hover:bg-accent-2 text-white font-medium py-2.5"
                  disabled={loginMutation.isPending}
                  data-testid="button-submit"
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </Form>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-text-secondary">
                Don't have an account?{" "}
                <Link href="/sign-up">
                  <span className="text-accent hover:text-accent-2 font-medium cursor-pointer transition-colors">
                    Sign up free
                  </span>
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}