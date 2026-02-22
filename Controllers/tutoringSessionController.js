import TutoringSession from "../models/TutoringSessionModel.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../errors/customErrors.js";

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

/**
 * Fetch tutoring sessions (upcoming by default) with pagination.
 * Defaults to sessions whose schedule.date >= now.
 */
export const getAllTutoringSessions = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const now = new Date();
    const filter = { "schedule.date": { $gte: now } }; // upcoming by default

    if (req.query.tutor) filter.tutor = req.query.tutor;
    if (req.query.subject) filter.subject = { $regex: req.query.subject, $options: "i" };
    if (req.query.level) filter.level = req.query.level;
    if (req.query.status) filter.status = req.query.status;

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

export default { getAllTutoringSessions };
