import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
mongoose.set("bufferCommands", false);

const buildConnectionCandidates = () =>
  [process.env.MONGO_URI, process.env.MONGO_DIRECT_URI].filter(Boolean);

export const connectDB = async () => {
  const candidates = buildConnectionCandidates();

  if (!candidates.length) {
    console.warn("No hay URI de MongoDB configurada.");
    return;
  }

  console.log("process.env.MONGO_URI:", process.env.MONGO_URI);

  for (const [index, uri] of candidates.entries()) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000,
      });
      console.log(
        index === 0
          ? "MongoDB Atlas conectado"
          : "MongoDB Atlas conectado con URI de respaldo",
      );
      return;
    } catch (error) {
      console.error(
        `Error al conectar DB con URI ${index + 1}:`,
        error.message,
      );
    }
  }

  console.warn(
    "El servidor seguira activo, pero las rutas que dependan de MongoDB pueden fallar.",
  );
};
