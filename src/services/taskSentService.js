import Task from "../models/task.js";
import TaskSent from "../models/taskSent.js";
import { createHttpError } from "../utils/httpError.js";

const buildIaAnalysis = (answerText = "", fileText = "") => {
  const source = `${answerText} ${fileText}`.trim();
  const length = source.length;
  const polishedSignals = [
    "en conclusion",
    "por consiguiente",
    "es importante destacar",
    "en sintesis",
    "cabe resaltar",
    "desde una perspectiva",
  ].filter((signal) => source.toLowerCase().includes(signal)).length;
  const possibleIa = length > 450 || (length > 260 && polishedSignals >= 2);
  const percentageIa = possibleIa
    ? Math.min(96, 30 + Math.floor(length / 18) + polishedSignals * 8)
    : 0;

  return {
    possibleIa,
    percentageIa,
    porcentageIa: percentageIa,
    feedback: possibleIa
      ? "La respuesta parece muy estructurada. Conviene validar comprension con preguntas de defensa."
      : "No hay señales fuertes de uso indebido de IA. Porcentaje estimado: 0%.",
  };
};

export const submitTaskRecord = async ({ taskId, estudianteId, files, answer }) => {
  const task = await Task.findById(taskId);
  if (!task) {
    throw createHttpError(404, "Tarea no encontrada");
  }

  const alreadySent = await TaskSent.findOne({
    estudianteId,
    task: taskId,
  });

  if (alreadySent) {
    throw createHttpError(400, "Ya enviaste esta tarea");
  }

  const now = new Date();
  const state = now > task.fechaEntrega ? "Tarde" : "Entregado";

  return TaskSent.create({
    estudianteId,
    task: taskId,
    files,
    fechaEntrega: now,
    state,
    answer,
    analysisIa: buildIaAnalysis(answer?.answer, files),
  });
};

export const findSubmissionsByTask = (taskId) =>
  TaskSent.find({ task: taskId })
    .populate("estudianteId", "name email")
    .populate("task", "title");

export const findSubmissionsByStudent = (estudianteId) =>
  TaskSent.find({ estudianteId }).populate("task", "title fechaEntrega");

export const gradeTaskSubmission = async (submissionId, { note, teacherComments }) => {
  const submission = await TaskSent.findById(submissionId);
  if (!submission) {
    throw createHttpError(404, "Tarea no encontrada");
  }

  submission.note = note;
  submission.teacherComments = teacherComments;

  return submission.save();
};
