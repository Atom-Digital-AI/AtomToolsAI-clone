import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle } from "lucide-react";

interface ErrorContext {
  url?: string;
  userAgent?: string;
  timestamp?: string;
  [key: string]: any;
}

/**
 * Show an error toast with admin-only "Send to AI" button
 * This function checks if the user is admin and adds a report button to error toasts
 */
export function showAdminErrorToast(
  title: string,
  description: string,
  isAdmin: boolean,
  additionalContext?: ErrorContext
) {
  const context: ErrorContext = {
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    ...additionalContext,
  };

  if (isAdmin) {
    // Show toast with "Send to AI" button for admin users
    toast({
      variant: "destructive",
      title,
      description,
      action: (
        <ToastAction
          altText="Send error report to AI"
          data-testid="button-send-error-to-ai"
          onClick={async () => {
            try {
              await apiRequest("POST", "/api/error-reports", {
                errorTitle: title,
                errorMessage: description,
                errorContext: context,
              });

              // Show success confirmation
              toast({
                title: "Error Reported",
                description: "The error has been sent to the AI agent for analysis and fixing.",
              });
            } catch (error) {
              console.error("Failed to send error report:", error);
              toast({
                variant: "destructive",
                title: "Report Failed",
                description: "Could not send error report. Please try again.",
              });
            }
          }}
        >
          Send to AI
        </ToastAction>
      ),
    });
  } else {
    // Regular error toast for non-admin users
    toast({
      variant: "destructive",
      title,
      description,
    });
  }
}

/**
 * Wrapper around the regular toast function that automatically adds
 * "Send to AI" button for destructive toasts when user is admin
 */
export function createAdminToast(isAdmin: boolean) {
  return {
    success: (title: string, description?: string) => {
      toast({
        title,
        description,
      });
    },
    error: (title: string, description: string, context?: ErrorContext) => {
      showAdminErrorToast(title, description, isAdmin, context);
    },
    info: (title: string, description?: string) => {
      toast({
        title,
        description,
      });
    },
  };
}
