import StudyMaterial from "../models/StudyMaterialModel.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../errors/customErrors.js";

// POST /api/materials
// Only tutors and admins may upload
export const createStudyMaterial = async (req, res) => {
  const { title, description, subject, grade, fileUrl, tags } = req.body || {};

  // required fields
  if (!title || !description || !subject || !grade || !fileUrl) {
    throw new BadRequestError(
      "title, description, subject, grade and fileUrl are required",
    );
  }

  // attach uploader (protect adds full user, authenticateUser adds {userId})
  const uploaderId = req.user.userId || req.user._id;
  const materialData = {
    title: title.trim(),
    description: description.trim(),
    subject: subject.trim().toLowerCase(),
    grade: grade.trim(),
    fileUrl: fileUrl.trim(),
    uploadedBy: uploaderId,
  };
  if (tags && Array.isArray(tags)) {
    materialData.tags = tags.map((t) => String(t).trim().toLowerCase());
  }

  const material = await StudyMaterial.create(materialData);
  res
    .status(StatusCodes.CREATED)
    .json({ msg: "Study material uploaded", material });
};
