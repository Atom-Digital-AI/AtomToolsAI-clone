import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

// Initialize Sentry for React
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
if (SENTRY_DSN) {
  // Intercept fetch calls to capture API errors
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const [url, options] = args;
    try {
      const response = await originalFetch(...args);

      // Capture non-2xx responses (except 401 which is expected for unauthenticated users)
      if (!response.ok && response.status !== 401 && SENTRY_DSN) {
        // Don't send in development unless explicitly enabled
        if (
          import.meta.env.MODE !== "development" ||
          import.meta.env.VITE_SENTRY_DEBUG
        ) {
          // Clone response to read error text without consuming the original
          const clonedResponse = response.clone();
          clonedResponse
            .text()
            .then((errorText) => {
              const error = new Error(
                `API Error: ${response.status} ${response.statusText}`
              );

              Sentry.captureException(error, {
                tags: {
                  http_status: response.status.toString(),
                  endpoint: typeof url === "string" ? url : url.toString(),
                  error_type: "fetch_error",
                  method: options?.method || "GET",
                },
                extra: {
                  status: response.status,
                  statusText: response.statusText,
                  url: typeof url === "string" ? url : url.toString(),
                  method: options?.method || "GET",
                  responseText: errorText.substring(0, 500),
                },
                level:
                  response.status >= 500
                    ? "error"
                    : response.status === 429
                    ? "warning"
                    : "info",
              });
            })
            .catch(() => {
              // If we can't read the response, still capture the error
              const error = new Error(
                `API Error: ${response.status} ${response.statusText}`
              );
              Sentry.captureException(error, {
                tags: {
                  http_status: response.status.toString(),
                  endpoint: typeof url === "string" ? url : url.toString(),
                  error_type: "fetch_error",
                  method: options?.method || "GET",
                },
                extra: {
                  status: response.status,
                  statusText: response.statusText,
                  url: typeof url === "string" ? url : url.toString(),
                  method: options?.method || "GET",
                },
                level:
                  response.status >= 500
                    ? "error"
                    : response.status === 429
                    ? "warning"
                    : "info",
              });
            });
        }
      }

      return response;
    } catch (error) {
      // Network errors (failed to fetch, etc.)
      if (SENTRY_DSN && error instanceof Error) {
        if (
          import.meta.env.MODE !== "development" ||
          import.meta.env.VITE_SENTRY_DEBUG
        ) {
          Sentry.captureException(error, {
            tags: {
              error_type: "network_error",
              endpoint: typeof url === "string" ? url : url.toString(),
            },
            extra: {
              url: typeof url === "string" ? url : url.toString(),
              method: options?.method || "GET",
            },
          });
        }
      }
      throw error;
    }
  };

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Release tracking (can be set via VITE_SENTRY_RELEASE env var)
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    integrations: [
      Sentry.browserTracingIntegration({
        // Trace navigation and route changes
        // Note: tracePropagationTargets removed in newer Sentry SDK versions
        // Propagation is handled automatically
      }),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
        // Mask sensitive input fields
        maskAllInputs: true,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Session Replay
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    // Filter out sensitive data before sending
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly testing
      if (
        import.meta.env.MODE === "development" &&
        !import.meta.env.VITE_SENTRY_DEBUG
      ) {
        return null;
      }

      // Remove sensitive data from request payloads
      if (event.request?.data) {
        const sensitiveKeys = [
          "password",
          "token",
          "apiKey",
          "secret",
          "authorization",
        ];
        const cleanData = (obj: any): any => {
          if (typeof obj !== "object" || obj === null) return obj;
          if (Array.isArray(obj)) return obj.map(cleanData);

          const cleaned: any = {};
          for (const [key, value] of Object.entries(obj)) {
            if (
              sensitiveKeys.some((sk) =>
                key.toLowerCase().includes(sk.toLowerCase())
              )
            ) {
              cleaned[key] = "[Filtered]";
            } else {
              cleaned[key] = cleanData(value);
            }
          }
          return cleaned;
        };
        event.request.data = cleanData(event.request.data);
      }

      return event;
    },
    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      "top.GLOBALS",
      "originalCreateNotification",
      "canvas.contentDocument",
      "MyApp_RemoveAllHighlights",
      "atomicFindClose",
      "fb_xd_fragment",
      "bmi_SafeAddOnload",
      "EBCallBackMessageReceived",
      "conduitPage",
      // Network errors that are expected (but we still want to track 429s)
      "NetworkError",
      "Failed to fetch",
      "Network request failed",
    ],
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
