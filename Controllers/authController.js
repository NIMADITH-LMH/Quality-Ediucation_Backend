import User from "../models/UserModel.js";
import bcrypt from "bcryptjs";
import { createJWT } from "../utils/generateToken.js";
import { hashPassword } from "../utils/passwordUtils.js";
import { StatusCodes } from "http-status-codes";
import {
  UnauthenticatedError,
  NotFoundError,
  BadRequestError,
} from "../errors/customErrors.js";

// Register a new user or tutor
export const register = async (req, res) => {
  const { email, password, role, subjects } = req.body || {};
  if (!email || !password) {
    throw new BadRequestError("Email and password are required");
  }

  const isFirstAccount = (await User.countDocuments()) === 0;

  // If role is provided and is "tutor", use it; otherwise apply default logic
  if (role === "tutor") {
    req.body.role = "tutor";
    
    // Validate subjects for tutors (additional check)
    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      throw new BadRequestError("Subjects are required for tutor registration");
    }
    
    // Initialize tutorProfile with subjects
    req.body.tutorProfile = {
      subjects: subjects.map(s => s.toLowerCase()),
      availability: "available",
      sessionCount: 0,
      rating: {
        average: 0,
        count: 0,
      },
      isVerified: false,
    };
  } else {
    req.body.role = isFirstAccount ? "admin" : "user";
  }

  const hashedPassword = await hashPassword(password);
  req.body.password = hashedPassword;

  const user = await User.create(req.body);

  const message =
    user.role === "tutor"
      ? "Tutor registered successfully"
      : "User Created Successfully";

  res.status(StatusCodes.CREATED).json({ msg: message });
};

// Login user/tutor and set JWT token in cookie
export const login = async (req, res) => {
  const { email, password, role } = req.body || {};
  if (!email || !password) {
    throw new BadRequestError("Email and password are required");
  }

  // Optionally filter by role if provided in request
  const query = { email };
  if (role) query.role = role;

  const user = await User.findOne(query);
  const isValidUser = user && (await bcrypt.compare(password, user.password));
  if (!isValidUser) throw new UnauthenticatedError("Invalid credentials");

  const oneday = 24 * 60 * 60 * 1000;

  // Keep both keys if you have middleware expecting either `id` or `userId`
  const token = createJWT({ userId: user._id, id: user._id, role: user.role });

  res.cookie("token", token, {
    httpOnly: true,
    expires: new Date(Date.now() + oneday),
    secure: process.env.NODE_ENV === "production",
  });

  const roleMessage = user.role === "tutor" ? "Tutor logged in" : "User logged in";

  res.status(StatusCodes.OK).json({
    msg: roleMessage,
    token, // remove this if you ONLY want cookie-based auth
    user: {
      role: user.role,
      name: user.fullName || user.email,
      email: user.email,
    },
  });
};

export const logout = (req, res) => {
  res.cookie("token", "logout", {
    httpOnly: true,
    expires: new Date(Date.now()),
  });
  res.status(StatusCodes.OK).json({ msg: "User logged out" });
};