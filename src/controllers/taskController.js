import {
  createTaskRecord,
  deleteTaskRecord,
  findExpiredTasks,
  findTaskById,
  findTasks,
  findTasksByClassroom,
  findTasksByProfessor,
  updateTaskRecord,
} from "../services/taskService.js";

export const createTask = async (req, res, next) => {
  try {
    const task = await createTaskRecord({
      ...req.body,
      classroomId: req.params.classroomId,
      profesorId: req.user.id,
    });

    res.status(201).json({
      status: "success",
      data: task,
      message: "Tarea creada con exito",
    });
  } catch (error) {
    next(error);
  }
};

export const getTasks = async (req, res, next) => {
  try {
    const tasks = await findTasks();

    res.status(200).json({
      status: "success",
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (req, res, next) => {
  try {
    const task = await findTaskById(req.params.id);

    res.status(200).json({
      status: "success",
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const task = await updateTaskRecord(req.params.id, req.body);

    res.status(200).json({
      status: "success",
      data: task,
      message: "Tarea actualizada con exito",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const task = await deleteTaskRecord(req.params.id);

    res.status(200).json({
      status: "success",
      data: task,
      message: "Tarea eliminada con exito",
    });
  } catch (error) {
    next(error);
  }
};

export const getTaskByClassroom = async (req, res, next) => {
  try {
    const tasks = await findTasksByClassroom(req.params.classroomId);

    res.status(200).json({
      status: "success",
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

export const getTasksByProfessor = async (req, res, next) => {
  try {
    const tasks = await findTasksByProfessor(req.params.profesorId);

    res.status(200).json({
      status: "success",
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

export const getExpiredTasks = async (req, res, next) => {
  try {
    const tasks = await findExpiredTasks();

    res.status(200).json({
      status: "success",
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};
