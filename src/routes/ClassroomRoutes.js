import { Router } from "express";
import {
  addStudent,
  createClassroom,
  deleteClassroom,
  deleteStudent,
  getClassroomById,
  getClassrooms,
  updateClassroom,
} from "../controllers/classroomController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/", getClassrooms);
router.get("/:id", getClassroomById);
router.post("/", roleMiddleware("Admin"), createClassroom);
router.put("/:id", roleMiddleware("Admin"), updateClassroom);
router.delete("/:id", roleMiddleware("Admin"), deleteClassroom);
router.post("/:id/students", roleMiddleware("Admin"), addStudent);
router.delete("/:id/students", roleMiddleware("Admin"), deleteStudent);

export default router;
