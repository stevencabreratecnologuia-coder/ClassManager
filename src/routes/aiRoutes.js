import { Router } from "express";
import { adminChat, teacherChat, tutorChat } from "../controllers/aiController.js";

const router = Router();

router.post("/tutor-chat", tutorChat);
router.post("/admin-chat", adminChat);
router.post("/teacher-chat", teacherChat);

export default router;
