import Classroom from "../models/classroom.js";
import { createHttpError } from "../utils/httpError.js";

export const findClassrooms = () =>
  Classroom.find()
    .sort({ createdAt: -1 })
    .populate("profesorId", "name email")
    .populate("estudiantes", "name email");

export const createClassroomRecord = async ({
  grade,
  profesorId,
  estudiantes = [],
}) => {
  const normalizedGrade = String(grade ?? "").trim();

  if (!normalizedGrade || !profesorId) {
    throw createHttpError(400, "Grado y profesor son obligatorios");
  }

  const existingClassroom = await Classroom.findOne({ grade: normalizedGrade });
  if (existingClassroom) {
    throw createHttpError(400, "Ya existe un grado con ese nombre");
  }

  return Classroom.create({
    grade: normalizedGrade,
    profesorId,
    estudiantes,
  });
};

export const findClassroomById = async (id) => {
  const classroom = await Classroom.findById(id)
    .populate("profesorId")
    .populate("estudiantes");

  if (!classroom) {
    throw createHttpError(404, "El grado no ha sido encontrado");
  }

  return classroom;
};

export const updateClassroomRecord = async (id, data) => {
  const updateData = { ...data };
  if (updateData.grade) {
    updateData.grade = String(updateData.grade).trim();
  }

  const classroom = await Classroom.findByIdAndUpdate(id, updateData, {
    new: true,
  });

  if (!classroom) {
    throw createHttpError(404, "El grado no ha sido encontrado");
  }

  return classroom;
};

export const deleteClassroomRecord = async (id) => {
  const classroom = await Classroom.findByIdAndDelete(id);

  if (!classroom) {
    throw createHttpError(404, "El grado no ha sido encontrado");
  }

  return classroom;
};

export const addStudentToClassroom = async (classroomId, studentId) => {
  if (!studentId) {
    throw createHttpError(400, "studentId es obligatorio");
  }

  const classroom = await Classroom.findByIdAndUpdate(
    classroomId,
    { $addToSet: { estudiantes: studentId } },
    { new: true },
  );

  if (!classroom) {
    throw createHttpError(404, "El grado no ha sido encontrado");
  }

  return classroom;
};

export const removeStudentFromClassroom = async (classroomId, studentId) => {
  if (!studentId) {
    throw createHttpError(400, "studentId es obligatorio");
  }

  const classroom = await Classroom.findByIdAndUpdate(
    classroomId,
    { $pull: { estudiantes: studentId } },
    { new: true },
  );

  if (!classroom) {
    throw createHttpError(404, "El grado no ha sido encontrado");
  }

  return classroom;
};
