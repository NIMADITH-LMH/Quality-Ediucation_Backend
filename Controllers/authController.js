import User from "../models/UserModel.js";
import bcrypt from "bcryptjs";
import { createJWT } from "../utils/generateToken.js";
import { hashPassword } from "../utils/passwordUtils.js";
import { StatusCodes } from "http-status-codes";

// ─── Register ────────────────────────────────────────────────────────────────

export const register = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ msg: "Email and password are required" });
  }

  const isFirstAccount = (await User.countDocuments()) === 0;

  // If role is provided and is "tutor", keep it; otherwise apply default logic
  if (req.body.role === "tutor") {
    req.body.role = "tutor";
  } else {
    req.body.role = isFirstAccount ? "admin" : "user";
  }

  const hashedPassword = await hashPassword(req.body.password);
  req.body.password = hashedPassword;

  const user = await User.create(req.body);
  const message =
    user.role === "tutor"
      ? "Tutor registered successfully"
      : "User Created Successfully";
  res.status(StatusCodes.CREATED).json({ msg: message });
};

// ─── Login ────────────────────────────────────────────────────────────────────

export const login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ msg: "Email and password are required" });
  }

  // Optionally filter by role if provided in request
  const query = { email };
  if (req.body.role) {
    query.role = req.body.role;
  }

  const user = await User.findOne(query);

  if (!user) {
    return res.status(401).json({ msg: "Invalid credentials" });
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password);

  if (!isPasswordCorrect) {
    return res.status(401).json({ msg: "Invalid credentials" });
  }

  const oneday = 24 * 60 * 60 * 1000;

  // Issue token — supports both Authorization header (Bearer) and cookie flows
  const token = createJWT({ userId: user._id, role: user.role, id: user._id });

  res.cookie("token", token, {
    httpOnly: true,
    expires: new Date(Date.now() + oneday),
    secure: process.env.NODE_ENV === "production",
  });

  const roleMessage = user.role === "tutor" ? "Tutor logged in" : "User logged in";
  res.status(StatusCodes.OK).json({
    msg: roleMessage,
    token,
    user: {
      role: user.role,
      name: user.fullName,
      email: user.email,
    },
  });
};

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logout = (req, res) => {
  res.cookie("token", "logout", {
    httpOnly: true,
    expires: new Date(Date.now()),
  });
  res.status(StatusCodes.OK).json({ msg: "User logged out" });
};