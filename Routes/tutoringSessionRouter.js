import { Router } from "express";
import {
  createTutoringSession,
  getAllTutoringSessions,
  getTutoringSessionById,
  updateTutoringSession,
  deleteTutoringSession,
  joinTutoringSession,
  leaveTutoringSession,
  getMyEnrolledSessions,
  getTutoringSessionsByTutor,
} from "../Controllers/tutoringSessionController.js";
import { authenticateUser, authorizePermissions } from "../Middleware/authMiddleware.js";

const router = Router();

// Public routes
router.get("/", getAllTutoringSessions); // Filter by subject, grade, level via query params
router.get("/my-enrolled", authenticateUser, getMyEnrolledSessions);

router.get("/tutor/:tutorId", getTutoringSessionsByTutor);
router.get("/:id", getTutoringSessionById);

// Protected routes - Tutors & Admins only
router.post("/", authenticateUser, authorizePermissions("tutor", "admin"), createTutoringSession);
router.put("/:id", authenticateUser, authorizePermissions("tutor", "admin"), updateTutoringSession);
router.delete("/:id", authenticateUser, authorizePermissions("tutor", "admin"), deleteTutoringSession);

// Protected routes - All authenticated users
router.post("/:id/join", authenticateUser, joinTutoringSession);
router.post("/:id/leave", authenticateUser, leaveTutoringSession);




export default router;
