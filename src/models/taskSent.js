import mongoose from "mongoose";

const taskSentSchema = new mongoose.Schema(
  {
    estudianteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    files: {
      type: String,
      required: true,
      trim: true,
    },
    fechaEntrega: {
      type: Date,
      default: Date.now,
    },
    state: {
      type: String,
      enum: ["Entregado", "Tarde"],
      default: "Entregado",
    },
    analysisIa: {
      possibleIa: Boolean,
      percentageIa: Number,
      porcentageIa: Number,
      feedback: String,
    },
    answer: {
      ask: String,
      answer: String,
      typeAnswer: {
        type: String,
        enum: ["Audio", "Texto"],
      },
    },
    note: Number,
    teacherComments: String,
  },
  { timestamps: true },
);

export default mongoose.model("TaskSent", taskSentSchema);
