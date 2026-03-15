const jwt = require("jsonwebtoken");

const Auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    return res.status(401).json({
      message:
        err.name === "TokenExpiredError"
          ? "Access token expired"
          : "Invalid token",
    });
  }
};

module.exports = Auth;
