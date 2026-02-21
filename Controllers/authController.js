import User from "../models/UserModel.js";
import bcrypt from "bcryptjs";
import { createJWT } from "../utils/generateToken.js";
import { hashPassword } from "../utils/passwordUtils.js";
import { StatusCodes } from "http-status-codes";

export const login = async (req, res) => {
  
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ msg: "Email and password are required" });
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(401).json({ msg: "Invalid credentials" });
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password);

  if (!isPasswordCorrect) {
    return res.status(401).json({ msg: "Invalid credentials" });
  }

  const token = createJWT({ id: user._id });

  res.status(200).json({
    token,
    user,
  });
};

export const register = async (req, res) => {
const { email, password } = req.body || {};
if (!email || !password) {
  return res.status(400).json({ msg: "Email and password are required" });
}

  const isFirstAccount = (await User.countDocuments()) === 0;
  req.body.role = isFirstAccount ? "admin" : "user";

  const hashedPassword = await hashPassword(req.body.password);
  req.body.password = hashedPassword;

  const user = await User.create(req.body);
  res.status(StatusCodes.CREATED).json({ msg: "User Created Successfully" });
};