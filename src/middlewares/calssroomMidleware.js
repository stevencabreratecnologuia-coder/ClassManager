import Classroom from "../models/classroom.js";

export const verifyClassroomOwner = async (req, res, next) => {
  try {
    const classroom = await Classroom.findById(req.params.classroomId);

    if (!classroom) {
      return res.status(404).json({
        status: "error",
        message: "El grado no ha sido encontrado",
      });
    }

    if (classroom.profesorId.toString() !== req.user.id) {
      return res.status(403).json({
        status: "error",
        message: "Acceso denegado",
      });
    }

    req.classroom = classroom;
    next();
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error interno del servidor",
    });
  }
};
