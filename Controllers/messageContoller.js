import Message from "../models/MessageModel.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError } from "../errors/customErrors.js";
import path from "path";
import fs from "fs";

// Create a new message with optional image upload
export const createMessage = async (req, res) => {
  try {
    // Attach the logged-in user's ID
    req.body.createdBy = req.user.userId;
    
    if (req.file) {
      req.body.image = path.join("uploads", req.file.filename);
    }

    const message = await Message.create(req.body);
    res.status(StatusCodes.CREATED).json({
      msg: "Message created successfully",
      message,
    });
  } catch (error) {

    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Failed to create message",
      error: error.message,
    });
  }
};

// Get all messages created by the logged-in user
export const getAllMessages = async (req, res) => {
  try {
    let query = {};
    
    // If user role is 'user', show only their messages
    // If role is 'admin' or 'tutor', show all messages
    if (req.user.role === "user") {
      query.createdBy = req.user.userId;
    }
    
    const messages = await Message.find(query).sort("-createdAt").populate("createdBy", "fullName email role");
    res.status(StatusCodes.OK).json({ messages });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Failed to fetch messages",
      error: error.message,
    });
  }
};

// Update message - only the user who created it can update
export const updateMessage = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the message first to check ownership
    const message = await Message.findById(id);

    if (!message) {
      throw new NotFoundError("Message not found");
    }

    // Check if the logged-in user is the creator of the message
    if (message.createdBy.toString() !== req.user.userId) {
      throw new BadRequestError("You are not authorized to update this message");
    }

    const updatedMessage = await Message.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(StatusCodes.OK).json({
      msg: "Message updated successfully",
      message: updatedMessage,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Failed to update message",
      error: error.message,
    });
  }
};

// Delete message - only the user who created it can delete
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the message first to check ownership
    const message = await Message.findById(id);

    if (!message) {
      throw new NotFoundError("Message not found");
    }

    // Check if the logged-in user is the creator of the message
    if (message.createdBy.toString() !== req.user.userId) {
      throw new BadRequestError("You are not authorized to delete this message");
    }

    await Message.findByIdAndDelete(id);

    res.status(StatusCodes.OK).json({ msg: "Message deleted successfully" });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Failed to delete message",
      error: error.message,
    });
  }
};




