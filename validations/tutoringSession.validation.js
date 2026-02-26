import mongoose from "mongoose";
import { BadRequestError } from "../errors/customErrors.js";

const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

export function validateObjectId(id, name = "id") {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequestError(`Invalid ${name}`);
  }
}

export function validateSessionPayload(body) {
  const { subject, description, schedule, capacity } = body;
  if (!subject || !description || !schedule) {
    throw new BadRequestError("subject, description and schedule are required");
  }
  if (!schedule.date || !schedule.startTime || !schedule.endTime) {
    throw new BadRequestError("schedule must include date, startTime and endTime");
  }

  if (!timeRegex.test(schedule.startTime) || !timeRegex.test(schedule.endTime)) {
    throw new BadRequestError("Time must be in HH:MM format");
  }

  const sessionDate = new Date(schedule.date);
  if (isNaN(sessionDate.getTime()) || sessionDate <= new Date()) {
    throw new BadRequestError("Session date must be a valid future date");
  }

  if (!capacity || typeof capacity.maxParticipants === "undefined") {
    throw new BadRequestError("capacity.maxParticipants is required");
  }
  const max = parseInt(capacity.maxParticipants, 10);
  if (Number.isNaN(max) || max < 1 || max > 100) {
    throw new BadRequestError("capacity.maxParticipants must be between 1 and 100");
  }
}

export function validateUpdatePayload(updates) {
  if (updates.schedule?.startTime || updates.schedule?.endTime) {
    if (!timeRegex.test(updates.schedule.startTime) || !timeRegex.test(updates.schedule.endTime)) {
      throw new BadRequestError("Time must be in HH:MM format");
    }
  }
}

export function validateFilterQuery(query) {
  if (query.grade) {
    const g = query.grade;
    const gradeNum = Number(g);
    if (!Number.isNaN(gradeNum) && !Number.isInteger(gradeNum)) {
      throw new BadRequestError("grade query must be integer or string");
    }
  }
}
