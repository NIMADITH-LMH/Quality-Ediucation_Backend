import TutoringSession from "../models/TutoringSessionModel.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, UnauthorizedError } from "../errors/customErrors.js";
import mongoose from "mongoose";

// Create tutoring session - accessible to tutor/admin (router already enforces RBAC)
export const createTutoringSession = async (req, res) => {
  const { subject, description, schedule, capacity, topic, location, level, tags, notes } = req.body;

  if (!subject || !description || !schedule) throw new BadRequestError("subject, description and schedule are required");
  if (!schedule.date || !schedule.startTime || !schedule.endTime) throw new BadRequestError("schedule must include date, startTime and endTime");

  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(schedule.startTime) || !timeRegex.test(schedule.endTime)) throw new BadRequestError("Time must be in HH:MM format");

  const sessionDate = new Date(schedule.date);
  if (isNaN(sessionDate.getTime()) || sessionDate <= new Date()) throw new BadRequestError("Session date must be a valid future date");

  if (!capacity || typeof capacity.maxParticipants === "undefined") throw new BadRequestError("capacity.maxParticipants is required");
  const max = parseInt(capacity.maxParticipants, 10);
  if (Number.isNaN(max) || max < 1 || max > 100) throw new BadRequestError("capacity.maxParticipants must be between 1 and 100");

  const sessionData = {
    tutor: req.user.userId,
    subject: String(subject).trim().toLowerCase(),
    description: String(description).trim(),
    topic: topic ? String(topic).trim() : undefined,
    schedule: { date: sessionDate, startTime: schedule.startTime, endTime: schedule.endTime },
    location: location || { type: "online" },
    capacity: { maxParticipants: max, currentEnrolled: 0 },
    level: level || "intermediate",
    tags: Array.isArray(tags) ? tags.map(t => String(t).trim().toLowerCase()).filter(Boolean) : [],
    notes: notes ? String(notes).trim() : undefined,
    isPublished: true,
  };

  const session = await TutoringSession.create(sessionData);
  await session.populate("tutor", "fullName email role");
  return res.status(StatusCodes.CREATED).json({ msg: "Tutoring session created", session });
};

// Get all tutoring sessions
export const getAllTutoringSessions = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const now = new Date();
    let filter = { "schedule.date": { $gte: now } }; // upcoming by default

    if (req.query.tutor) filter.tutor = req.query.tutor;
    if (req.query.subject) filter.subject = { $regex: req.query.subject, $options: "i" };
    if (req.query.level) filter.level = req.query.level;
    if (req.query.status) filter.status = req.query.status;

    // Safe regex escape
    const escapeRegex = (s = "") => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (req.query.grade) {
      const g = req.query.grade;
      const gradeNum = Number(g);
      const gradeOr = [ { level: { $regex: `^${escapeRegex(g)}$`, $options: "i" } } ];
      if (!Number.isNaN(gradeNum)) gradeOr.push({ grade: gradeNum }); else gradeOr.push({ grade: g });
      filter = { $and: [filter, { $or: gradeOr }] };
    }

    const [total, sessions] = await Promise.all([
      TutoringSession.countDocuments(filter),
      TutoringSession.find(filter)
        .populate("tutor", "fullName email role")
        .populate("participants.userId", "fullName email")
        .sort({ "schedule.date": 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.status(StatusCodes.OK).json({
      msg: "Tutoring sessions retrieved",
      sessions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    if (err.message && err.message.includes("Cast to")) throw new BadRequestError("Invalid query parameter");
    throw err;
  }
};

// Join a tutoring session (authenticated users)
export const joinTutoringSession = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new BadRequestError("Invalid session id");
  if (!req.user) throw new UnauthorizedError("Authentication required");

  const session = await TutoringSession.findById(id);
  if (!session) return res.status(StatusCodes.NOT_FOUND).json({ msg: "Session not found" });

  try {
    await session.addParticipant(req.user.userId);
    return res.status(StatusCodes.OK).json({ msg: "Joined session", currentEnrolled: session.capacity.currentEnrolled });
  } catch (err) {
    throw new BadRequestError(err.message);
  }
};

// Leave a tutoring session (authenticated users)
export const leaveTutoringSession = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new BadRequestError("Invalid session id");
  if (!req.user) throw new UnauthorizedError("Authentication required");

  const session = await TutoringSession.findById(id);
  if (!session) return res.status(StatusCodes.NOT_FOUND).json({ msg: "Session not found" });

  try {
    await session.removeParticipant(req.user.userId);
    return res.status(StatusCodes.OK).json({ msg: "Left session", currentEnrolled: session.capacity.currentEnrolled });
  } catch (err) {
    throw new BadRequestError(err.message);
  }
};