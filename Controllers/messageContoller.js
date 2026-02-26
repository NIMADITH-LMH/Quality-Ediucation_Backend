import Message from "../models/MessageModel.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError } from "../errors/customErrors.js";
import path from "path";
import fs from "fs";
import { createMessageWithTranslation, processMessageContent } from "../services/messageService.js";

//If message contains Sinhala characters (Unicode 0D80-0DFF), 
//it will be automatically translated to English using Google Gemini API

export const createMessage = async (req, res) => {
  let uploadedFile = null;

  try {
    // Validate required fields
      const { message } = req.body || {};

    if (!message) {
      throw new BadRequestError("message is required");
    }

    // Track uploaded file for cleanup on error
    uploadedFile = req.file;

    // Process message with translation service
    const messagePayload = await createMessageWithTranslation(
      req.body,
      { userId: req.user.userId },
      req.file
    );

    const createdMessage = await Message.create(messagePayload);

    // Populate creator details
    const populatedMessage = await Message.findById(createdMessage._id)
      .populate("createdBy", "fullName email role");

    res.status(StatusCodes.CREATED).json({
      success: true,
      msg: "Message created successfully",
      message: populatedMessage,
      translationPerformed: createdMessage.requiresTranslation
    });

  } catch (error) {
    // Cleanup uploaded file on error
    if (uploadedFile) {
      try {
        fs.unlinkSync(uploadedFile.path);
        console.log(`Cleaned up file: ${uploadedFile.filename}`);
      } catch (unlinkError) {
        console.error("Failed to cleanup uploaded file:", unlinkError.message);
      }
    }

    // Handle specific error types
    if (error instanceof BadRequestError) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        msg: error.message
      });
    }

    // Log error for monitoring
    console.error("Create message error:", error.message);

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      msg: "Failed to create message",
      error: error.message
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

    // Prepare update data
    let updateData = { ...req.body };

    // If message content is being updated, process it for translation
    if (req.body.message) {
      const { message: processedMessage, requiresTranslation } = await processMessageContent(req.body.message);
      updateData.message = processedMessage;
      updateData.requiresTranslation = requiresTranslation;
    }

    const updatedMessage = await Message.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("createdBy", "fullName email role");

    res.status(StatusCodes.OK).json({
      success: true,
      msg: "Message updated successfully",
      message: updatedMessage,
      translationPerformed: updateData.requiresTranslation || false
    });
  } catch (error) {
    // Handle specific error types
    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        msg: error.message
      });
    }

    // Log error for monitoring
    console.error("Update message error:", error.message);

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
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
    //databse queries take a time to execute
    //without wait code would continue immediately without waiting for the results
    res.status(StatusCodes.OK).json({ msg: "Message deleted successfully" });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Failed to delete message",
      error: error.message,
    });
  }
};




