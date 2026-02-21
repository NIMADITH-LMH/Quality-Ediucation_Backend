import { Router } from "express";
import { register, login, logout } from "../Controllers/authController.js";
import {
  validateRegisterInput,
  validateLoginInput,
} from "../Middleware/ValidatorMiddleware.js";

const router = Router();

router.post("/register", validateRegisterInput, register);
router.post("/login", validateLoginInput, login);
router.post("/logout", logout);

export default router;