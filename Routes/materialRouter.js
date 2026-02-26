import { Router } from "express";
import {
  createStudyMaterial,
  getAllStudyMaterials,
  getSingleStudyMaterial,
  updateStudyMaterial,
  deleteStudyMaterial,
} from "../Controllers/studyMaterialController.js";
import { protect, authorizePermissions } from "../Middleware/authMiddleware.js";
import {
  validateStudyMaterialInput,
  validateStudyMaterialUpdate,
} from "../Middleware/studyMaterialValidation.js";
import { uploadMaterial } from "../Middleware/uploadMiddleware.js";

const router = Router();

/**
 * @route   GET /api/materials
 * @access  Private
 * @desc    Get all materials with pagination, filtering, and search
 * @query   page, limit, subject, grade, keyword, sort, status
 */
router.get("/", protect, getAllStudyMaterials);

/**
 * @route   GET /api/materials/:id
 * @access  Private
 * @desc    Get a single material by ID (increments view count)
 */
router.get("/:id", protect, getSingleStudyMaterial);

/**
 * @route   POST /api/materials
 * @access  Private (Tutor/Admin only)
 * @desc    Create a new study material (file upload required)
 */
router.post(
  "/",
  protect,
  authorizePermissions("tutor", "admin"),
  uploadMaterial.single("file"),
  validateStudyMaterialInput,
  createStudyMaterial,
);

/**
 * @route   PATCH /api/materials/:id
 * @access  Private (Uploader/Admin only)
 * @desc    Update a study material (file upload optional)
 */
router.patch(
  "/:id",
  protect,
  uploadMaterial.single("file"),
  validateStudyMaterialUpdate,
  updateStudyMaterial,
);

/**
 * @route   DELETE /api/materials/:id
 * @access  Private (Uploader/Admin only)
 * @desc    Delete a study material and its associated file
 */
router.delete("/:id", protect, deleteStudyMaterial);

export default router;
