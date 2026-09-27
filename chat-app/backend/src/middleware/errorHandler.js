/**
 * Centralized error handler. Keeps error response shape consistent with the
 * rest of the API ({ success: false, message }) and never leaks internal
 * details (stack traces, raw driver errors) to the client, especially in
 * production.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
  const isProd = process.env.NODE_ENV === 'production';

  if (statusCode >= 500) {
    console.error('[error]', err);
  }

  const message =
    statusCode >= 500 && isProd
      ? 'Internal server error'
      : err.message || 'Something went wrong';

  res.status(statusCode).json({
    success: false,
    message,
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = { errorHandler, notFoundHandler };
