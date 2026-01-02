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
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormData) => {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send reset email");
      }

      return response.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ForgotPasswordFormData) => {
    forgotPasswordMutation.mutate(data);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card className="border-border bg-surface shadow-lg">
            <CardHeader className="space-y-1 text-center">
              <div className="mx-auto mb-4">
                <CheckCircle2 className="w-16 h-16 text-success" />
              </div>
              <CardTitle className="text-2xl text-text-primary">
                Check your email
              </CardTitle>
              <CardDescription className="text-text-secondary">
                If an account exists with that email, we've sent a password reset link.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-text-secondary text-center">
                The link will expire in 1 hour. If you don't see the email, check your spam folder.
              </p>
              <div className="text-center">
                <Link href="/login">
                  <Button variant="outline" className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Forgot your password?
          </h1>
          <p className="text-text-secondary">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        {/* Forgot Password Form */}
        <Card className="border-border bg-surface shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-text-primary">
              Reset password
            </CardTitle>
            <CardDescription className="text-center text-text-secondary">
              We'll send you a link to reset your password
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

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-accent hover:bg-accent-2 text-white font-medium py-2.5"
                  disabled={forgotPasswordMutation.isPending}
                  data-testid="button-submit"
                >
                  {forgotPasswordMutation.isPending ? "Sending..." : "Send reset link"}
                </Button>
              </form>
            </Form>

            {/* Back to Login Link */}
            <div className="mt-6 text-center">
              <Link href="/login">
                <span className="text-sm text-accent hover:text-accent-2 font-medium cursor-pointer transition-colors inline-flex items-center">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
