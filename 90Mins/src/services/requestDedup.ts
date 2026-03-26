/**
 * Request Deduplication Service
 * Prevents duplicate API calls by caching in-flight requests
 * Returns the same promise if an identical request is already in progress
 */

import Logger from './logger';

const logger = new Logger('requestDedup');

// Map of request keys to in-flight promises
const inflightRequests = new Map<string, Promise<any>>();

/**
 * Generate a unique key for a request based on URL and parameters
 */
function generateRequestKey(url: string, params?: Record<string, any>): string {
  const cleanUrl = url.split('?')[0]; // Remove existing query params
  const sortedParams = params
    ? Object.keys(params)
        .sort()
        .map((k) => `${k}=${JSON.stringify(params[k])}`)
        .join('&')
    : '';
  return `${cleanUrl}#${sortedParams}`;
}

/**
 * Wrap a promise-returning function to deduplicate requests
 * If the same request is in-flight, returns the existing promise
 * Otherwise, executes the function and caches the promise
 *
 * @param url - The API endpoint URL
 * @param fetcher - Function that returns a promise
 * @param params - Optional parameters for generating the request key
 * @returns Promise with the result
 */
export async function deduplicateRequest<T>(
  url: string,
  fetcher: () => Promise<T>,
  params?: Record<string, any>
): Promise<T> {
  const key = generateRequestKey(url, params);

  // Check if request is already in-flight
  if (inflightRequests.has(key)) {
    logger.debug(`Returning cached promise for: ${key}`);
    return inflightRequests.get(key) as Promise<T>;
  }

  // Create new promise
  logger.debug(`Starting new request for: ${key}`);
  const promise = fetcher()
    .then((result) => {
      // Remove from cache on success
      inflightRequests.delete(key);
      return result;
    })
    .catch((error) => {
      // Remove from cache on error
      inflightRequests.delete(key);
      throw error;
    });

  // Cache the promise
  inflightRequests.set(key, promise);

  return promise;
}

/**
 * Clear a specific request from the cache
 * Useful for forced refreshes
 */
export function clearCachedRequest(url: string, params?: Record<string, any>): void {
  const key = generateRequestKey(url, params);
  const cleared = inflightRequests.delete(key);
  if (cleared) {
    logger.debug(`Cleared cached request: ${key}`);
  }
}

/**
 * Clear all cached requests
 * Useful for logging out or major state changes
 */
export function clearAllCachedRequests(): void {
  const count = inflightRequests.size;
  inflightRequests.clear();
  logger.debug(`Cleared all cached requests (${count} total)`);
}

/**
 * Get the number of inflight requests
 * Useful for debugging
 */
export function getInflightRequestCount(): number {
  return inflightRequests.size;
}
