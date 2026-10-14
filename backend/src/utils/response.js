/**
 * Standard API Response Utilities
 */

export const sendSuccess = (res, data = {}, message = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendError = (res, message = 'Internal Server Error', code = 'INTERNAL_ERROR', statusCode = 500, details = null) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
  });
};
