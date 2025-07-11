const SentryService = require('../services/sentry.service');

/**
 * Initialize Sentry monitoring middleware
 */
const initSentry = (app) => {
  // Initialize Sentry
  SentryService.init();

  // Request handler (must be first middleware)
  app.use(SentryService.requestHandler());

  // Tracing handler (must be after request handler)
  app.use(SentryService.tracingHandler());

  console.log('Sentry middleware initialized');
};

/**
 * Sentry error handler (must be last middleware)
 */
const errorHandler = () => {
  return SentryService.errorHandler();
};

/**
 * Add user context to Sentry
 */
const addUserContext = (req, res, next) => {
  if (req.user) {
    SentryService.setUser(req.user);
  }
  next();
};

/**
 * Add breadcrumb for API calls
 */
const addApiBreadcrumb = (req, res, next) => {
  SentryService.addBreadcrumb(
    `${req.method} ${req.path}`,
    'http',
    'info',
    {
      method: req.method,
      path: req.path,
      query: req.query,
      user_id: req.user?.id,
    }
  );
  next();
};

module.exports = {
  initSentry,
  errorHandler,
  addUserContext,
  addApiBreadcrumb,
};