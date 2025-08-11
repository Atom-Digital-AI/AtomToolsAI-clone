import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, RefreshCw, CheckCircle2 } from "lucide-react";
import Section from "@/components/ui/section";
import { useToast } from "@/hooks/use-toast";

interface EmailVerificationSentProps {
  email?: string;
}

export default function EmailVerificationSent({ email }: EmailVerificationSentProps) {
  // Get email from URL params if not passed as prop
  const urlParams = new URLSearchParams(window.location.search);
  const emailFromUrl = urlParams.get('email');
  const userEmail = email || emailFromUrl || '';
  
  const [resendEmail, setResendEmail] = useState(userEmail);
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);
  const { toast } = useToast();

  const handleResendVerification = async () => {
    if (!resendEmail) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);
    
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resendEmail }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResent(true);
        toast({
          title: "Email sent!",
          description: "Check your inbox for the verification link",
        });
      } else {
        toast({
          title: "Failed to send email",
          description: data.message || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend verification email",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Section className="bg-surface min-h-screen flex items-center">
      <div className="max-w-md mx-auto w-full">
        <Card className="bg-background border-border">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Mail className="w-16 h-16 text-accent" />
            </div>
            
            <CardTitle className="text-2xl font-bold text-text-primary">
              Check Your Email
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center space-y-3">
              <p className="text-text-secondary">
                We've sent a verification link to:
              </p>
              {userEmail && (
                <p className="font-semibold text-text-primary break-all">
                  {userEmail}
                </p>
              )}
              <p className="text-sm text-text-secondary">
                Click the link in the email to verify your account and start using atomtools.ai.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-surface-2 p-4 rounded-lg border border-border">
                <h3 className="font-semibold text-text-primary mb-2">What's next?</h3>
                <ol className="text-sm text-text-secondary space-y-1">
                  <li>1. Check your email inbox (and spam folder)</li>
                  <li>2. Click the verification link</li>
                  <li>3. You'll be automatically logged in</li>
                </ol>
              </div>

              <div className="space-y-3">
                <Label htmlFor="resend-email" className="text-text-primary">
                  Didn't receive the email?
                </Label>
                <Input
                  id="resend-email"
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="bg-surface border-border focus:ring-accent"
                  data-testid="resend-email-input"
                />
                
                <Button 
                  onClick={handleResendVerification}
                  disabled={isResending || resent}
                  className="w-full bg-accent hover:bg-accent-2 text-white"
                  data-testid="resend-verification"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : resent ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Email Sent!
                    </>
                  ) : (
                    'Resend Verification Email'
                  )}
                </Button>
              </div>
            </div>

            <div className="text-center text-sm text-text-secondary border-t border-border pt-4">
              <p>
                Need help?{" "}
                <Link href="/contact" className="text-accent hover:text-accent-2 underline">
                  Contact Support
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}