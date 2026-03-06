const routeNotFound = (req, res, next) => {
  const error = res
    .status(404)
    .json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
  next(error);
};

module.exports = routeNotFound;
