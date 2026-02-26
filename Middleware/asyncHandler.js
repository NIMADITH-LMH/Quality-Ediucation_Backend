/**
 * Async Error Wrapper
 * Wraps async functions to catch errors and pass to error handler middleware
 */
export const asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Alternative: Higher-order function for controllers
 */
export const tryCatch = (controller) => async (req, res, next) => {
  try {
    await controller(req, res, next);
  } catch (error) {
    next(error);
  }
};
