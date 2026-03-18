const jwt = require("jsonwebtoken");

const Auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: decoded.id, role: decoded.role };//role is added to the req.user object for role-based access control
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message:
        err.name === "TokenExpiredError"
          ? "Access token expired"
          : "Invalid token",
    });
  }
};

const AuthRefresh = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        req.user = { id: decoded.id, role: decoded.role };
        req.refreshToken = token; // Attach the refresh token to the request object for later use
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message:
                err.name === "TokenExpiredError"
                    ? "Refresh token expired"
                    : "Invalid token",
        });
    }
};

module.exports = { Auth, AuthRefresh };
