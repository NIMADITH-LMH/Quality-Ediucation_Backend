import User from "../models/UserModel.js";
import { verifyJWT } from "../utils/generateToken.js";

// ─── Strategy 1: Bearer-token middleware (Authorization header) ───────────────
// Used by routes that need the full user document on req.user
// e.g.  Authorization: Bearer <token>

export const protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : null;

    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const decoded = verifyJWT(token);

    // Support common payload styles: {id}, {userId}, {_id}
    const userId = decoded?.id || decoded?.userId || decoded?._id;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Not authorized, invalid token payload" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(401)
        .json({ message: "Not authorized, user not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Not authorized, token failed" });
  }
};

// ─── Strategy 2: Cookie-based middleware ─────────────────────────────────────
// Used by routes that rely on httpOnly cookie auth
// Attaches { userId, role } to req.user

export const authenticateUser = (req, res, next) => {
  // Support both cookie and Authorization Bearer header
  let token = req.cookies?.token;

  if (!token) {
    const auth = req.headers.authorization || "";
    token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : null;
  }

  if (!token) {
    return res.status(401).json({ message: "Authentication invalid" });
  }

  try {
    const { userId, role, id } = verifyJWT(token);
    req.user = { userId: userId || id, role };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Authentication invalid" });
  }
};

// ─── Role-based authorization ─────────────────────────────────────────────────

export const authorizePermissions = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Not authorized to access this route" });
    }
    next();
  };
};