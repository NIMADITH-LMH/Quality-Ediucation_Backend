/**
 * Centralized Error Handler Middleware
 * Must be defined LAST in middleware stack (after all routes)
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isDevelopment = process.env.NODE_ENV !== "production";

  // Log error details
  console.error(`[${new Date().toISOString()}] Error:`, {
    statusCode,
    name: err.name,
    message: err.message,
    path: req.path,
    method: req.method,
    ...(isDevelopment && { stack: err.stack }),
  });

  const errorResponse = {
    success: false,
    message: err.message || "Internal Server Error",
    statusCode,
    timestamp: new Date().toISOString(),
    ...(isDevelopment && {
      error: {
        name: err.name,
        stack: err.stack,
      },
    }),
  };

  // Mongoose validation error
  if (err.name === "ValidationError") {
    errorResponse.statusCode = 400;
    errorResponse.errors = Object.values(err.errors).map((e) => e.message);
  }

  // Mongoose cast error (invalid ID)
  if (err.name === "CastError") {
    errorResponse.statusCode = 400;
    errorResponse.message = `Invalid ID format: ${err.value}`;
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    errorResponse.statusCode = 400;
    errorResponse.message = `${field} already exists`;
  }

  res.status(errorResponse.statusCode).json(errorResponse);
};

export { errorHandler };
