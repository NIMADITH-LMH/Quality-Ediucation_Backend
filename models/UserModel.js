import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Please provide full name"],
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Please provide email"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      minlength: 6,
    },
    phoneNumber: {
      type: String,
      required: [true, "Please provide phone number"],
      match: [/^[0-9]{10}$/, "Please provide a valid 10-digit phone number"],
    },
    location: {
      type: String,
      required: [true, "Please provide location"],
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "admin", "organizer", "tutor"],
      default: "user",
    },
    avatar: {
      type: String,
      default: "uploads/default-avatar.png", // Default avatar path
    },
    // Tutor-specific fields
    tutorProfile: {
      subjects: [{
        type: String,
        trim: true,
        lowercase: true,
      }],
      bio: {
        type: String,
        trim: true,
        maxlength: [500, "Bio cannot exceed 500 characters"],
      },
      experience: {
        type: Number,
        min: [0, "Experience cannot be negative"],
        max: [50, "Experience cannot exceed 50 years"],
      },
      qualifications: [{
        degree: String,
        institution: String,
        year: Number,
      }],
      specializations: [{
        type: String,
        trim: true,
      }],
      rating: {
        average: {
          type: Number,
          default: 0,
          min: 0,
          max: 5,
        },
        count: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
      hourlyRate: {
        type: Number,
        min: [0, "Hourly rate cannot be negative"],
      },
      availability: {
        type: String,
        enum: ["available", "busy", "unavailable"],
        default: "available",
      },
      languages: [{
        type: String,
        trim: true,
      }],
      sessionCount: {
        type: Number,
        default: 0,
        min: 0,
      },
      isVerified: {
        type: Boolean,
        default: false,
      },
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpiry: {
      type: Date,
    },
  },
  { timestamps: true } //createdAt: Set when the document is first created, updatedAt: Update whenever the document is modified 
);

// Remove password from JSON responses
UserSchema.methods.toJSON = function () {
  let obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpiry;
  return obj;
};// automatically removes sensitive data whenever a user document is converted to JSON (e.g., when sending API responses).

export default mongoose.model("User", UserSchema);
