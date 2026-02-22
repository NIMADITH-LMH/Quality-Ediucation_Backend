import TutoringSession from "../models/TutoringSessionModel.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, UnauthorizedError } from "../errors/customErrors.js";

/**
 * Create a new tutoring session
 * Only accessible to users with tutor or admin role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createTutoringSession = async (req, res) => {
  // Verify user role (tutor or admin)
  if (!["tutor", "admin"].includes(req.user.role)) {
    throw new UnauthorizedError("Only tutors and admins can create sessions");
  }

  const {
    subject,
    description,
    topic,
    schedule,
    location,
    capacity,
    level,
    tags,
    isRecurring,
    recurrencePattern,
    notes,
  } = req.body;

  // Validate required fields
  if (!subject || !description || !schedule) {
    throw new BadRequestError("Subject, description, and schedule are required");
  }

  if (!schedule.date || !schedule.startTime || !schedule.endTime) {
    throw new BadRequestError("Schedule must include date, startTime, and endTime");
  }

  if (!capacity || !capacity.maxParticipants) {
    throw new BadRequestError("Capacity with maxParticipants is required");
  }

  // Validate time format
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(schedule.startTime) || !timeRegex.test(schedule.endTime)) {
    throw new BadRequestError("Time format must be HH:MM (24-hour format)");
  }

  // Validate session date is in future
  const sessionDate = new Date(schedule.date);
  if (sessionDate <= new Date()) {
    throw new BadRequestError("Session date must be in the future");
  }

  // Validate capacity
  if (capacity.maxParticipants < 1 || capacity.maxParticipants > 100) {
    throw new BadRequestError("Capacity must be between 1 and 100");
  }

  // Create session object with tutor from authenticated user
  const sessionData = {
    tutor: req.user.userId, // Assign tutor from authenticated user
    subject: subject.trim().toLowerCase(),
    description: description.trim(),
    topic: topic ? topic.trim() : undefined,
    schedule: {
      date: sessionDate,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
    },
    location: location || { type: "online" },
    capacity: {
      ...capacity,
      currentEnrolled: 0,
    },
    level: level || "intermediate",
    tags: Array.isArray(tags)
      ? tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag)
      : [],
    isRecurring: Boolean(isRecurring),
    recurrencePattern: isRecurring ? recurrencePattern : undefined,
    notes: notes ? notes.trim() : undefined,
    isPublished: true,
  };

  // Create and save the session
  const session = await TutoringSession.create(sessionData);

  // Populate tutor details and return
  await session.populate("tutor", "fullName email role");

  res.status(StatusCodes.CREATED).json({
    msg: "Tutoring session created successfully",
    session,
  });
};

export default { createTutoringSession };
