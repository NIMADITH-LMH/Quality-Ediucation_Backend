import StudyMaterial from "../Models/StudyMaterialModel.js";
import { NotFoundError, UnauthorizedError, BadRequestError } from "../errors/customErrors.js";
import { cloudinary } from "../Middleware/uploadMiddleware.js";

/**
 * Extract public_id from a Cloudinary URL.
 * Example URL: https://res.cloudinary.com/xxx/image/upload/v123/study_materials/abc123.pdf
 * Returns: "study_materials/abc123"
 */
const extractPublicId = (url) => {
  if (!url || !url.includes("cloudinary.com")) return null;
  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;
    // Remove version prefix (v123456789/) and file extension
    const pathAfterUpload = parts[1].replace(/^v\d+\//, "");
    const publicId = pathAfterUpload.replace(/\.[^/.]+$/, "");
    return publicId;
  } catch {
    return null;
  }
};

export const createMaterial = async (data, uploaderId) => {
  // Duplicate prevention: check if a material with the same title already exists
  // (case-insensitive match within the same subject)
  const normalizedTitle = data.title.trim();
  const normalizedSubject = data.subject.trim().toLowerCase();

  const existing = await StudyMaterial.findOne({
    title: { $regex: `^${normalizedTitle}$`, $options: "i" },
    subject: normalizedSubject,
  });

  if (existing) {
    throw new BadRequestError(
      `A material titled "${normalizedTitle}" already exists for subject "${normalizedSubject}"`
    );
  }

  const materialData = {
    ...data,
    subject: normalizedSubject,
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

  // If a new file is being uploaded, delete the old one from Cloudinary
  if (updates.fileUrl && material.fileUrl) {
    const oldPublicId = extractPublicId(material.fileUrl);
    if (oldPublicId) {
      try {
        await cloudinary.uploader.destroy(oldPublicId, { resource_type: "raw" });
      } catch (err) {
        console.error("Cloudinary old-file deletion error:", err.message);
      }
    }
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

  // Delete file from Cloudinary before removing the DB document
  const publicId = extractPublicId(material.fileUrl);
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
    } catch (err) {
      console.error("Cloudinary deletion error:", err.message);
    }
  }

  await StudyMaterial.findByIdAndDelete(id);
  return material;
};

