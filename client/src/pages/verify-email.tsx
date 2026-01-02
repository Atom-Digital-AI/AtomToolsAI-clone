import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, RefreshCw, Mail } from "lucide-react";
import Section from "@/components/ui/section";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'pending' | 'verifying' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');

    if (!tokenParam) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    setToken(tokenParam);
    // Don't auto-verify - wait for user to click button
    // This prevents email security scanners from consuming the token
  }, []);

  const handleVerifyClick = async () => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    setStatus('verifying');

    try {
      // Use POST to prevent link scanners from triggering verification
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        setMessage('Email verified successfully! Redirecting to dashboard...');

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          setLocation('/app');
        }, 2000);
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to verify email');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      setMessage('Failed to verify email. Please try again.');
    }
  };

  const handleRetryVerification = () => {
    setLocation('/signup');
  };

  return (
    <Section className="bg-surface min-h-screen flex items-center">
      <div className="max-w-md mx-auto w-full">
        <Card className="bg-background border-border">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {status === 'pending' && (
                <Mail className="w-16 h-16 text-accent" />
              )}
              {status === 'verifying' && (
                <RefreshCw className="w-16 h-16 text-accent animate-spin" />
              )}
              {status === 'success' && (
                <CheckCircle2 className="w-16 h-16 text-success" />
              )}
              {status === 'error' && (
                <XCircle className="w-16 h-16 text-danger" />
              )}
            </div>

            <CardTitle className="text-2xl font-bold text-text-primary">
              {status === 'pending' && 'Verify Your Email'}
              {status === 'verifying' && 'Verifying Email...'}
              {status === 'success' && 'Email Verified!'}
              {status === 'error' && 'Verification Failed'}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            {status === 'pending' && (
              <div className="space-y-4">
                <p className="text-text-secondary">
                  Click the button below to verify your email address and activate your account.
                </p>
                <Button
                  onClick={handleVerifyClick}
                  className="w-full bg-accent hover:bg-accent-2 text-white"
                  data-testid="verify-email-button"
                >
                  Verify My Email
                </Button>
              </div>
            )}

            {status === 'verifying' && (
              <p className="text-text-secondary">
                Please wait while we verify your email...
              </p>
            )}

            {message && status !== 'pending' && (
              <p className="text-text-secondary">
                {message}
              </p>
            )}

            {status === 'error' && (
              <div className="space-y-3">
                <Button
                  onClick={handleRetryVerification}
                  className="w-full bg-accent hover:bg-accent-2 text-white"
                  data-testid="retry-verification"
                >
                  Try Again
                </Button>

                <p className="text-sm text-text-secondary">
                  Need help? Contact our support team.
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-3">
                <div className="flex items-center justify-center text-sm text-success">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Redirecting to dashboard...
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}