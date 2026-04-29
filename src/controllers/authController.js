import { loginUser, registerUser } from "../services/authService.js";

export const register = async (req, res, next) => {
  try {
    const data = await registerUser(req.body);

    res.status(201).json({
      status: "success",
      message: "Usuario creado con exito.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const data = await loginUser(req.body);

    res.status(200).json({
      status: "success",
      message: "Inicio de sesion exitoso.",
      data,
    });
  } catch (error) {
    next(error);
  }
};
