import {
  addStudentToClassroom,
  createClassroomRecord,
  deleteClassroomRecord,
  findClassroomById,
  findClassrooms,
  removeStudentFromClassroom,
  updateClassroomRecord,
} from "../services/classroomService.js";

export const getClassrooms = async (req, res, next) => {
  try {
    const classrooms = await findClassrooms();

    res.status(200).json({
      status: "success",
      data: classrooms,
    });
  } catch (error) {
    next(error);
  }
};

export const createClassroom = async (req, res, next) => {
  try {
    const classroom = await createClassroomRecord(req.body);

    res.status(201).json({
      status: "success",
      data: classroom,
      message: "Grado creado con exito",
    });
  } catch (error) {
    next(error);
  }
};

export const getClassroomById = async (req, res, next) => {
  try {
    const classroom = await findClassroomById(req.params.id);

    res.json({
      status: "success",
      data: classroom,
      message: "Grado encontrado con exito",
    });
  } catch (error) {
    next(error);
  }
};

export const updateClassroom = async (req, res, next) => {
  try {
    const classroom = await updateClassroomRecord(req.params.id, req.body);

    res.json({
      status: "success",
      data: classroom,
      message: "Grado actualizado con exito",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteClassroom = async (req, res, next) => {
  try {
    const classroom = await deleteClassroomRecord(req.params.id);

    res.json({
      status: "success",
      data: classroom,
      message: "Grado eliminado con exito",
    });
  } catch (error) {
    next(error);
  }
};

export const addStudent = async (req, res, next) => {
  try {
    const classroom = await addStudentToClassroom(
      req.params.id,
      req.body.studentId,
    );

    res.json({
      status: "success",
      data: classroom,
      message: "Estudiante agregado con exito",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteStudent = async (req, res, next) => {
  try {
    const classroom = await removeStudentFromClassroom(
      req.params.id,
      req.body.studentId,
    );

    res.json({
      status: "success",
      data: classroom,
      message: "Estudiante eliminado con exito",
    });
  } catch (error) {
    next(error);
  }
};
