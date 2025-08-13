/**
 * Logger utility for environment-aware logging
 */
export class Logger {
  static isDevelopment = import.meta.env?.DEV || process.env.NODE_ENV === 'development';
  static isProduction = import.meta.env?.PROD || process.env.NODE_ENV === 'production';

  static log(message, ...args) {
    if (this.isDevelopment) {
      console.log(`[LOG] ${message}`, ...args);
    }
  }

  static info(message, ...args) {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  static warn(message, ...args) {
    console.warn(`[WARN] ${message}`, ...args);
  }

  static error(message, error = null, context = null) {
    const errorInfo = {
      message,
      timestamp: new Date().toISOString(),
      context
    };

    if (error) {
      errorInfo.error = {
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined
      };
    }

    console.error(`[ERROR] ${message}`, errorInfo);
  }

  static debug(message, ...args) {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  static group(label, callback) {
    if (this.isDevelopment) {
      console.group(label);
      try {
        callback();
      } finally {
        console.groupEnd();
      }
    } else {
      callback();
    }
  }

  static time(label) {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  static timeEnd(label) {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }
}