import dotenv from "dotenv";

// Load environment variables FIRST before any other imports
dotenv.config();

import express from "express";
import cors from "cors";
import connectDB from "./Config/db.js";
import cookieParser from "cookie-parser";

// Import Routes
import authRouter from "./Routes/authRouter.js";
import feedbackRouter from "./Routes/feedbackRouter.js";
import progressRouter from "./Routes/progressRouter.js";
import materialRouter from "./Routes/materialRouter.js";
import tutorRouter from "./Routes/tutorRouter.js";

// If you have these route files, uncomment the imports + app.use lines below
import messageRouter from "./Routes/messageRouter.js";
import tutoringSessionRouter from "./Routes/tutoringSessionRouter.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Welcome to AF Backend API" });
});

app.use("/api/auth", authRouter);
app.use("/api/feedbacks", feedbackRouter);
app.use("/api/progress", progressRouter);
app.use("/api/materials", materialRouter);
app.use("/api/tutors", tutorRouter);

// Uncomment if these exist
app.use("/api/messages", messageRouter);
app.use("/api/tutoring-sessions", tutoringSessionRouter);

// Port
const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
