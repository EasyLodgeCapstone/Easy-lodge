class AppError extends Error {
    constructor(message, statusCode, data=null) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true; // Distinguishes known errors from unexpected crashes
        this.data = data; // Optional additional data for debugging or client information
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;