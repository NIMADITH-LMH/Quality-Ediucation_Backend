import StudyMaterial from "../Models/StudyMaterialModel.js";
import { NotFoundError, UnauthorizedError, BadRequestError } from "../errors/customErrors.js";

export const createMaterial = async (data, uploaderId) => {
  const materialData = {
    ...data,
    subject: data.subject.trim().toLowerCase(),
    uploadedBy: uploaderId,
  };

  if (data.tags && Array.isArray(data.tags)) {
    materialData.tags = data.tags.map((t) => String(t).trim().toLowerCase());
  }

  const material = await StudyMaterial.create(materialData);
  return material;
};

export const getAllMaterials = async (query) => {
  const { subject, grade, keyword, sort, page, limit } = query;

  const filter = {};
  if (subject) filter.subject = subject.trim().toLowerCase();
  if (grade) filter.grade = grade.trim();
  if (keyword) {
    // using text search index for better performance
    filter.$text = { $search: keyword.trim() };
  }

  const SORT_OPTIONS = {
    latest: { createdAt: -1 },
    subject: { subject: 1 },
  };
  const sortKey = sort && SORT_OPTIONS[sort] ? sort : "latest";
  const sortObj = SORT_OPTIONS[sortKey];

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  // Use .lean() for faster execution when returning read-only documents
  const [totalCount, materials] = await Promise.all([
    StudyMaterial.countDocuments(filter),
    StudyMaterial.find(filter)
      .lean()
      .populate("uploadedBy", "name email role")
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum),
  ]);

  return {
    totalCount,
    totalPages: Math.ceil(totalCount / limitNum),
    currentPage: pageNum,
    limit: limitNum,
    materials,
  };
};

export const getMaterialById = async (id) => {
  const material = await StudyMaterial.findById(id).lean().populate("uploadedBy", "name email role");
  if (!material) throw new NotFoundError(`No study material found with id: ${id}`);
  return material;
};

export const updateMaterial = async (id, updates, user) => {
  const material = await StudyMaterial.findById(id);
  if (!material) throw new NotFoundError(`No study material found with id: ${id}`);

  const requesterId = String(user._id || user.userId);
  const uploaderId = String(material.uploadedBy);
  const isAdmin = user.role === "admin";

  if (requesterId !== uploaderId && !isAdmin) {
    throw new UnauthorizedError("You are not authorized to update this material");
  }

  const filteredUpdates = { ...updates };
  if (filteredUpdates.subject) filteredUpdates.subject = filteredUpdates.subject.trim().toLowerCase();
  if (filteredUpdates.tags && Array.isArray(filteredUpdates.tags)) {
    filteredUpdates.tags = filteredUpdates.tags.map((t) => String(t).trim().toLowerCase());
  }

  const updatedMaterial = await StudyMaterial.findByIdAndUpdate(
    id,
    { $set: filteredUpdates },
    { new: true, runValidators: true }
  ).populate("uploadedBy", "name email role");

  return updatedMaterial;
};

export const deleteMaterial = async (id, user) => {
  const material = await StudyMaterial.findById(id);
  if (!material) throw new NotFoundError(`No study material found with id: ${id}`);

  const requesterId = String(user._id || user.userId);
  const uploaderId = String(material.uploadedBy);
  const isAdmin = user.role === "admin";

  if (requesterId !== uploaderId && !isAdmin) {
    throw new UnauthorizedError("You are not authorized to delete this material");
  }

  // If cloudinary was configured here, you would delete the file from cloudinary first using material.fileUrl

  await StudyMaterial.findByIdAndDelete(id);
  return material;
};
