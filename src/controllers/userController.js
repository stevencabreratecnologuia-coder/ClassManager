import {
  createUserRecord,
  deleteUserRecord,
  findUsers,
  updateUserRecord,
} from "../services/userService.js";

export const getUsers = async (req, res, next) => {
  try {
    const users = await findUsers(req.query);

    res.status(200).json({
      status: "success",
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const user = await createUserRecord(req.body);

    res.status(201).json({
      status: "success",
      data: user,
      message: "Usuario creado con exito",
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await updateUserRecord(req.params.id, req.body, req.user.id);

    res.status(200).json({
      status: "success",
      data: user,
      message: "Usuario actualizado con exito",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const user = await deleteUserRecord(req.params.id, req.user.id);

    res.status(200).json({
      status: "success",
      data: user,
      message: "Usuario eliminado con exito",
    });
  } catch (error) {
    next(error);
  }
};
