import AppError from '../utils/AppError.js';

/**
 * Validates request parts with zod schemas. Parsed values land on req.valid
 * (Express 5 makes req.query read-only, so we don't overwrite the originals).
 */
export function validate(schemas) {
  return (req, _res, next) => {
    req.valid = {};
    for (const part of ['params', 'query', 'body']) {
      if (!schemas[part]) continue;
      const result = schemas[part].safeParse(req[part] ?? {});
      if (!result.success) {
        const details = result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }));
        const first = details[0];
        const message = first ? `${first.path ? `${first.path}: ` : ''}${first.message}` : 'Invalid request';
        throw new AppError(400, message, 'VALIDATION_ERROR', details);
      }
      req.valid[part] = result.data;
    }
    next();
  };
}
