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
      enum: ["user", "admin", "organizer"],
      default: "user",
    },
    avatar: {
      type: String,
      default: "uploads/default-avatar.png", // Default avatar path
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
