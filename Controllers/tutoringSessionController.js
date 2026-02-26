import * as tutoringSessionService from "../services/tutoringSessionService.js";
import { StatusCodes } from "http-status-codes";
import TutoringSession from "../models/TutoringSessionModel.js";

export const createTutoringSession = async (req, res) => {
  const session = await tutoringSessionService.createSession(req.user, req.body);
  return res.status(StatusCodes.CREATED).json({ msg: "Tutoring session created", session });
};

export const getAllTutoringSessions = async (req, res) => {
  const { sessions, pagination } = await tutoringSessionService.getAllSessions(req.query);
  return res.status(StatusCodes.OK).json({ msg: "Tutoring sessions retrieved", sessions, pagination });
};

export const getTutoringSessionById = async (req, res) => {
  const session = await tutoringSessionService.getSessionById(req.params.id);
  return res.status(StatusCodes.OK).json({ msg: "Session retrieved", session });
};

export const updateTutoringSession = async (req, res) => {
  const updated = await tutoringSessionService.updateSession(req.user, req.params.id, req.body);
  return res.status(StatusCodes.OK).json({ msg: "Session updated", session: updated });
};

export const deleteTutoringSession = async (req, res) => {
  await tutoringSessionService.deleteSession(req.user, req.params.id);
  return res.status(StatusCodes.OK).json({ msg: "Session deleted successfully" });
};

export const joinTutoringSession = async (req, res) => {
  const enrolled = await tutoringSessionService.joinSession(req.user, req.params.id);
  return res.status(StatusCodes.OK).json({ msg: "Joined session", currentEnrolled: enrolled });
};

export const leaveTutoringSession = async (req, res) => {
  const enrolled = await tutoringSessionService.leaveSession(req.user, req.params.id);
  return res.status(StatusCodes.OK).json({ msg: "Left session", currentEnrolled: enrolled });
};

export const getTutorSessions = async (req, res) => {
  const sessions = await tutoringSessionService.getTutorSessions(req.params.tutorId);
  return res.status(StatusCodes.OK).json({ msg: "Tutor sessions retrieved", sessions });
};

export const getMyEnrolledSessions = async (req, res) => {
  const sessions = await tutoringSessionService.getMyEnrolledSessions(req.user);
  return res.status(StatusCodes.OK).json({ msg: "Your enrolled sessions", sessions });
};

export const getTutoringSessionsByTutor = async (req, res) => {
  const { tutorId } = req.params;

  try {
    const sessions = await TutoringSession.find({ tutor: tutorId }).sort({ "schedule.date": 1 });

    if (!sessions || sessions.length === 0) {
      return res.status(404).json({ msg: "No sessions found for this tutor" });
    }

    res.status(200).json({ msg: "Sessions retrieved", sessions });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};