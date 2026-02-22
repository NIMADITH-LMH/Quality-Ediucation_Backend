import express from 'express';
const router = express.Router();
const authRouter = require("./authRouter");
const feedbackRouter = require("./feedbackRouter");
const progressRouter = require("./progressRouter");

router.use("/auth", authRouter);
router.use("/feedbacks", feedbackRouter);
router.use("/progress", progressRouter);

// Define your routes here
router.get('/test', (req, res) => {
  res.json({ message: 'Test route working' });
});

export default router;
