import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Building2, User, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { completeProfileSchema, type CompleteProfile } from "@shared/schema";

export default function CompleteProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<CompleteProfile>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      companyName: "",
    },
  });

  const completeProfileMutation = useMutation({
    mutationFn: async (data: CompleteProfile) => {
      return await apiRequest("POST", "/api/auth/complete-profile", data);
    },
    onSuccess: () => {
      toast({
        title: "Profile Completed",
        description: "Welcome to atomtools.ai! Your profile has been set up successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      // Redirect to home page
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete profile",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: CompleteProfile) => {
    completeProfileMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Complete Your Profile</h1>
          <p className="text-text-secondary">
            Just a few more details to get started with atomtools.ai
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <User className="w-5 h-5" />
              <span>Profile Information</span>
            </CardTitle>
            <CardDescription>
              Tell us about yourself and your company
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your first name"
                          data-testid="input-first-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your last name"
                          data-testid="input-last-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center space-x-1">
                        <Building2 className="w-4 h-4" />
                        <span>Company Name *</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your company name"
                          data-testid="input-company-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={completeProfileMutation.isPending}
                  data-testid="button-complete-profile"
                >
                  {completeProfileMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Completing Profile...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4" />
                      <span>Complete Profile</span>
                    </div>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-text-secondary">
          <p>All fields are required to access your tools</p>
        </div>
      </div>
    </div>
  );
}