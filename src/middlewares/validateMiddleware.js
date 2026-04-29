export const validateFields = (fields) => {
  return (req, res, next) => {
    for (let field of fields) {
      const value = req.body[field];
      if (value === undefined || value === null || String(value).trim() === "") {
        return res.status(400).json({
          status: "error",
          message: `El campo ${field} es obligatorio`,
        });
      }
    }
    next();
  };
};
