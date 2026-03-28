const jwt = require("jsonwebtoken");
const AppError = require("./appError.js");

const Auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader?.startsWith("Bearer ")) {
    return next(new AppError("No token provided", 401));
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: decoded.id, role: decoded.role };//role is added to the req.user object for role-based access control
    next();
  } catch (err) {
    const message = err.name === "TokenExpiredError"
      ? "Access token expired"
      : "Invalid token";
    return next(new AppError(message, 401));
  }
};

const AuthRefresh = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader?.startsWith("Bearer ")) {
      return next(new AppError("No token provided", 401));
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        req.user = { id: decoded.id, role: decoded.role };
        req.refreshToken = token; // Attach the refresh token to the request object for later use
        next();
    } catch (err) {
      const message = err.name === "TokenExpiredError"
        ? "Refresh token expired"
        : "Invalid token";
      return next(new AppError(message, 401));
    }
};

//admin only

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return next(new AppError("Access denied. Admins only.", 403));
  }
  next();
};

//for staff or admin access

const staffOrAdmin = (req, res, next) => {
  const allowed = ["admin", "staff"];
  if (!allowed.includes(req.user?.role)) {
    return next(new AppError("Access denied. Staff or admin only.", 403));
  }
  next();
};

module.exports = { Auth, AuthRefresh, adminOnly, staffOrAdmin };
