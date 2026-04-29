export const analyzeIa = async (req, res, next) => {
  const { answer } = req.body;

  if (answer?.typeAnswer === "Texto") {
    req.analyzeIa = true;
  } else {
    req.analyzeIa = false;
  }
  next();
};
