import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Lock, Eye, EyeOff, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    setToken(tokenParam);
  }, []);

  // Validate token before showing the form
  const { data: tokenValidation, isLoading: isValidating } = useQuery({
    queryKey: ['validateResetToken', token],
    queryFn: async () => {
      if (!token) return { valid: false, message: 'No token provided' };

      const response = await fetch(`/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`);
      return response.json();
    },
    enabled: !!token,
  });

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormData) => {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: data.password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reset password");
      }

      return response.json();
    },
    onSuccess: () => {
      setIsSuccess(true);
      toast({
        title: "Password reset successful",
        description: "You can now log in with your new password.",
      });
      // Redirect to login after 3 seconds
      setTimeout(() => {
        setLocation('/login');
      }, 3000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ResetPasswordFormData) => {
    resetPasswordMutation.mutate(data);
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <Card className="border-border bg-surface shadow-lg max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-12 h-12 text-accent animate-spin mb-4" />
            <p className="text-text-secondary">Validating reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No token provided
  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <Card className="border-border bg-surface shadow-lg max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <XCircle className="w-16 h-16 text-danger" />
            </div>
            <CardTitle className="text-2xl text-text-primary">Invalid Link</CardTitle>
            <CardDescription className="text-text-secondary">
              No reset token was provided. Please request a new password reset.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/forgot-password">
              <Button className="bg-accent hover:bg-accent-2 text-white">
                Request new reset link
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid or expired token
  if (tokenValidation && !tokenValidation.valid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <Card className="border-border bg-surface shadow-lg max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <XCircle className="w-16 h-16 text-danger" />
            </div>
            <CardTitle className="text-2xl text-text-primary">Link Expired</CardTitle>
            <CardDescription className="text-text-secondary">
              {tokenValidation.message || "This reset link is invalid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/forgot-password">
              <Button className="bg-accent hover:bg-accent-2 text-white">
                Request new reset link
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <Card className="border-border bg-surface shadow-lg max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle2 className="w-16 h-16 text-success" />
            </div>
            <CardTitle className="text-2xl text-text-primary">Password Reset!</CardTitle>
            <CardDescription className="text-text-secondary">
              Your password has been successfully reset. Redirecting to login...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/login">
              <Button className="bg-accent hover:bg-accent-2 text-white">
                Go to login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Reset your password
          </h1>
          <p className="text-text-secondary">
            Enter your new password below
          </p>
        </div>

        {/* Reset Password Form */}
        <Card className="border-border bg-surface shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-text-primary">
              New password
            </CardTitle>
            <CardDescription className="text-center text-text-secondary">
              Choose a strong password with at least 8 characters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* New Password Field */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-text-primary">New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter new password"
                            className="pl-10 pr-10 bg-background border-border text-text-primary placeholder:text-text-secondary focus:border-accent"
                            data-testid="input-password"
                            autoComplete="new-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
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

                {/* Confirm Password Field */}
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-text-primary">Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                            className="pl-10 pr-10 bg-background border-border text-text-primary placeholder:text-text-secondary focus:border-accent"
                            data-testid="input-confirm-password"
                            autoComplete="new-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
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

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-accent hover:bg-accent-2 text-white font-medium py-2.5"
                  disabled={resetPasswordMutation.isPending}
                  data-testid="button-submit"
                >
                  {resetPasswordMutation.isPending ? "Resetting password..." : "Reset password"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
