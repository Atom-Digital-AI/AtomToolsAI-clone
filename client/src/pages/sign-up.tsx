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
  email: z.string()
    .email("Please enter a valid email address")
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Please enter a valid email address"),
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
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create account");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.requiresVerification) {
        toast({
          title: "Account created!",
          description: "Please check your email to verify your account.",
        });
        // Redirect to verification page
        window.location.href = `/email-verification-sent?email=${encodeURIComponent(form.getValues('email'))}`;
      } else {
        toast({
          title: "Account created!",
          description: "Welcome to atomtools.ai. You can now start using our tools.",
        });
        // Redirect to dashboard
        window.location.href = "/app";
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to create account",
        description: error.message,
        variant: "destructive",
      });
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
                          data-testid="input-email"
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
                            data-testid="input-password"
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
                  data-testid="button-submit"
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
