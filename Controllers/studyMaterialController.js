import StudyMaterial from "../models/StudyMaterialModel.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../errors/customErrors.js";

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

// GET /api/materials
// Public — any authenticated user can browse materials
export const getAllStudyMaterials = async (req, res) => {
  const { subject, grade, keyword } = req.query;

  // --- build filter object ---
  const filter = {};

  if (subject) {
    // stored lowercase; normalise the incoming value too
    filter.subject = subject.trim().toLowerCase();
  }

  if (grade) {
    filter.grade = grade.trim();
  }

  if (keyword) {
    // case-insensitive partial match on title
    filter.title = { $regex: keyword.trim(), $options: "i" };
  }

  // --- pagination ---
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  // run count and data queries in parallel for performance
  const [totalCount, materials] = await Promise.all([
    StudyMaterial.countDocuments(filter),
    StudyMaterial.find(filter)
      .populate("uploadedBy", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  res.status(StatusCodes.OK).json({
    totalCount,
    totalPages,
    currentPage: page,
    limit,
    materials,
  });
};

// GET /api/materials/:id
// Any authenticated user can fetch a single material
export const getSingleStudyMaterial = async (req, res) => {
  const { id } = req.params;

  const material = await StudyMaterial.findById(id).populate(
    "uploadedBy",
    "name email role",
  );

  if (!material) {
    throw new NotFoundError(`No study material found with id: ${id}`);
  }

  res.status(StatusCodes.OK).json({ material });
};

// PATCH /api/materials/:id
// Only the original uploader OR an admin may update
export const updateStudyMaterial = async (req, res) => {
  const { id } = req.params;

  // 1. Find the document first so we can check ownership
  const material = await StudyMaterial.findById(id);
  if (!material) {
    throw new NotFoundError(`No study material found with id: ${id}`);
  }

  // 2. Authorization check
  const requesterId = String(req.user._id || req.user.userId);
  const uploaderId  = String(material.uploadedBy);
  const isAdmin     = req.user.role === "admin";

  if (requesterId !== uploaderId && !isAdmin) {
    throw new UnauthorizedError(
      "You are not authorized to update this material",
    );
  }

  // 3. Build the update payload — only allow safe fields
  const { title, description, subject, grade, fileUrl, tags } = req.body || {};
  const updates = {};

  if (title       !== undefined) updates.title       = title.trim();
  if (description !== undefined) updates.description = description.trim();
  if (subject     !== undefined) updates.subject     = subject.trim().toLowerCase();
  if (grade       !== undefined) updates.grade       = grade.trim();
  if (fileUrl     !== undefined) updates.fileUrl     = fileUrl.trim();
  if (tags !== undefined && Array.isArray(tags)) {
    updates.tags = tags.map((t) => String(t).trim().toLowerCase());
  }

  if (Object.keys(updates).length === 0) {
    throw new BadRequestError("No valid fields provided for update");
  }

  // 4. Apply update — return the new document after update
  const updated = await StudyMaterial.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true },
  ).populate("uploadedBy", "name email role");

  res.status(StatusCodes.OK).json({ msg: "Study material updated", material: updated });
};

// DELETE /api/materials/:id
// Only the original uploader OR an admin may delete
export const deleteStudyMaterial = async (req, res) => {
  const { id } = req.params;

  // 1. Fetch document first to check ownership
  const material = await StudyMaterial.findById(id);
  if (!material) {
    throw new NotFoundError(`No study material found with id: ${id}`);
  }

  // 2. Authorization check
  const requesterId = String(req.user._id || req.user.userId);
  const uploaderId  = String(material.uploadedBy);
  const isAdmin     = req.user.role === "admin";

  if (requesterId !== uploaderId && !isAdmin) {
    throw new UnauthorizedError(
      "You are not authorized to delete this material",
    );
  }

  // 3. Delete
  await StudyMaterial.findByIdAndDelete(id);

  res.status(StatusCodes.OK).json({ msg: "Study material deleted successfully" });
};
