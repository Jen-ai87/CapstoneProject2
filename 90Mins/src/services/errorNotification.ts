/**
 * Error Notification Service
 * Displays user-friendly error messages
 */

export interface ErrorNotification {
  id: string;
  message: string;
  code?: string;
  details?: string;
}

// Simple error message mapping
const errorMessages: Record<string, string> = {
  'FETCH_ERROR': 'Failed to load data. Please check your connection and try again.',
  'API_ERROR': 'API error. Please try again later.',
  'AUTH_ERROR': 'Authentication failed. Please sign in again.',
  'VALIDATION_ERROR': 'Invalid input. Please check your entries.',
  'NOT_FOUND': 'The requested item was not found.',
  'SERVER_ERROR': 'Server error. Please try again later.',
  'TIMEOUT': 'Request timed out. Please try again.',
  'NETWORK_ERROR': 'Network error. Please check your connection.',
};

export function getErrorMessage(code?: string, customMessage?: string): string {
  if (customMessage) return customMessage;
  if (code && errorMessages[code]) return errorMessages[code];
  return 'An error occurred. Please try again.';
}

export function createErrorNotification(
  message: string,
  code?: string,
  details?: string
): ErrorNotification {
  return {
    id: `error-${Date.now()}-${Math.random()}`,
    message,
    code,
    details,
  };
}
