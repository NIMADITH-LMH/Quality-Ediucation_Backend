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
