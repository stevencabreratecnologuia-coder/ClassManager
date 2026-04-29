import mongoose from "mongoose";

const classroomSchema = new mongoose.Schema(
  {
    grade: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    profesorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    estudiantes: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
  },
  { timestamps: true },
);

export default mongoose.model("Classroom",classroomSchema);
