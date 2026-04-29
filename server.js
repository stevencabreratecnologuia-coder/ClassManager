import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import authRoutes from "./src/routes/authRoutes.js";
import classroomRoutes from "./src/routes/ClassroomRoutes.js";
import aiRoutes from "./src/routes/aiRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import { connectDB } from "./src/config/db.js";
import { errorHandler } from "./src/middlewares/errorMiddleware.js";
import { createOrSyncAdmin } from "./src/services/authService.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientPath = path.join(__dirname, "client");

if (process.env.MONGO_URI || process.env.MONGO_DIRECT_URI) {
  const dbConnected = await connectDB();
  if (dbConnected) {
    await createOrSyncAdmin();
  }
} else {
  console.warn(
    "MONGO_URI no esta configurado. El frontend cargara, pero login y registro no podran autenticarse.",
  );
}

app.use(cors());
app.use(express.json());
app.use(express.static(clientPath));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Servidor activo",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/classrooms", classroomRoutes);
app.use("/api/ai", aiRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(clientPath, "index.html"));
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
