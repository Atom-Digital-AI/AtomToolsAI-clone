import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';

/**
 * Create an axios client with retry logic for external API calls
 * Handles transient failures gracefully
 */
export function createRetryClient(): AxiosInstance {
  const client = axios.create({
    timeout: 30000, // 30 seconds
  });

  axiosRetry(client, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
      // Retry on network errors, timeouts, and specific HTTP status codes
      return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
             error.response?.status === 429 || // Rate limit
             error.response?.status === 503 || // Service unavailable
             error.response?.status === 504;   // Gateway timeout
    },
    onRetry: (retryCount, error, requestConfig) => {
      console.log(`[API Retry] Attempt ${retryCount} for ${requestConfig.url}: ${error.message}`);
    },
  });

  return client;
}

// Export singleton instance
export const retryClient = createRetryClient();
