import { StatusCodes } from "http-status-codes";

/**
 * Centralized response handler for consistent API responses
 * Usage: res.status(200).json(successResponse("User created", user))
 */
export const successResponse = (message, data = null, meta = {}) => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    ...meta,
  };
};

/**
 * Centralized error response
 */
export const errorResponse = (
  message,
  statusCode = StatusCodes.INTERNAL_SERVER_ERROR,
  errors = null,
) => {
  return {
    success: false,
    message,
    statusCode,
    errors,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Pagination metadata response
 */
export const paginatedResponse = (message, data, pagination) => {
  return {
    success: true,
    message,
    data,
    pagination: {
      total: pagination.totalCount,
      pages: pagination.totalPages,
      current: pagination.currentPage,
      limit: pagination.limit,
      hasMore: pagination.currentPage < pagination.totalPages,
    },
    timestamp: new Date().toISOString(),
  };
};
