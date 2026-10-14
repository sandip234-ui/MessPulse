import { sendError } from '../utils/response.js';

/**
 * Zod validation middleware generator
 * @param {import('zod').ZodSchema} schema - Zod validation schema
 * @param {'body' | 'query' | 'params'} source - Request property to validate
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return sendError(res, 'Validation Error', 'VALIDATION_ERROR', 400, details);
    }
    req[source] = result.data;
    next();
  };
};
