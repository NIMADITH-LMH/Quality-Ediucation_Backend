import User from "../models/UserModel.js";
import { verifyJWT } from "../utils/generateToken.js";

/**
 * Reads JWT from:
 * Authorization: Bearer <token>
 * Attaches req.user
 */
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
      return res.status(401).json({ message: "Not authorized, invalid token payload" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};