import Task from "../models/task.js";

export const verifyTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({
        status: "error",
        message: "La tarea no ha sido encontrada",
      });
    }

    req.task = task;
    next();
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error interno del servidor",
    });
  }
};
