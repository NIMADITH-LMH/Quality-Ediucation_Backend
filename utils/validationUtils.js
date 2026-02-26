import mongoose from "mongoose";
import { BadRequestError } from "../errors/customErrors.js";

/**
 * Validate MongoDB ObjectId
 */
export const validateObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequestError(
      `Invalid ID format: "${id}" is not a valid MongoDB ObjectId`,
    );
  }
  return id;
};

/**
 * Validate multiple ObjectIds
 */
export const validateObjectIds = (ids) => {
  if (!Array.isArray(ids)) {
    throw new BadRequestError("IDs must be an array");
  }
  return ids.forEach((id) => validateObjectId(id));
};

/**
 * Sanitize MIME type to prevent injection
 */
export const sanitizeMimeType = (mimeType) => {
  if (!mimeType) return "";
  return mimeType.toLowerCase().trim().split(";")[0];
};

/**
 * Validate file extension against allowed types
 */
export const isFileTypeAllowed = (filename, allowedTypes) => {
  const ext = filename.split(".").pop().toLowerCase();
  return allowedTypes.includes(ext);
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sanitize user input to prevent NoSQL injection
 */
export const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;
  return input
    .replace(/[\$\{\}\\]/g, "") // Remove $ { } \ for selector injection
    .trim();
};
