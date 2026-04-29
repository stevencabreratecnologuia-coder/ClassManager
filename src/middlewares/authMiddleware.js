import jwt from "jsonwebtoken";
import User from "../models/user.js";

const normalizeRole = (value) => {
  const normalizedValue = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalizedValue === "admin" || normalizedValue === "administrador") {
    return "Admin";
  }

  if (normalizedValue === "profesor") {
    return "Profesor";
  }

  if (normalizedValue === "estudiante") {
    return "Estudiante";
  }

  return "Estudiante";
};

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "No autorizado",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev_secret",
    );

    const user = await User.findById(decoded.id).select("_id rol email estado");
    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Usuario no encontrado",
      });
    }

    if (user.estado === false) {
      return res.status(403).json({
        status: "error",
        message: "Cuenta inactiva",
      });
    }

    const normalizedRole = normalizeRole(user.rol);
    if (user.rol !== normalizedRole) {
      user.rol = normalizedRole;
      await user.save();
    }

    req.user = {
      id: String(user._id),
      rol: normalizedRole,
      email: user.email,
    };
    next();
  } catch (error) {
    res.status(401).json({
      status: "error",
      message: "Token Invalido",
    });
  }
};
