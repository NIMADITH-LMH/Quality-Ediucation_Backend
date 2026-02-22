import mongoose from "mongoose";

const studyMaterialSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a title"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters long"],
      maxlength: [150, "Title cannot exceed 150 characters"],
    },

    description: {
      type: String,
      required: [true, "Please provide a description"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters long"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },

    subject: {
      type: String,
      required: [true, "Please provide a subject"],
      trim: true,
      lowercase: true,
      maxlength: [50, "Subject cannot exceed 50 characters"],
    },

    grade: {
      type: String,
      required: [true, "Please provide a grade"],
      trim: true,
      maxlength: [20, "Grade cannot exceed 20 characters"],
    },

    fileUrl: {
      type: String,
      required: [true, "Please provide a file URL"],
      trim: true,
    },

    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: [30, "Tag cannot exceed 30 characters"],
      },
    ],

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// index subject and grade to speed up filtering queries
studyMaterialSchema.index({ subject: 1 });
studyMaterialSchema.index({ grade: 1 });

export default mongoose.model("StudyMaterial", studyMaterialSchema);
