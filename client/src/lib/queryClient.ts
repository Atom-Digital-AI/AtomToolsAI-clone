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
  // Log all API requests for debugging
  console.error("🌐 [API Request] Starting:", {
    method,
    url,
    hasData: !!data,
    dataSize: data ? JSON.stringify(data).length : 0,
    timestamp: new Date().toISOString(),
  });
  
  if (data) {
    console.error("🌐 [API Request] Request data:", data);
  }

  const startTime = Date.now();
  
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    const duration = Date.now() - startTime;
    console.error("🌐 [API Request] Response received:", {
      method,
      url,
      status: res.status,
      statusText: res.statusText,
      duration: `${duration}ms`,
      ok: res.ok,
    });

    if (!res.ok) {
      const text = await res.clone().text();
      console.error("🌐 [API Request] Error response:", {
        status: res.status,
        statusText: res.statusText,
        responseText: text.substring(0, 500),
      });
    }

    await throwIfResNotOk(res);
    
    console.error("🌐 [API Request] Request completed successfully");
    return res;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("🌐 [API Request] Request failed:", {
      method,
      url,
      error: error instanceof Error ? error.message : String(error),
      duration: `${duration}ms`,
    });
    throw error;
  }
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
