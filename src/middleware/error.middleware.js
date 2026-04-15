function notFound(req, res, _next) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

function errorHandler(error, _req, res, _next) {
  const status = error.statusCode || 500;
  const message = error.message || "Unexpected server error.";

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({ message });
}

module.exports = {
  notFound,
  errorHandler
};
