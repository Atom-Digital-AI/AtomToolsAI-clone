import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Link } from "wouter";

interface ErrorBoundaryFallbackProps {
  error: Error;
  resetError: () => void;
}

function ErrorBoundaryFallback({
  error,
  resetError,
}: ErrorBoundaryFallbackProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl text-text-primary">
            Something went wrong
          </CardTitle>
          <CardDescription className="text-text-secondary">
            We're sorry, but something unexpected happened. Our team has been
            notified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {import.meta.env.MODE === "development" && (
            <div className="p-3 bg-surface rounded-md border border-border">
              <p className="text-xs font-mono text-text-secondary break-all">
                {error.message}
              </p>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-text-secondary cursor-pointer">
                    Stack trace
                  </summary>
                  <pre className="text-xs text-text-secondary mt-2 whitespace-pre-wrap break-all">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={resetError}
              className="flex-1 bg-accent hover:bg-accent-2"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="flex-1"
            >
              Reload page
            </Button>
            <Link href="/">
              <Button variant="outline" className="flex-1 w-full sm:w-auto">
                <Home className="mr-2 h-4 w-4" />
                Go home
              </Button>
            </Link>
          </div>

          <p className="text-xs text-center text-text-secondary">
            If this problem persists, please{" "}
            <Link href="/contact" className="text-accent hover:underline">
              contact support
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

  if (SENTRY_DSN) {
    return (
      <Sentry.ErrorBoundary
        fallback={({ error, resetError }) => (
          <ErrorBoundaryFallback
            error={error instanceof Error ? error : new Error(String(error))}
            resetError={resetError}
          />
        )}
        showDialog={false}
      >
        {children}
      </Sentry.ErrorBoundary>
    );
  }

  return <>{children}</>;
}
