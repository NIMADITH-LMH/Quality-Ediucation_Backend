import { Router } from "express";
import {createMessage, getAllMessages, updateMessage, deleteMessage} from "../Controllers/messageContoller.js";
import { authenticateUser, authorizePermissions } from "../Middleware/authMiddleware.js";

const router = Router();

router.post(
    "/",
     authenticateUser, 
     authorizePermissions("user"),
     createMessage);

router.get(
        "/",
         authenticateUser, 
         authorizePermissions("user", "admin", "tutor"),
         getAllMessages);

router.patch(
    "/:id",
     authenticateUser,
     authorizePermissions("user"),
     updateMessage);

router.delete(
    "/:id",
     authenticateUser,
     authorizePermissions("user"),
     deleteMessage);

export default router;
