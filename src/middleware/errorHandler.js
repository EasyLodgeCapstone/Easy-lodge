const AppError = require("./appError.js"); // adjust path as needed
// global error handling middleware, must be defined after all routes and other middleware

const errorHandler = (err, req, res, next) => {

    // Default to 500 if no status code is set
    err.statusCode = err.statusCode || 500;

    // Multer errors (file too large, unexpected field, etc.)
    if (err.name === "MulterError") {
        return res.status(400).json({
            success: false,
            message: err.code === "LIMIT_FILE_SIZE"
                ? "File too large. Maximum size is 5MB."
                : err.message
        });
    }

    // Custom file filter errors from avatarMulter (wrong file type)
    if (err.message && err.message.startsWith("Avatar must be")) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    // Operational/known errors (thrown via AppError) — send clean response
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            ...(err.data && { data: err.data }) // Include additional data if available
        });
    }

    // Drizzle / DB errors
    if (err.code === "23505") { // Postgres unique constraint violation
        return res.status(409).json({
            success: false,
            message: "A record with that value already exists."
        });
    }

    if (err.code === "23503") { // Postgres foreign key violation
        return res.status(400).json({
            success: false,
            message: "Referenced record does not exist."
        });
    }

    // JWT errors
    if (err.name === "JsonWebTokenError") {
        return res.status(401).json({
            success: false,
            message: "Invalid token. Please log in again."
        });
    }

    if (err.name === "TokenExpiredError") {
        return res.status(401).json({
            success: false,
            message: "Token expired. Please log in again."
        });
    }

    // Unexpected / programmer errors — don't leak details in production
    console.error("UNEXPECTED ERROR:", err);

    return res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === "production"
            ? "Something went wrong. Please try again later."
            : err.message
    });
};

module.exports = errorHandler;