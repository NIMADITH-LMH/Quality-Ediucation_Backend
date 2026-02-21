import mongoose from "mongoose";
import Feedback from "../models/FeedbackModel.js";
import User from "../models/UserModel.js";

const STUDENT_ROLE = process.env.STUDENT_ROLE || "user";
const TUTOR_ROLE = process.env.TUTOR_ROLE || "organizer";

/**
 * POST /api/feedbacks
 * student submits or updates feedback (rating+message) for a tutor
 * body: { tutorId, rating, message, sessionId? }
 */
export const submitFeedback = async (req, res) => {
  try {
    // only student/admin can submit
    if (req.user.role !== STUDENT_ROLE && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only students can submit feedback" });
    }

    const { tutorId, rating, message, sessionId } = req.body;

    if (!tutorId || !mongoose.Types.ObjectId.isValid(tutorId)) {
      return res.status(400).json({ message: "Valid tutorId is required" });
    }

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: "rating must be between 1 and 5" });
    }

    if (sessionId && !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: "Invalid sessionId" });
    }

    const tutor = await User.findById(tutorId).select("_id role fullName email");
    if (!tutor) return res.status(404).json({ message: "Tutor not found" });

    // enforce "tutor" role if you want strictness:
    if (tutor.role !== TUTOR_ROLE && tutor.role !== "admin") {
      return res.status(400).json({ message: "Target user is not a tutor" });
    }

    const payload = {
      student: req.user._id,
      tutor: tutorId,
      session: sessionId || null,
      rating: numRating,
      message: (message || "").trim(),
    };

    // If duplicate exists, update it (because unique index)
    const saved = await Feedback.findOneAndUpdate(
      { student: req.user._id, tutor: tutorId, session: sessionId || null },
      payload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({ message: "Feedback saved", feedback: saved });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * GET /api/feedbacks/me
 * student sees their own submitted feedbacks
 */
export const getMyFeedbacks = async (req, res) => {
  try {
    const list = await Feedback.find({ student: req.user._id })
      .populate("tutor", "fullName email role")
      .sort({ createdAt: -1 });

    return res.json({ count: list.length, feedbacks: list });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * GET /api/feedbacks/tutor/:tutorId
 * tutor/admin can view feedback messages list for a tutor
 */
export const getTutorFeedbacks = async (req, res) => {
  try {
    const { tutorId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(tutorId)) {
      return res.status(400).json({ message: "Invalid tutorId" });
    }

    const isAdmin = req.user.role === "admin";
    const isTutorSelf = req.user.role === TUTOR_ROLE && String(req.user._id) === String(tutorId);

    if (!isAdmin && !isTutorSelf) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const feedbacks = await Feedback.find({ tutor: tutorId })
      .populate("student", "fullName email role")
      .sort({ createdAt: -1 });

    return res.json({ count: feedbacks.length, feedbacks });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * GET /api/feedbacks/tutor/:tutorId/ratings
 * anyone logged in can view rating stats (avg + breakdown)
 */
export const getTutorRatingStats = async (req, res) => {
  try {
    const { tutorId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(tutorId)) {
      return res.status(400).json({ message: "Invalid tutorId" });
    }

    const stats = await Feedback.aggregate([
      { $match: { tutor: new mongoose.Types.ObjectId(tutorId) } },
      {
        $group: {
          _id: "$tutor",
          avgRating: { $avg: "$rating" },
          totalRatings: { $sum: 1 },
          r1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
          r2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          r3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          r4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          r5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          tutorId: "$_id",
          avgRating: { $round: ["$avgRating", 2] },
          totalRatings: 1,
          breakdown: {
            1: "$r1",
            2: "$r2",
            3: "$r3",
            4: "$r4",
            5: "$r5",
          },
        },
      },
    ]);

    return res.json(
      stats[0] || {
        tutorId,
        avgRating: 0,
        totalRatings: 0,
        breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      }
    );
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * DELETE /api/feedbacks/:id
 * student deletes own feedback, admin deletes any
 */
export const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid feedback id" });
    }

    const feedback = await Feedback.findById(id);
    if (!feedback) return res.status(404).json({ message: "Feedback not found" });

    const isAdmin = req.user.role === "admin";
    const isOwner = String(feedback.student) === String(req.user._id);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await Feedback.deleteOne({ _id: id });
    return res.json({ message: "Feedback deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};