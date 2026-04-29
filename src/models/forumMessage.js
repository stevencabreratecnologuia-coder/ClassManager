import mongoose from "mongoose";

const forumMessageSchema = new mongoose.Schema(
  {
    forumId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Forum",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    replys: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ForumMessage",
      },
    ],
    summaryIa: {
      type: String,
      default: "",
    },
    frequentlyQuestion: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model("ForumMessage", forumMessageSchema);
