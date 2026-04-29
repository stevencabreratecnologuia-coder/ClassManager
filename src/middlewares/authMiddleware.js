import jwt from "jsonwebtoken";
import User from "../models/user.js";

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

    req.user = {
      id: String(user._id),
      rol: user.rol,
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
