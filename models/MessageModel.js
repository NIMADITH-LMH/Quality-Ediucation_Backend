import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User is required"]
  },

  name: {
      type: String,
      required: [true, "Please provide name"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

  subject: {
    type: String,
    required: [true, "Please provide subject"],
    trim: true,
    minlength: [3, "Subject must be at least 3 characters long"],
    maxlength: [100, "Subject cannot exceed 100 characters"]
  },

  message: {
    type: String,
    required: [true, "Please provide message"],
    trim: true,
    minlength: [10, "Message must be at least 10 characters long"],
    maxlength: [1000, "Message cannot exceed 1000 characters"]
  },

  // Original message as provided by the user
  originalMessage: {
    type: String,
    trim: true,
    maxlength: [1000, "Original message cannot exceed 1000 characters"]
  },

  // Translated message (always in English)
  translatedMessage: {
    type: String,
    trim: true,
    maxlength: [1000, "Translated message cannot exceed 1000 characters"]
  },

  // Flag to indicate if translation was performed
  requiresTranslation: {
    type: Boolean,
    default: false
  },

  // Sender ID (for external sender identification)
  senderId: {
    type: String,
    trim: true,
    maxlength: [100, "Sender ID cannot exceed 100 characters"]
  },

  image: {
    type: String,
    default: null,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow null/empty
        // Validate URL or file path format
        return /^(https?:\/\/.*|uploads\/.*\.(jpg|jpeg|png|gif|webp))$/i.test(v);
      },
      message: "Please provide a valid image URL or path"
    }
  },

  createdAt: {
    type: Date,
    default: Date.now,
    required: true
  }

},
{ timestamps: true}
);

export default mongoose.model("Message", messageSchema);
