import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { createHttpError } from "../utils/httpError.js";

const normalizeEmail = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();
const normalizeText = (value) => String(value ?? "").trim();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findUserByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  return User.findOne({
    email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: "i" },
  });
};

const buildAuthResponse = (user) => {
  const token = jwt.sign(
    { id: user._id, rol: user.rol, email: user.email },
    process.env.JWT_SECRET || "dev_secret",
    { expiresIn: "7d" },
  );

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      rol: user.rol,
      estado: user.estado,
    },
  };
};

export const registerUser = async ({ name, email, password }) => {
  const normalizedName = normalizeText(name);
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedName || !normalizedEmail || !password) {
    throw createHttpError(400, "Nombre, correo y contrasena son obligatorios.");
  }

  const existingUser = await findUserByEmail(normalizedEmail);
  if (existingUser) {
    throw createHttpError(400, "El correo ya esta registrado.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: normalizedName,
    email: normalizedEmail,
    password: hashedPassword,
    rol: "Estudiante",
    estado: true,
  });

  return buildAuthResponse(user);
};

export const createTestAdmin = async () => {
  const email = "admin@test.com";
  const password = "password123";

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.log("El usuario de prueba ya existe.");
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await User.create({
    name: "Admin de Prueba",
    email,
    password: hashedPassword,
    rol: "Administrador",
    estado: true,
  });
  console.log(
    "Usuario de prueba creado con exito. Email: admin@test.com, Contrasena: password123",
  );
};

export const loginUser = async ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    throw createHttpError(400, "Correo y contrasena son obligatorios.");
  }

  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    throw createHttpError(401, "Credenciales invalidas.");
  }

  if (user.estado === false) {
    throw createHttpError(403, "Tu cuenta esta inactiva. Contacta al administrador.");
  }

  if (user.email !== normalizedEmail) {
    user.email = normalizedEmail;
    await user.save();
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw createHttpError(401, "Credenciales invalidas.");
  }

  return buildAuthResponse(user);
};
