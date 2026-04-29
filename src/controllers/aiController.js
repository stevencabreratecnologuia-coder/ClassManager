import {
  generateAdminReply,
  generateTeacherReply,
  generateTutorReply,
} from "../services/aiService.js";

export const tutorChat = async (req, res, next) => {
  try {
    const reply = await generateTutorReply({
      message: req.body?.message,
      messages: req.body?.messages,
    });

    res.status(200).json({
      status: "success",
      reply,
    });
  } catch (error) {
    next(error);
  }
};

export const adminChat = async (req, res, next) => {
  try {
    const reply = await generateAdminReply({
      message: req.body?.message,
      messages: req.body?.messages,
      mode: req.body?.mode,
    });

    res.status(200).json({
      status: "success",
      reply,
    });
  } catch (error) {
    next(error);
  }
};

export const teacherChat = async (req, res, next) => {
  try {
    const reply = await generateTeacherReply({
      message: req.body?.message,
      messages: req.body?.messages,
    });

    res.status(200).json({
      status: "success",
      reply,
    });
  } catch (error) {
    next(error);
  }
};
