import Task from "../models/task.js";
import { createHttpError } from "../utils/httpError.js";

export const createTaskRecord = async ({
  title,
  descripcion,
  description,
  fechaEntrega,
  assessmentMethods,
  metodoEvaluacion,
  classroomId,
  profesorId,
}) => {
  const taskDescription = descripcion ?? description;
  const taskAssessmentMethods = assessmentMethods ?? metodoEvaluacion;

  if (!title || !taskDescription || !fechaEntrega || !taskAssessmentMethods) {
    throw createHttpError(400, "Todos los campos de la tarea son obligatorios");
  }

  return Task.create({
    title: String(title).trim(),
    descripcion: String(taskDescription).trim(),
    fechaEntrega,
    assessmentMethods: String(taskAssessmentMethods).trim(),
    classroomId,
    profesorId,
  });
};

export const findTasks = () =>
  Task.find()
    .sort({ createdAt: -1 })
    .populate("classroomId", "grade")
    .populate("profesorId", "name email");

export const findTaskById = async (id) => {
  const task = await Task.findById(id)
    .populate("classroomId")
    .populate("profesorId");

  if (!task) {
    throw createHttpError(404, "Tarea no encontrada");
  }

  return task;
};

export const updateTaskRecord = async (id, data) => {
  const task = await Task.findByIdAndUpdate(id, data, { new: true });

  if (!task) {
    throw createHttpError(404, "Tarea no encontrada");
  }

  return task;
};

export const deleteTaskRecord = async (id) => {
  const task = await Task.findByIdAndDelete(id);

  if (!task) {
    throw createHttpError(404, "Tarea no encontrada");
  }

  return task;
};

export const findTasksByClassroom = (classroomId) =>
  Task.find({ classroomId })
    .populate("classroomId", "grade")
    .populate("profesorId", "name");

export const findTasksByProfessor = (profesorId) =>
  Task.find({ profesorId }).populate("classroomId", "grade");

export const findExpiredTasks = () =>
  Task.find({
    fechaEntrega: { $lt: new Date() },
  });
