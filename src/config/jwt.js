import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, rol: user.rol, email: user.email },
    process.env.JWT_SECRET || "dev_secret",
    { expiresIn: "7d" },
  );
};
