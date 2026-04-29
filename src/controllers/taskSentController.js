import {
  findSubmissionsByStudent,
  findSubmissionsByTask,
  gradeTaskSubmission,
  submitTaskRecord,
} from "../services/taskSentService.js";

export const submitTask = async (req, res, next) => {
  try {
    const taskSent = await submitTaskRecord({
      taskId: req.params.taskId,
      estudianteId: req.user.id,
      files: req.body.files,
      answer: req.body.answer,
    });

    res.status(201).json({
      status: "success",
      message: "Tarea enviada con exito",
      data: taskSent,
    });
  } catch (error) {
    next(error);
  }
};

export const getSubmissionsByTask = async (req, res, next) => {
  try {
    const submissions = await findSubmissionsByTask(req.params.taskId);

    res.status(200).json({
      status: "success",
      data: submissions,
    });
  } catch (error) {
    next(error);
  }
};

export const getMySubmissions = async (req, res, next) => {
  try {
    const submissions = await findSubmissionsByStudent(req.user.id);

    res.status(200).json({
      status: "success",
      data: submissions,
    });
  } catch (error) {
    next(error);
  }
};

export const gradeTask = async (req, res, next) => {
  try {
    const submission = await gradeTaskSubmission(req.params.id, req.body);

    res.status(200).json({
      status: "success",
      message: "Tarea calificada con exito",
      data: submission,
    });
  } catch (error) {
    next(error);
  }
};
