import User from "../models/UserModel.js";
import { UnauthenticatedError, UnauthorizedError } from "../errors/customErrors.js";
import { verifyJWT } from "../utils/generateToken.js";

/**
 * Reads JWT from:
 * Authorization: Bearer <token>
 * Attaches full user document to req.user
 */
export const protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ")
      ? auth.split(" ")[1]
      : null;

    if (!token) {
      throw new UnauthenticatedError("Not authorized, no token");
    }

    const decoded = verifyJWT(token);

    // Support payload styles: { id }, { userId }, { _id }
    const userId = decoded?.id || decoded?.userId || decoded?._id;

    if (!userId) {
      throw new UnauthenticatedError("Invalid token payload");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new UnauthenticatedError("User not found");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new UnauthenticatedError("Not authorized, token failed");
  }
};

/**
 * Reads JWT from:
 * cookie (token)
 * Attaches req.user { userId, role }
 */
export const authenticateUser = (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    throw new UnauthenticatedError("Authentication invalid");
  }

  try {
    const decoded = verifyJWT(token);
    const userId = decoded.userId || decoded.id;

    req.user = {
      userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    throw new UnauthenticatedError("Authentication invalid");
  }
};

/**
 * Authorization guard for specific roles
 */
export const authorizePermissions = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new UnauthorizedError("Not authorized to access this route");
    }
    next();
  };
};