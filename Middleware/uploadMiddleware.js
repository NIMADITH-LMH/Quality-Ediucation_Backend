import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { BadRequestError } from "../errors/customErrors.js";

// Cloudinary configuration (reads from .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Allowed MIME types for study materials
const ALLOWED_MATERIAL_MIMES = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "text/plain": "txt",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

/**
 * File filter for study materials
 * Validates MIME type before upload
 */
const materialFileFilter = (req, file, cb) => {
  const mimeType = file.mimetype.toLowerCase();

  if (ALLOWED_MATERIAL_MIMES[mimeType]) {
    cb(null, true);
  } else {
    cb(
      new BadRequestError(
        `File type not allowed. Allowed types: PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, PNG, GIF, WEBP`,
      ),
      false,
    );
  }
};

// Cloudinary storage for study materials
const materialStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "study_materials",
    resource_type: "auto",
    allowed_formats: [
      "pdf",
      "doc",
      "docx",
      "ppt",
      "pptx",
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "txt",
    ],
  },
});

/**
 * Multer instance for study material uploads
 * Validates file type and size
 */
export const uploadMaterial = multer({
  storage: materialStorage,
  fileFilter: materialFileFilter, // ✅ Added file type validation
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

// ---------------------
// Local-disk storage for other features (e.g. message images)
// ---------------------
import path from "path";
import fs from "fs";

const uploadsDir = "uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  if (
    allowed.test(path.extname(file.originalname).toLowerCase()) &&
    allowed.test(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(
      new BadRequestError(
        "Only image files (jpeg, jpg, png, gif, webp) are allowed",
      ),
      false,
    );
  }
};

const localUpload = multer({
  storage: localStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

// Middleware for single image upload (messages, etc.)
export const uploadMessageImage = (req, res, next) => {
  const singleUpload = localUpload.single("image");
  singleUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({
            success: false,
            msg: "File size too large. Maximum size is 5MB",
          });
      }
      return res
        .status(400)
        .json({ success: false, msg: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, msg: err.message });
    }
    next();
  });
};

export { cloudinary };
