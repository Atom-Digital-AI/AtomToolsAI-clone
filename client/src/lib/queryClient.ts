import { QueryClient, QueryFunction } from "@tanstack/react-query";
import * as Sentry from "@sentry/react";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    const error = new Error(`${res.status}: ${text}`);

    // Capture API errors to Sentry (except 401 which is expected for unauthenticated users)
    if (import.meta.env.VITE_SENTRY_DSN && res.status !== 401) {
      // Don't send in development unless explicitly enabled
      if (
        import.meta.env.MODE !== "development" ||
        import.meta.env.VITE_SENTRY_DEBUG
      ) {
        Sentry.captureException(error, {
          tags: {
            http_status: res.status.toString(),
            endpoint: res.url,
            error_type: "api_error",
          },
          extra: {
            status: res.status,
            statusText: res.statusText,
            url: res.url,
            responseText: text.substring(0, 500), // Limit response text length
          },
          level:
            res.status >= 500
              ? "error"
              : res.status === 429
              ? "warning"
              : "info",
        });
      }
    }

    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
      // Note: onError removed in React Query v5, errors are handled via error boundaries and mutation callbacks
    },
    mutations: {
      retry: false,
      // Note: onError removed in React Query v5, handle errors in mutation callbacks (onError in useMutation)
    },
  },
});
