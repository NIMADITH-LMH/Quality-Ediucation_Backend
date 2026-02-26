import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError } from "../errors/customErrors.js";
import * as studyMaterialService from "../Services/studyMaterialService.js";
import {
  paginatedResponse,
  successResponse,
} from "../utils/responseHandler.js";
import { validateObjectId } from "../utils/validationUtils.js";

/**
 * POST /api/materials
 * Upload a new study material (Tutor/Admin only)
 */
export const createStudyMaterial = async (req, res) => {
  if (!req.file) {
    throw new BadRequestError("Please upload a file (PDF, DOC, image, etc.)");
  }

  const uploaderId = req.user.userId || req.user._id;
  const materialData = {
    ...req.body,
    fileUrl: req.file.path, // Cloudinary secure URL
  };

  const material = await studyMaterialService.createMaterial(
    materialData,
    uploaderId,
  );

  res
    .status(StatusCodes.CREATED)
    .json(successResponse("Study material uploaded successfully", material));
};

/**
 * GET /api/materials
 * Get all study materials with pagination, filtering, and search
 * Query params: page, limit, subject, grade, keyword, sort
 */
export const getAllStudyMaterials = async (req, res) => {
  const result = await studyMaterialService.getAllMaterials(req.query);

  res.status(StatusCodes.OK).json(
    paginatedResponse("Materials retrieved successfully", result.materials, {
      totalCount: result.totalCount,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      limit: result.limit,
    }),
  );
};

/**
 * GET /api/materials/:id
 * Get a single study material by ID
 */
export const getSingleStudyMaterial = async (req, res) => {
  validateObjectId(req.params.id); // Validate MongoDB ObjectId

  const material = await studyMaterialService.getMaterialById(req.params.id);

  res
    .status(StatusCodes.OK)
    .json(successResponse("Material retrieved successfully", material));
};

/**
 * PATCH /api/materials/:id
 * Update a study material (uploader or admin only)
 */
export const updateStudyMaterial = async (req, res) => {
  validateObjectId(req.params.id); // Validate MongoDB ObjectId

  const updates = { ...req.body };

  // If a new file was uploaded, replace the URL
  if (req.file) {
    updates.fileUrl = req.file.path;
  }

  const updatedMaterial = await studyMaterialService.updateMaterial(
    req.params.id,
    updates,
    req.user,
  );

  res
    .status(StatusCodes.OK)
    .json(
      successResponse("Study material updated successfully", updatedMaterial),
    );
};

/**
 * DELETE /api/materials/:id
 * Delete a study material (uploader or admin only)
 */
export const deleteStudyMaterial = async (req, res) => {
  validateObjectId(req.params.id); // Validate MongoDB ObjectId

  await studyMaterialService.deleteMaterial(req.params.id, req.user);

  res
    .status(StatusCodes.OK)
    .json(successResponse("Study material deleted successfully"));
};
