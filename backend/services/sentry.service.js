const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

class SentryService {
  /**
   * Initialize Sentry monitoring
   */
  static init() {
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry disabled in development mode');
      return;
    }

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'production',
      
      // Performance monitoring
      tracesSampleRate: 0.1, // 10% of transactions
      profilesSampleRate: 0.1, // 10% of transactions for profiling
      
      integrations: [
        new ProfilingIntegration(),
        new Sentry.Integrations.Http(),
        new Sentry.Integrations.Express(),
      ],

      // Release tracking
      release: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',

      // Error filtering
      beforeSend(event, hint) {
        // Filter out development/testing errors
        if (event.exception) {
          const error = hint.originalException;
          
          // Skip common development errors
          if (error && error.message) {
            const message = error.message.toLowerCase();
            if (
              message.includes('econnrefused') ||
              message.includes('test') ||
              message.includes('development')
            ) {
              return null;
            }
          }
        }
        
        return event;
      },

      // User context
      initialScope: {
        tags: {
          component: 'lastminutestay-backend',
          service: 'hotel-booking',
        },
      },
    });

    console.log('Sentry monitoring initialized');
  }

  /**
   * Log booking error with context
   */
  static logBookingError(error, bookingData) {
    Sentry.withScope((scope) => {
      scope.setTag('operation', 'booking');
      scope.setContext('booking', {
        booking_id: bookingData?.id,
        user_id: bookingData?.user_id,
        hotel_id: bookingData?.hotel_id,
        total_price: bookingData?.total_price,
      });
      Sentry.captureException(error);
    });
  }

  /**
   * Log payment error with context
   */
  static logPaymentError(error, paymentData) {
    Sentry.withScope((scope) => {
      scope.setTag('operation', 'payment');
      scope.setContext('payment', {
        booking_id: paymentData?.booking_id,
        amount: paymentData?.amount,
        payment_intent_id: paymentData?.payment_intent_id,
        stripe_error_type: error?.type,
        stripe_error_code: error?.code,
      });
      Sentry.captureException(error);
    });
  }

  /**
   * Log email sending error
   */
  static logEmailError(error, emailData) {
    Sentry.withScope((scope) => {
      scope.setTag('operation', 'email');
      scope.setContext('email', {
        recipient: emailData?.recipient_email,
        email_type: emailData?.email_type,
        booking_id: emailData?.booking_id,
      });
      Sentry.captureException(error);
    });
  }

  /**
   * Log database error
   */
  static logDatabaseError(error, operation, table) {
    Sentry.withScope((scope) => {
      scope.setTag('operation', 'database');
      scope.setContext('database', {
        operation,
        table,
        error_code: error?.code,
        error_hint: error?.hint,
      });
      Sentry.captureException(error);
    });
  }

  /**
   * Log authentication error
   */
  static logAuthError(error, userId) {
    Sentry.withScope((scope) => {
      scope.setTag('operation', 'authentication');
      scope.setUser({
        id: userId,
      });
      Sentry.captureException(error);
    });
  }

  /**
   * Capture message with level
   */
  static captureMessage(message, level = 'info', extra = {}) {
    Sentry.withScope((scope) => {
      scope.setLevel(level);
      Object.keys(extra).forEach(key => {
        scope.setExtra(key, extra[key]);
      });
      Sentry.captureMessage(message);
    });
  }

  /**
   * Set user context for current request
   */
  static setUser(user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      ip_address: '{{auto}}',
    });
  }

  /**
   * Add breadcrumb for debugging
   */
  static addBreadcrumb(message, category, level = 'info', data = {}) {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: new Date().getTime() / 1000,
    });
  }

  /**
   * Start transaction for performance monitoring
   */
  static startTransaction(name, operation) {
    return Sentry.startTransaction({
      name,
      op: operation,
    });
  }

  /**
   * Express error handler middleware
   */
  static errorHandler() {
    return Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Only capture 4xx and 5xx errors
        return error.status >= 400;
      },
    });
  }

  /**
   * Express request handler middleware
   */
  static requestHandler() {
    return Sentry.Handlers.requestHandler({
      user: ['id', 'email'],
      request: ['method', 'url', 'headers'],
      serverName: false,
    });
  }

  /**
   * Express tracing handler
   */
  static tracingHandler() {
    return Sentry.Handlers.tracingHandler();
  }

  /**
   * Performance monitoring for database queries
   */
  static wrapDatabaseQuery(queryFn, queryName) {
    return async (...args) => {
      const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
      const span = transaction?.startChild({
        op: 'db.query',
        description: queryName,
      });

      try {
        const result = await queryFn(...args);
        span?.setStatus('ok');
        return result;
      } catch (error) {
        span?.setStatus('internal_error');
        this.logDatabaseError(error, queryName, 'unknown');
        throw error;
      } finally {
        span?.finish();
      }
    };
  }

  /**
   * Health check endpoint data
   */
  static getHealthData() {
    return {
      sentry: {
        enabled: !!process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        release: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
      },
    };
  }
}

module.exports = SentryService;