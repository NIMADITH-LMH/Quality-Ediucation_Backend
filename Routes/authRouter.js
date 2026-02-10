import { Router } from "express";
import { register } from "../Controllers/authController.js";

const router = Router();

router.post("/register", register);

export default router;
