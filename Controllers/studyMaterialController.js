import { StatusCodes } from "http-status-codes";
import * as studyMaterialService from "../Services/studyMaterialService.js";

// POST /api/materials
// Only tutors and admins may upload
export const createStudyMaterial = async (req, res) => {
  const uploaderId = req.user.userId || req.user._id;
  
  const material = await studyMaterialService.createMaterial(req.body, uploaderId);
  
  res.status(StatusCodes.CREATED).json({ 
    success: true, 
    msg: "Study material uploaded", 
    data: material 
  });
};

// GET /api/materials
// Public — any authenticated user can browse materials
export const getAllStudyMaterials = async (req, res) => {
  const result = await studyMaterialService.getAllMaterials(req.query);

  res.status(StatusCodes.OK).json({ 
    success: true, 
    ...result 
  });
};

// GET /api/materials/:id
// Any authenticated user can fetch a single material
export const getSingleStudyMaterial = async (req, res) => {
  const material = await studyMaterialService.getMaterialById(req.params.id);

  res.status(StatusCodes.OK).json({ 
    success: true, 
    data: material 
  });
};

// PATCH /api/materials/:id
// Only the original uploader OR an admin may update
export const updateStudyMaterial = async (req, res) => {
  const updatedMaterial = await studyMaterialService.updateMaterial(req.params.id, req.body, req.user);

  res.status(StatusCodes.OK).json({ 
    success: true, 
    msg: "Study material updated", 
    data: updatedMaterial 
  });
};

// DELETE /api/materials/:id
// Only the original uploader OR an admin may delete
export const deleteStudyMaterial = async (req, res) => {
  await studyMaterialService.deleteMaterial(req.params.id, req.user);

  res.status(StatusCodes.OK).json({ 
    success: true, 
    msg: "Study material deleted successfully" 
  });
};
