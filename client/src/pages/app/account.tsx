import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, Calendar, Settings } from "lucide-react";
import { type User as UserType } from "@shared/schema";

export default function Account() {
  const { data: user, isLoading, error } = useQuery<UserType>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-text-secondary">
          Failed to load account information. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Account Settings</h1>
          <p className="text-text-secondary">
            Manage your account information and preferences.
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Profile Information</span>
              </CardTitle>
              <CardDescription>
                Your basic account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Username</label>
                  <div className="mt-1 p-3 border border-border rounded-lg bg-surface">
                    {user.username}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Email</label>
                  <div className="mt-1 p-3 border border-border rounded-lg bg-surface flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-text-secondary" />
                    <span>{user.email}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" disabled>
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>
                Manage your account and data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-3">
                <Button variant="outline" disabled>
                  Change Password
                </Button>
                <Button variant="outline" disabled>
                  Download Account Data
                </Button>
                <Button variant="destructive" disabled>
                  Delete Account
                </Button>
              </div>
              <p className="text-sm text-text-secondary">
                Account management features are coming soon.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}