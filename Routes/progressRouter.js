import express from "express";
import { protect } from "../Middleware/authMiddleware.js";
import {
  upsertProgress,
  getMyProgress,
  getProgressByStudent,
  getProgressByTutor,
} from "../Controllers/progressController.js";

const router = express.Router();

router.post("/", protect, upsertProgress);

router.get("/me", protect, getMyProgress);
router.get("/student/:studentId", protect, getProgressByStudent);
router.get("/tutor/:tutorId", protect, getProgressByTutor);

export default router;