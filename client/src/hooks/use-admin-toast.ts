import { useToast } from "@/hooks/use-toast";
import { showAdminErrorToast } from "@/lib/admin-toast";
import { useAuth } from "@/hooks/useAuth";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

type ToastOptions = Omit<ToastProps, "id"> & {
  title?: string;
  description?: string;
  action?: ToastActionElement;
};

/**
 * Custom hook that wraps useToast and automatically adds "Send to AI" button
 * for admin users on error toasts. This is a drop-in replacement for useToast.
 * 
 * Usage:
 *   import { useAdminToast } from "@/hooks/use-admin-toast";
 *   const { toast } = useAdminToast();
 *   toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
 */
export function useAdminToast() {
  const { user } = useAuth();
  const { toast: originalToast, ...rest } = useToast();
  const isAdmin = user?.isAdmin || false;

  const wrappedToast = (options: ToastOptions) => {
    // If it's an error toast and user is admin, use the admin error toast
    if (options.variant === "destructive" && isAdmin && options.title) {
      showAdminErrorToast(
        options.title,
        options.description?.toString() || "",
        isAdmin
      );
    } else {
      // Otherwise use regular toast
      originalToast(options);
    }
  };

  return {
    ...rest,
    toast: wrappedToast
  };
}
