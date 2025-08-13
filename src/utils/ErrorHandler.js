import { Logger } from './Logger.js';

/**
 * Global error handler for the application
 */
export class ErrorHandler {
  static initialize() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      Logger.error('Unhandled promise rejection', event.reason, 'global');
      event.preventDefault();
    });

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      Logger.error('Uncaught error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      }, 'global');
    });
  }

  static handleAsyncError(promise, context = 'unknown') {
    return promise.catch(error => {
      Logger.error(`Async error in ${context}`, error, context);
      throw error;
    });
  }

  static wrapAsync(fn, context = 'unknown') {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        Logger.error(`Error in ${context}`, error, context);
        throw error;
      }
    };
  }
}