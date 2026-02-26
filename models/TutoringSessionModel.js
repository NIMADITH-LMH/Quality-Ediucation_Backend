import mongoose from "mongoose";

const tutoringSessionSchema = new mongoose.Schema(
  {
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Please provide a tutor"],
      validate: {
        async: true,
        validator: async function (value) {
          const user = await mongoose.model("User").findById(value);
          return user && user.role === "tutor";
        },
        message: "Tutor must be a valid user with tutor role",
      },
    },

    subject: {
      type: String,
      required: [true, "Please provide a subject"],
      trim: true,
      minlength: [3, "Subject must be at least 3 characters long"],
      maxlength: [50, "Subject cannot exceed 50 characters"],
      lowercase: true,
    },

    description: {
      type: String,
      required: [true, "Please provide a description"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters long"],
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    topic: {
      type: String,
      trim: true,
      minlength: [2, "Topic must be at least 2 characters long"],
      maxlength: [100, "Topic cannot exceed 100 characters"],
    },

    schedule: {
      date: {
        type: Date,
        required: [true, "Please provide session date"],
        validate: {
          validator: function (value) {
            return value > new Date();
          },
          message: "Session date must be in the future",
        },
      },
      startTime: {
        type: String,
        required: [true, "Please provide start time (HH:MM format)"],
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Start time must be in HH:MM format"],
      },
      endTime: {
        type: String,
        required: [true, "Please provide end time (HH:MM format)"],
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "End time must be in HH:MM format"],
      },
      duration: {
        type: Number,
        default: null,
        min: [15, "Session duration must be at least 15 minutes"],
        max: [480, "Session duration cannot exceed 8 hours (480 minutes)"],
      },
    },

    location: {
      type: {
        type: String,
        enum: ["online", "offline", "hybrid"],
        default: "online",
      },
      address: {
        street: String,
        city: String,
        zipCode: String,
        country: String,
      },
      meetingLink: String,
    },

    capacity: {
      maxParticipants: {
        type: Number,
        required: [true, "Please provide maximum participants"],
        min: [1, "Capacity must be at least 1"],
        max: [100, "Capacity cannot exceed 100"],
      },
      currentEnrolled: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    googleEventId: {
    type: String,
    },

    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["enrolled", "attended", "dropped", "cancelled"],
          default: "enrolled",
        },
        feedbackGiven: {
          type: Boolean,
          default: false,
        },
        rating: {
          type: Number,
          min: [1, "Rating must be at least 1"],
          max: [5, "Rating cannot exceed 5"],
        },
        feedback: {
          type: String,
          trim: true,
          maxlength: [500, "Feedback cannot exceed 500 characters"],
        },
      },
    ],

    status: {
      type: String,
      enum: {
        values: ["scheduled", "in-progress", "completed", "cancelled"],
        message: "Status must be one of: scheduled, in-progress, completed, or cancelled",
      },
      default: "scheduled",
    },

    materials: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
          maxlength: [100, "Material title cannot exceed 100 characters"],
        },
        fileUrl: {
          type: String,
          required: true,
        },
        fileType: {
          type: String,
          enum: ["pdf", "doc", "docx", "pptx", "image", "video", "other"],
          default: "other",
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    level: {
      type: String,
      enum: {
        values: ["beginner", "intermediate", "advanced"],
        message: "Level must be beginner, intermediate, or advanced",
      },
      default: "intermediate",
    },

    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: [30, "Tag cannot exceed 30 characters"],
      },
    ],

    isRecurring: {
      type: Boolean,
      default: false,
    },

    recurrencePattern: {
      frequency: {
        type: String,
        enum: ["daily", "weekly", "biweekly", "monthly"],
      },
      endDate: Date,
    },

    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [300, "Cancellation reason cannot exceed 300 characters"],
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },

    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for better query performance
tutoringSessionSchema.index({ tutor: 1, status: 1 });
tutoringSessionSchema.index({ "schedule.date": 1 });
tutoringSessionSchema.index({ subject: 1 });
tutoringSessionSchema.index({ status: 1 });

// Virtual for available seats
tutoringSessionSchema.virtual("availableSeats").get(function () {
  return this.capacity.maxParticipants - this.capacity.currentEnrolled;
});

// Virtual for is full
tutoringSessionSchema.virtual("isFull").get(function () {
  return this.capacity.currentEnrolled >= this.capacity.maxParticipants;
});

// Virtual for is past
tutoringSessionSchema.virtual("isPast").get(function () {
  return this.schedule.date < new Date();
});

// Method to add participant
tutoringSessionSchema.methods.addParticipant = async function (userId) {
  if (this.isFull) {
    throw new Error("Session is at full capacity");
  }

  const isAlreadyEnrolled = this.participants.some(
    (p) => p.userId.toString() === userId.toString()
  );

  if (isAlreadyEnrolled) {
    throw new Error("User is already enrolled in this session");
  }

  this.participants.push({ userId });
  this.capacity.currentEnrolled += 1;
  return await this.save();
};

// Method to remove participant
tutoringSessionSchema.methods.removeParticipant = async function (userId) {
  const participantIndex = this.participants.findIndex(
    (p) => p.userId.toString() === userId.toString()
  );

  if (participantIndex === -1) {
    throw new Error("User is not enrolled in this session");
  }

  this.participants.splice(participantIndex, 1);
  this.capacity.currentEnrolled = Math.max(0, this.capacity.currentEnrolled - 1);
  return await this.save();
};

// Method to update participant status
tutoringSessionSchema.methods.updateParticipantStatus = async function (userId, status) {
  const participant = this.participants.find(
    (p) => p.userId.toString() === userId.toString()
  );

  if (!participant) {
    throw new Error("User is not enrolled in this session");
  }

  participant.status = status;
  return await this.save();
};

// Method to add feedback
tutoringSessionSchema.methods.addFeedback = async function (userId, rating, feedback) {
  if (rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }

  const participant = this.participants.find(
    (p) => p.userId.toString() === userId.toString()
  );

  if (!participant) {
    throw new Error("User is not enrolled in this session");
  }

  if (participant.feedbackGiven) {
    throw new Error("Feedback already provided by this user");
  }

  participant.rating = rating;
  participant.feedback = feedback;
  participant.feedbackGiven = true;

  return await this.save();
};

// Pre-save middleware to calculate duration
tutoringSessionSchema.pre("save", async function () {
  if (this.schedule.startTime && this.schedule.endTime) {
    const [startHour, startMinute] = this.schedule.startTime.split(":").map(Number);
    const [endHour, endMinute] = this.schedule.endTime.split(":").map(Number);

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    const duration = endTotalMinutes - startTotalMinutes;

    if (duration <= 0) {
      throw new Error("End time must be after start time");
    }

    this.schedule.duration = duration;
  }
});

export default mongoose.model("TutoringSession", tutoringSessionSchema);
