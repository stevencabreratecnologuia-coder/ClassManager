import bcrypt from "bcrypt";
import User from "../models/user.js";
import { createHttpError } from "../utils/httpError.js";

const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();
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

const findUserByEmail = async (email) =>
  User.findOne({
    email: { $regex: `^${escapeRegex(normalizeEmail(email))}$`, $options: "i" },
  });

export const findUsers = ({ search } = {}) => {
  let query = {};
  if (search) {
    query = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    };
  }

  return User.find(query).select("-password").sort({ createdAt: -1 });
};

export const createUserRecord = async ({
  name,
  email,
  password,
  rol = "Estudiante",
  estado = true,
}) => {
  if (!name || !email || !password) {
    throw createHttpError(400, "Nombre, correo y contrasena son obligatorios");
  }

  const normalizedEmail = normalizeEmail(email);
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw createHttpError(400, "El correo ya esta registrado");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: String(name).trim(),
    email: normalizedEmail,
    password: hashedPassword,
    rol: normalizeRole(rol),
    estado,
  });

  const userObject = user.toObject();
  const { password: _, ...userData } = userObject;
  return userData;
};

export const updateUserRecord = async (
  id,
  { name, email, password, rol, estado },
  currentUserId,
) => {
  if (estado === false && String(currentUserId) === String(id)) {
    throw createHttpError(400, "No puedes desactivar tu propio usuario");
  }

  const updateData = {};
  if (name) updateData.name = String(name).trim();
  if (email) {
    const normalizedEmail = normalizeEmail(email);
    const existing = await findUserByEmail(normalizedEmail);
    if (existing && String(existing._id) !== String(id)) {
      throw createHttpError(400, "El correo ya esta registrado");
    }
    updateData.email = normalizedEmail;
  }
  if (password) updateData.password = await bcrypt.hash(password, 10);
  if (rol) updateData.rol = normalizeRole(rol);
  if (typeof estado === "boolean") updateData.estado = estado;

  const user = await User.findByIdAndUpdate(id, updateData, {
    new: true,
  }).select("-password");

  if (!user) {
    throw createHttpError(404, "El usuario no existe");
  }

  return user;
};

export const deleteUserRecord = async (id, currentUserId) => {
  if (currentUserId === id) {
    throw createHttpError(400, "No puedes eliminar tu propio usuario");
  }

  const user = await User.findByIdAndDelete(id);
  if (!user) {
    throw createHttpError(404, "El usuario no existe");
  }

  return user;
};
