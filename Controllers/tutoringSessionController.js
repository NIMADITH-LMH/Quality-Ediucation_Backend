import TutoringSession from "../models/TutoringSessionModel.js";
import User from "../models/UserModel.js";
import { StatusCodes } from "http-status-codes";
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
} from "../errors/customErrors.js";

/**
 * Create a new tutoring session
 * Only accessible to tutors and admins
 * If admin creates, they can specify tutor; if tutor creates, they are the tutor
 */
export const createTutoringSession = async (req, res) => {
  try {
    // Check if user is tutor or admin
    if (!["tutor", "admin"].includes(req.user.role)) {
      throw new UnauthorizedError(
        "Only tutors and admins can create tutoring sessions"
      );
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
      tutor: providedTutor,
    } = req.body;

    // Validate required fields
    if (!subject || !description || !schedule || !capacity) {
      throw new BadRequestError(
        "Please provide subject, description, schedule, and capacity"
      );
    }

    // Validate schedule
    if (!schedule.date || !schedule.startTime || !schedule.endTime) {
      throw new BadRequestError(
        "Please provide schedule with date, startTime, and endTime"
      );
    }

    // Validate capacity
    if (
      !capacity.maxParticipants ||
      capacity.maxParticipants < 1 ||
      capacity.maxParticipants > 100
    ) {
      throw new BadRequestError(
        "Please provide capacity with maxParticipants between 1 and 100"
      );
    }

    // Determine tutor
    let tutorId = req.user.userId;

    // If admin provides a tutor, verify the tutor exists and has tutor role
    if (req.user.role === "admin" && providedTutor) {
      const tutorUser = await User.findById(providedTutor);

      if (!tutorUser) {
        throw new NotFoundError("Tutor not found");
      }

      if (tutorUser.role !== "tutor") {
        throw new BadRequestError("Provided user does not have tutor role");
      }

      tutorId = providedTutor;
    }

    // Verify the tutor exists and has tutor role
    const tutorUser = await User.findById(tutorId);
    if (!tutorUser || tutorUser.role !== "tutor") {
      throw new BadRequestError("Invalid tutor assignment");
    }

    // Parse and validate schedule date
    const sessionDate = new Date(schedule.date);
    if (isNaN(sessionDate.getTime())) {
      throw new BadRequestError("Invalid schedule date format");
    }

    if (sessionDate <= new Date()) {
      throw new BadRequestError("Session date must be in the future");
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(schedule.startTime) || !timeRegex.test(schedule.endTime)) {
      throw new BadRequestError(
        "Start time and end time must be in HH:MM format (00:00 to 23:59)"
      );
    }

    // Validate end time is after start time
    const [startHour, startMinute] = schedule.startTime.split(":").map(Number);
    const [endHour, endMinute] = schedule.endTime.split(":").map(Number);

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    if (endTotalMinutes <= startTotalMinutes) {
      throw new BadRequestError("End time must be after start time");
    }

    // Validate recurring pattern if recurring
    if (isRecurring && recurrencePattern) {
      if (!["daily", "weekly", "biweekly", "monthly"].includes(recurrencePattern.frequency)) {
        throw new BadRequestError(
          "Invalid recurrence frequency. Must be daily, weekly, biweekly, or monthly"
        );
      }

      if (recurrencePattern.endDate) {
        const recurEndDate = new Date(recurrencePattern.endDate);
        if (recurEndDate <= sessionDate) {
          throw new BadRequestError("Recurrence end date must be after session date");
        }
      }
    }

    // Validate location if provided
    if (location && !["online", "offline", "hybrid"].includes(location.type)) {
      throw new BadRequestError(
        "Location type must be online, offline, or hybrid"
      );
    }

    // Validate level if provided
    if (level && !["beginner", "intermediate", "advanced"].includes(level)) {
      throw new BadRequestError(
        "Level must be beginner, intermediate, or advanced"
      );
    }

    // Create the tutoring session
    const sessionData = {
      tutor: tutorId,
      subject,
      description,
      ...(topic && { topic }),
      schedule: {
        date: sessionDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      },
      location: location || { type: "online" },
      capacity: {
        maxParticipants: capacity.maxParticipants,
        currentEnrolled: 0,
      },
      ...(level && { level }),
      ...(tags && Array.isArray(tags) && { tags: tags.map((tag) => tag.toLowerCase().trim()) }),
      ...(isRecurring && { isRecurring, recurrencePattern }),
      ...(notes && { notes }),
    };

    const tutoringSession = await TutoringSession.create(sessionData);

    // Populate tutor info in response
    await tutoringSession.populate("tutor", "fullName email phoneNumber");

    res.status(StatusCodes.CREATED).json({
      msg: "Tutoring session created successfully",
      session: tutoringSession,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const errorMessages = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
      throw new BadRequestError(errorMessages);
    }

    if (error.name === "CastError") {
      throw new BadRequestError("Invalid ID format");
    }

    throw error;
  }
};

/**
 * Get all tutoring sessions
 * Returns upcoming sessions by default
 * Supports pagination, filtering by subject/grade/level, and sorting
 * Query parameters:
 *   - page, limit: pagination
 *   - subject: filter by subject (supports partial match, case-insensitive)
 *   - grade or level: filter by difficulty level (beginner, intermediate, advanced)
 *   - tag: filter by tags
 *   - locationType: filter by location type (online, offline, hybrid)
 *   - availableSeatsOnly: show only sessions with available seats
 *   - tutor: filter by tutor ID
 *   - status: filter by status
 *   - includeCompleted: include past sessions
 *   - sortBy: field to sort by
 *   - sortOrder: asc or desc
 */
export const getAllTutoringSessions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = "scheduled",
      tutor,
      subject,
      grade,
      level,
      tag,
      locationType,
      availableSeatsOnly = false,
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

    /**
     * Enhanced Subject Filtering
     * - Supports case-insensitive partial matching
     * - Can filter by exact subject name
     */
    if (subject) {
      // Support multiple subjects separated by comma
      const subjects = subject.split(",").map((s) => s.trim());

      if (subjects.length === 1) {
        // Single subject: case-insensitive regex match
        filter.subject = { $regex: subjects[0], $options: "i" };
      } else {
        // Multiple subjects: match any of them
        filter.subject = {
          $in: subjects.map((s) => new RegExp(s, "i")),
        };
      }
    }

    /**
     * Enhanced Grade/Level Filtering
     * - Support both 'grade' and 'level' query parameters
     * - 'grade' parameter is an alias for 'level'
     * - Supports multiple levels separated by comma
     */
    const levelParam = level || grade;
    if (levelParam) {
      const validLevels = ["beginner", "intermediate", "advanced"];

      // Support multiple levels separated by comma
      const levels = levelParam
        .split(",")
        .map((l) => l.trim().toLowerCase())
        .filter((l) => validLevels.includes(l));

      if (levels.length === 1) {
        filter.level = levels[0];
      } else if (levels.length > 1) {
        filter.level = { $in: levels };
      }
    }

    /**
     * Filter by tags
     * - Supports partial tag matching
     * - Case-insensitive
     */
    if (tag) {
      const tags = tag.split(",").map((t) => t.trim().toLowerCase());

      if (tags.length === 1) {
        filter.tags = { $regex: tags[0], $options: "i" };
      } else {
        // Match sessions with any of the specified tags
        filter.tags = {
          $in: tags.map((t) => new RegExp(t, "i")),
        };
      }
    }

    /**
     * Filter by location type
     * - online, offline, or hybrid
     */
    if (locationType) {
      const validLocations = ["online", "offline", "hybrid"];
      if (validLocations.includes(locationType.toLowerCase())) {
        filter["location.type"] = locationType.toLowerCase();
      }
    }

    /**
     * Show only sessions with available seats
     */
    if (availableSeatsOnly === "true" || availableSeatsOnly === true) {
      filter.$expr = {
        $lt: ["$capacity.currentEnrolled", "$capacity.maxParticipants"],
      };
    }

    // Validate sortBy parameter
    const validSortFields = [
      "schedule.date",
      "subject",
      "level",
      "createdAt",
      "capacity.maxParticipants",
      "capacity.currentEnrolled",
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

    // Enrich sessions with additional metadata
    const enrichedSessions = sessions.map((session) => ({
      ...session,
      availableSeats: session.capacity.maxParticipants - session.capacity.currentEnrolled,
      isFull: session.capacity.currentEnrolled >= session.capacity.maxParticipants,
      enrollmentPercentage: Math.round(
        (session.capacity.currentEnrolled / session.capacity.maxParticipants) * 100
      ),
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalSessions / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.status(StatusCodes.OK).json({
      msg: "Tutoring sessions retrieved successfully",
      sessions: enrichedSessions,
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
};

/**
 * Get tutoring sessions for a specific tutor
 * Returns upcoming sessions by default
 */
export const getTutorSessions = async (req, res) => {
  try {
    const { tutorId } = req.params;
    const {
      page = 1,
      limit = 10,
      includeCompleted = false,
      sortBy = "schedule.date",
      sortOrder = "asc",
    } = req.query;

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Build filter for specific tutor
    const filter = { tutor: tutorId };

    // Default: upcoming sessions only
    if (includeCompleted === "false" || includeCompleted === false) {
      const now = new Date();
      filter.$and = [
        { "schedule.date": { $gte: now } },
        { status: "scheduled" },
      ];
    } else if (String(includeCompleted).toLowerCase() === "true") {
      filter.status = {
        $in: ["scheduled", "in-progress", "completed"],
      };
    }

    // Handle sorting
    let sortField = "schedule.date";
    let order = 1;

    if (sortBy === "schedule.date" || sortBy === "-schedule.date") {
      sortField = "schedule.date";
    } else if (sortBy === "capacity.maxParticipants") {
      sortField = "capacity.maxParticipants";
    } else if (sortBy === "createdAt") {
      sortField = "createdAt";
    }

    if (sortOrder === "desc" || sortOrder === "-1") {
      order = -1;
    }

    const sortObj = { [sortField]: order };

    // Execute query
    const totalSessions = await TutoringSession.countDocuments(filter);

    const sessions = await TutoringSession.find(filter)
      .populate("tutor", "fullName email phoneNumber avatar")
      .populate("participants.userId", "fullName email avatar")
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Pagination metadata
    const totalPages = Math.ceil(totalSessions / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.status(StatusCodes.OK).json({
      msg: `Sessions for tutor retrieved successfully`,
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
      throw new BadRequestError("Invalid tutor ID");
    }

    throw error;
  }
};

/**
 * Get enrolled sessions for the current user
 */
export const getMyEnrolledSessions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      page = 1,
      limit = 10,
      pastSessions = false,
      sortBy = "schedule.date",
      sortOrder = "asc",
    } = req.query;

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    const now = new Date();

    // Filter for sessions the user is enrolled in
    const filter = {
      "participants.userId": userId,
    };

    // Default: upcoming sessions only
    if (pastSessions === "false" || pastSessions === false) {
      filter["schedule.date"] = { $gte: now };
    } else if (String(pastSessions).toLowerCase() === "true") {
      filter["schedule.date"] = { $lt: now };
    }

    // Handle sorting
    let sortField = "schedule.date";
    let order = 1;

    if (sortBy === "schedule.date" || sortBy === "-schedule.date") {
      sortField = "schedule.date";
    } else if (sortBy === "subject") {
      sortField = "subject";
    } else if (sortBy === "createdAt") {
      sortField = "createdAt";
    }

    if (sortOrder === "desc" || sortOrder === "-1") {
      order = -1;
    }

    const sortObj = { [sortField]: order };

    // Execute query
    const totalSessions = await TutoringSession.countDocuments(filter);

    const sessions = await TutoringSession.find(filter)
      .populate("tutor", "fullName email phoneNumber avatar")
      .populate("participants.userId", "fullName email avatar")
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Pagination metadata
    const totalPages = Math.ceil(totalSessions / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.status(StatusCodes.OK).json({
      msg: "Your enrolled sessions retrieved successfully",
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
      throw new BadRequestError("Invalid request parameters");
    }

    throw error;
  }
};

/**
 * Get a single tutoring session by ID
 * Retrieves detailed information about a specific session
 */
export const getTutoringSessionById = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Validate ID format
    if (!sessionId || !sessionId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestError("Invalid session ID format");
    }

    // Find session and populate references
    const session = await TutoringSession.findById(sessionId)
      .populate("tutor", "fullName email phoneNumber avatar location role")
      .populate("participants.userId", "fullName email avatar");

    // Check if session exists
    if (!session) {
      throw new NotFoundError("Tutoring session not found");
    }

    // Calculate additional metadata
    const now = new Date();
    const sessionMetadata = {
      isPast: session.schedule.date < now,
      isUpcoming: session.schedule.date >= now,
      availableSeats: session.capacity.maxParticipants - session.capacity.currentEnrolled,
      enrollmentPercentage: Math.round(
        (session.capacity.currentEnrolled / session.capacity.maxParticipants) * 100
      ),
      averageRating:
        session.participants.length > 0
          ? (
              session.participants.reduce((sum, p) => sum + (p.rating || 0), 0) /
              session.participants.filter((p) => p.rating).length
            ).toFixed(1)
          : null,
      totalFeedbackCount: session.participants.filter((p) => p.feedbackGiven).length,
    };

    res.status(StatusCodes.OK).json({
      msg: "Tutoring session retrieved successfully",
      session: {
        ...session.toObject(),
        metadata: sessionMetadata,
      },
    });
  } catch (error) {
    if (error.name === "CastError") {
      throw new BadRequestError("Invalid session ID format");
    }

    throw error;
  }
};
