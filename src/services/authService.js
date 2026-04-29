import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { createHttpError } from "../utils/httpError.js";

const normalizeEmail = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();
const normalizeText = (value) => String(value ?? "").trim();
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
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findUserByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  return User.findOne({
    email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: "i" },
  });
};

const buildAuthResponse = (user) => {
  const normalizedRole = normalizeRole(user.rol);
  const token = jwt.sign(
    { id: user._id, rol: normalizedRole, email: user.email },
    process.env.JWT_SECRET || "dev_secret",
    { expiresIn: "7d" },
  );

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      rol: normalizedRole,
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

export const createOrSyncAdmin = async () => {
  const email = normalizeEmail(process.env.ADMIN_EMAIL || "admin@test.com");
  const password = String(process.env.ADMIN_PASSWORD || "password123").trim();
  const name = normalizeText(process.env.ADMIN_NAME || "Admin de Prueba");

  if (!email || !password || !name) {
    console.warn(
      "No se pudo preparar el admin inicial porque faltan ADMIN_NAME, ADMIN_EMAIL o ADMIN_PASSWORD.",
    );
    return;
  }

  const existingUser = await findUserByEmail(email);
  const hashedPassword = await bcrypt.hash(password, 10);

  if (!existingUser) {
    await User.create({
      name,
      email,
      password: hashedPassword,
      rol: "Admin",
      estado: true,
    });
    console.log(`Admin inicial creado: ${email}`);
    return;
  }

  let shouldSave = false;

  if (existingUser.name !== name) {
    existingUser.name = name;
    shouldSave = true;
  }

  if (existingUser.email !== email) {
    existingUser.email = email;
    shouldSave = true;
  }

  if (existingUser.rol !== "Admin") {
    existingUser.rol = "Admin";
    shouldSave = true;
  }

  if (existingUser.estado === false) {
    existingUser.estado = true;
    shouldSave = true;
  }

  const passwordMatches = await bcrypt.compare(password, existingUser.password);
  if (!passwordMatches) {
    existingUser.password = hashedPassword;
    shouldSave = true;
  }

  if (shouldSave) {
    await existingUser.save();
    console.log(`Admin inicial actualizado: ${email}`);
    return;
  }

  console.log(`Admin inicial listo: ${email}`);
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

  const normalizedRole = normalizeRole(user.rol);
  if (user.email !== normalizedEmail || user.rol !== normalizedRole) {
    user.email = normalizedEmail;
    user.rol = normalizedRole;
    await user.save();
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw createHttpError(401, "Credenciales invalidas.");
  }

  return buildAuthResponse(user);
};
