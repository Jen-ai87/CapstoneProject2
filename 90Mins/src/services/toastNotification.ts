import { getErrorMessage } from './errorNotification';

export interface ToastOptions {
  duration?: number;
  position?: 'top' | 'middle' | 'bottom';
  color?: string;
}

// Store toast callback for later invocation from components
let toastCallback: ((message: string, color?: string, duration?: number) => void) | null = null;

/**
 * Register a toast callback from the App component
 * This allows services to trigger toasts without dependency injection
 */
export const registerToastCallback = (callback: (message: string, color?: string, duration?: number) => void) => {
  toastCallback = callback;
};

/**
 * Display an error toast notification to the user
 * @param error - The error or error code
 * @param defaultMessage - Optional fallback message
 * @param options - Toast options
 */
export const showErrorToast = (
  error: string | Error,
  defaultMessage?: string,
  options?: ToastOptions
) => {
  const message = typeof error === 'string'
    ? getErrorMessage(error) || defaultMessage || 'An error occurred'
    : getErrorMessage(error.message) || error.message || defaultMessage || 'An error occurred';

  if (toastCallback) {
    toastCallback(message, options?.color || 'danger', options?.duration || 4000);
  } else {
    console.error(message);
  }
};

/**
 * Display a success toast notification to the user
 * @param message - The success message
 * @param options - Toast options
 */
export const showSuccessToast = (message: string, options?: ToastOptions) => {
  if (toastCallback) {
    toastCallback(message, options?.color || 'success', options?.duration || 3000);
  } else {
    console.log(message);
  }
};

/**
 * Display an info toast notification to the user
 * @param message - The info message
 * @param options - Toast options
 */
export const showInfoToast = (message: string, options?: ToastOptions) => {
  if (toastCallback) {
    toastCallback(message, options?.color || 'primary', options?.duration || 3000);
  } else {
    console.log(message);
  }
};
