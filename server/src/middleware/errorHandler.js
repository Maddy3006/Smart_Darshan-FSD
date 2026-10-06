import env from '../config/env.js';
import AppError from '../utils/AppError.js';

export function notFound(req, _res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = 500;
  let message = 'Something went wrong. Please try again.';
  let code = 'INTERNAL_ERROR';
  let details;

  if (err instanceof AppError) {
    ({ status, message, code, details } = err);
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}`;
    code = 'INVALID_ID';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors)[0]?.message || 'Invalid data';
    code = 'VALIDATION_ERROR';
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    message = `That ${field} is already in use`;
    code = 'DUPLICATE';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON body';
    code = 'BAD_JSON';
  } else {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }

  res.status(status).json({
    error: { message, code, details, ...(env.isProduction || status < 500 ? {} : { stack: err.stack }) },
  });
}
