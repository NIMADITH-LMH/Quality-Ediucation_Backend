import mongoose from "mongoose";

/**
 * Study Material Schema
 * Stores educational materials uploaded by tutors/admins
 * Can be filtered by subject, grade, and searched by title/description
 */
const studyMaterialSchema = new mongoose.Schema(
  {
    /**
     * Material title (indexed for search)
     */
    title: {
      type: String,
      required: [true, "Please provide a title"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters long"],
      maxlength: [150, "Title cannot exceed 150 characters"],
      index: true,
    },

    /**
     * Detailed description (indexed for text search)
     */
    description: {
      type: String,
      required: [true, "Please provide a description"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters long"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
      index: true,
    },

    /**
     * Subject (e.g., "Mathematics", "Physics", "History")
     */
    subject: {
      type: String,
      required: [true, "Please provide a subject"],
      trim: true,
      lowercase: true,
      maxlength: [50, "Subject cannot exceed 50 characters"],
      index: true, // Fast filtering by subject
    },

    /**
     * Grade level (e.g., "9th", "10th", "12th")
     */
    grade: {
      type: String,
      required: [true, "Please provide a grade"],
      trim: true,
      maxlength: [20, "Grade cannot exceed 20 characters"],
      index: true, // Fast filtering by grade
    },

    /**
     * File URL (from Cloudinary)
     */
    fileUrl: {
      type: String,
      required: [true, "Please provide a file URL"],
      trim: true,
      validate: {
        validator: (v) => /^https?:\/\/.+/.test(v),
        message: "File URL must be a valid HTTP/HTTPS URL",
      },
    },

    /**
     * Tags for better searchability
     */
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: [30, "Tag cannot exceed 30 characters"],
      },
    ],

    /**
     * User who uploaded this material (reference to User model)
     */
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Material must have an uploader"],
      index: true,
    },

    /**
     * Engagement metrics
     */
    metrics: {
      views: {
        type: Number,
        default: 0,
        min: 0,
      },
      downloads: {
        type: Number,
        default: 0,
        min: 0,
      },
      likes: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    /**
     * Status (active, archived, pending review)
     */
    status: {
      type: String,
      enum: ["active", "archived", "pending"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  },
);

/**
 * Indexes for optimal query performance
 */
// Text search indexes
studyMaterialSchema.index({ title: "text", description: "text", tags: "text" });

// Composite index for common filtering
studyMaterialSchema.index({ subject: 1, grade: 1 });

// Filtering by uploader
studyMaterialSchema.index({ uploadedBy: 1, createdAt: -1 });

/**
 * Virtual - Get uploader's name (populated when fetching)
 */
studyMaterialSchema.virtual("uploaderName").get(function () {
  if (this.uploadedBy && this.uploadedBy.fullName) {
    return this.uploadedBy.fullName;
  }
  return "Unknown User";
});

export default mongoose.model("StudyMaterial", studyMaterialSchema);
