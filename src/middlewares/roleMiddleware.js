export const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({
        status: "error",
        message: "Acceso denegado",
      });
    }
    next();
  };
};
