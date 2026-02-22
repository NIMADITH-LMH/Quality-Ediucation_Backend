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
};

/**
 * Get all tutoring sessions
 * Returns upcoming sessions by default
 * Supports pagination, filtering, and sorting
 */
export const getAllTutoringSessions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = "scheduled",
      tutor,
      subject,
      level,
      includeCompleted = false,
      sortBy = "schedule.date",
      sortOrder = "asc",
    } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10)); // Max 100 per page

    // Skip validation
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter = {};

    // Default: return only upcoming/scheduled sessions
    if (includeCompleted === "false" || includeCompleted === false) {
      const now = new Date();

      // Filter for sessions that are scheduled and date is in future
      filter.$and = [
        { "schedule.date": { $gte: now } },
        { status: "scheduled" },
      ];
    } else if (String(includeCompleted).toLowerCase() === "true") {
      // Include all sessions (past and future)
      filter.$or = [
        { status: { $in: ["scheduled", "in-progress", "completed"] } },
      ];
    } else if (status && status !== "all") {
      // Filter by specific status if provided
      filter.status = status;
    }

    // Filter by tutor if provided
    if (tutor) {
      filter.tutor = tutor;
    }

    // Filter by subject (case-insensitive)
    if (subject) {
      filter.subject = { $regex: subject, $options: "i" };
    }

    // Filter by level if provided
    if (level && ["beginner", "intermediate", "advanced"].includes(level)) {
      filter.level = level;
    }

    // Validate sortBy parameter
    const validSortFields = [
      "schedule.date",
      "subject",
      "level",
      "createdAt",
      "capacity.maxParticipants",
      "-schedule.date",
    ];

    let sortField = "schedule.date";
    let order = 1; // 1 for ascending, -1 for descending

    if (sortBy && validSortFields.includes(sortBy)) {
      sortField = sortBy;
    }

    // Handle sort order
    if (sortOrder === "desc" || sortOrder === "-1") {
      order = -1;
    } else if (sortOrder === "asc" || sortOrder === "1") {
      order = 1;
    }

    const sortObj = { [sortField]: order };

    // Execute query with pagination
    const totalSessions = await TutoringSession.countDocuments(filter);

    const sessions = await TutoringSession.find(filter)
      .populate("tutor", "fullName email phoneNumber avatar")
      .populate("participants.userId", "fullName email avatar")
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean(); // Use lean() for better performance on read-only queries

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalSessions / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.status(StatusCodes.OK).json({
      msg: "Tutoring sessions retrieved successfully",
      sessions,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalSessions,
        sessionsPerPage: limitNum,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? pageNum + 1 : null,
        prevPage: hasPrevPage ? pageNum - 1 : null,
      },
    });
  } catch (error) {
    if (error.message.includes("Cast to")) {
      throw new BadRequestError("Invalid filter parameters");
    }

    throw error;
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
