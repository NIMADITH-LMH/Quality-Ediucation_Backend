import mongoose from "mongoose";
import Progress from "../models/ProgressModel.js";

const STUDENT_ROLE = process.env.STUDENT_ROLE || "user";
const TUTOR_ROLE = process.env.TUTOR_ROLE || "organizer";

/**
 * POST /api/progress
 * Tutor updates a student's progress (or student updates their own)
 * body: { studentId, tutorId, sessionId?, topic?, completionPercent?, notes? }
 */
export const upsertProgress = async (req, res) => {
  try {
    const { studentId, tutorId, sessionId, topic, completionPercent, notes } = req.body;

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: "Valid studentId is required" });
    }
    if (!tutorId || !mongoose.Types.ObjectId.isValid(tutorId)) {
      return res.status(400).json({ message: "Valid tutorId is required" });
    }
    if (sessionId && !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: "Invalid sessionId" });
    }

    const isAdmin = req.user.role === "admin";
    const isTutor = req.user.role === TUTOR_ROLE;
    const isStudent = req.user.role === STUDENT_ROLE;

    // permissions
    if (!isAdmin) {
      if (isTutor && String(req.user._id) !== String(tutorId)) {
        return res.status(403).json({ message: "Tutor can update only their own students' progress" });
      }
      if (isStudent && String(req.user._id) !== String(studentId)) {
        return res.status(403).json({ message: "Student can update only their own progress" });
      }
      if (!isTutor && !isStudent) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    const percent =
      completionPercent === undefined ? undefined : Number(completionPercent);

    if (percent !== undefined && (Number.isNaN(percent) || percent < 0 || percent > 100)) {
      return res.status(400).json({ message: "completionPercent must be 0-100" });
    }

    // Upsert key:
    // if sessionId given => unique by student+tutor+session
    // else => unique by student+tutor+topic
    const key = sessionId
      ? { student: studentId, tutor: tutorId, session: sessionId }
      : { student: studentId, tutor: tutorId, topic: (topic || "").trim() };

    const update = {
      ...(sessionId ? { session: sessionId } : {}),
      ...(topic !== undefined ? { topic: (topic || "").trim() } : {}),
      ...(percent !== undefined ? { completionPercent: percent } : {}),
      ...(notes !== undefined ? { notes: (notes || "").trim() } : {}),
      updatedBy: req.user._id,
    };

    const doc = await Progress.findOneAndUpdate(key, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    return res.json({ message: "Progress saved", progress: doc });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * GET /api/progress/me
 * Student views own progress records
 */
export const getMyProgress = async (req, res) => {
  try {
    const list = await Progress.find({ student: req.user._id })
      .populate("tutor", "fullName email role")
      .sort({ updatedAt: -1 });

    return res.json({ count: list.length, progress: list });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * GET /api/progress/student/:studentId
 * Student/admin can view; tutor can only view records where they are tutor
 */
export const getProgressByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: "Invalid studentId" });
    }

    const isAdmin = req.user.role === "admin";
    const isTutor = req.user.role === TUTOR_ROLE;
    const isStudent = req.user.role === STUDENT_ROLE;

    if (isStudent && String(req.user._id) !== String(studentId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const query = { student: studentId };

    // tutor sees only their own student progress records
    if (!isAdmin && isTutor) {
      query.tutor = req.user._id;
    }

    const list = await Progress.find(query)
      .populate("tutor", "fullName email role")
      .sort({ updatedAt: -1 });

    return res.json({ count: list.length, progress: list });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * GET /api/progress/tutor/:tutorId
 * Tutor/admin views progress for their students
 */
export const getProgressByTutor = async (req, res) => {
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

    const list = await Progress.find({ tutor: tutorId })
      .populate("student", "fullName email role")
      .sort({ updatedAt: -1 });

    return res.json({ count: list.length, progress: list });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};