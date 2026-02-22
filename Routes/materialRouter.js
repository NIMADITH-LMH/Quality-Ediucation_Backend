import { Router } from "express";
import { createStudyMaterial } from "../Controllers/studyMaterialController.js";
import { protect, authorizePermissions } from "../Middleware/authMiddleware.js";

const router = Router();

// only tutors and admins can upload
router.post(
  "/",
  protect,
  authorizePermissions("tutor", "admin"),
  createStudyMaterial,
);

export default router;
