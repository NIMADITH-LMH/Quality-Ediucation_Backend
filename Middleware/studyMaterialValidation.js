import { body, validationResult } from "express-validator";
import { BadRequestError } from "../errors/customErrors.js";

const withValidationErrors = (validateValues) => {
  return [
    validateValues,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((err) => err.msg);
        throw new BadRequestError(errorMessages.join(", "));
      }
      next();
    },
  ];
};

export const validateStudyMaterialInput = withValidationErrors([
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isString()
    .isLength({ min: 3, max: 150 })
    .withMessage("Title must be between 3 and 150 characters"),
  body("description")
    .notEmpty()
    .withMessage("Description is required")
    .isString()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters"),
  body("subject")
    .notEmpty()
    .withMessage("Subject is required")
    .isString()
    .isLength({ max: 50 })
    .withMessage("Subject cannot exceed 50 characters"),
  body("grade")
    .notEmpty()
    .withMessage("Grade is required")
    .isString()
    .isLength({ max: 20 })
    .withMessage("Grade cannot exceed 20 characters"),
  // fileUrl is NOT validated here — it comes from Multer/Cloudinary via req.file
  body("tags").optional().isArray().withMessage("Tags must be an array"),
]);

export const validateStudyMaterialUpdate = withValidationErrors([
  body("title")
    .optional()
    .isString()
    .isLength({ min: 3, max: 150 })
    .withMessage("Title must be between 3 and 150 characters"),
  body("description")
    .optional()
    .isString()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters"),
  body("subject")
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage("Subject cannot exceed 50 characters"),
  body("grade")
    .optional()
    .isString()
    .isLength({ max: 20 })
    .withMessage("Grade cannot exceed 20 characters"),
  // fileUrl comes from Multer/Cloudinary via req.file, not body
  body("tags").optional().isArray().withMessage("Tags must be an array"),
]);
