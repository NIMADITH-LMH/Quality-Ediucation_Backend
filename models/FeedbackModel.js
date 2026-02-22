import mongoose from "mongoose";

const FeedbackSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Optional link to a tutoring session (you already have tutoringsessions collection)
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TutoringSession",
      default: null,
      index: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
  },
  { timestamps: true }
);

// One feedback per student+tutor+session (if session=null, it becomes one feedback total per student+tutor)
FeedbackSchema.index({ student: 1, tutor: 1, session: 1 }, { unique: true });

export default mongoose.model("Feedback", FeedbackSchema);