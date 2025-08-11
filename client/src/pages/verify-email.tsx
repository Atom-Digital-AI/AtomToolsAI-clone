import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, RefreshCw, Mail } from "lucide-react";
import Section from "@/components/ui/section";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    // Verify the email
    fetch(`/api/auth/verify-email?token=${token}`)
      .then(async (response) => {
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
      })
      .catch((error) => {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('Failed to verify email. Please try again.');
      });
  }, [setLocation]);

  const handleRetryVerification = () => {
    setLocation('/signup');
  };

  return (
    <Section className="bg-surface min-h-screen flex items-center">
      <div className="max-w-md mx-auto w-full">
        <Card className="bg-background border-border">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
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
              {status === 'verifying' && 'Verifying Email...'}
              {status === 'success' && 'Email Verified!'}
              {status === 'error' && 'Verification Failed'}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            <p className="text-text-secondary">
              {message}
            </p>
            
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