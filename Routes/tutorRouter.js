import { Router } from "express";
import {
  getAllTutors,
  getTutorsBySubject,
  getAvailableSubjects,
  getTutorById,
} from "../Controllers/tutorController.js";
import { authenticateUser, authorizePermissions } from "../Middleware/authMiddleware.js";

const router = Router();

// Get all available subjects (public for testing)
router.get("/subjects", getAvailableSubjects);

// Get all tutors with optional filters (public for testing)
router.get("/", getAllTutors);

// Protected routes below (require authentication)
router.use(authenticateUser);
router.use(authorizePermissions("user", "admin", "tutor"));

// Get tutors by subject
router.get("/subject/:subject", getTutorsBySubject);

// Get tutor by ID
router.get("/:id", getTutorById);

export default router;
