import { body, validationResult } from "express-validator";
import { BadRequestError } from "../errors/customErrors.js";

// Helper to wrap validation chains with error handling
const withValidationError = (validateChain) => [
  ...validateChain,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msgs = errors.array().map((e) => e.msg);
      throw new BadRequestError(msgs.join(", "));
    }
    next();
  },
];

// Validate tutoring session creation
export const validateCreateSession = withValidationError([
  body("subject")
    .trim()
    .notEmpty()
    .withMessage("Subject is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Subject must be 3-50 characters"),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 10, max: 500 })
    .withMessage("Description must be 10-500 characters"),
  body("schedule.date")
    .notEmpty()
    .withMessage("Schedule date is required")
    .isISO8601()
    .withMessage("Invalid date format"),
  body("schedule.startTime")
    .notEmpty()
    .withMessage("Start time is required")
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Start time must be HH:MM (24-hour)"),
  body("schedule.endTime")
    .notEmpty()
    .withMessage("End time is required")
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("End time must be HH:MM (24-hour)"),
  body("capacity.maxParticipants")
    .notEmpty()
    .withMessage("Max participants is required")
    .isInt({ min: 1, max: 100 })
    .withMessage("Max participants must be 1-100"),
  body("level")
    .optional()
    .isIn(["beginner", "intermediate", "advanced"])
    .withMessage("Level must be beginner, intermediate, or advanced"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
]);

// Validate tutoring session update (all optional, only validate provided fields)
export const validateUpdateSession = withValidationError([
  body("subject")
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Subject must be 3-50 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Description must be 10-500 characters"),
  body("schedule.startTime")
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Start time must be HH:MM (24-hour)"),
  body("schedule.endTime")
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("End time must be HH:MM (24-hour)"),
  body("level")
    .optional()
    .isIn(["beginner", "intermediate", "advanced"])
    .withMessage("Level must be beginner, intermediate, or advanced"),
  body("status")
    .optional()
    .isIn(["scheduled", "in-progress", "completed", "cancelled"])
    .withMessage("Invalid status"),
]);
