const { z, ZodError, json } = require("zod");
const AppError = require("../middleware/appError.js");

function validateData(schema, targets) {
  return async (req, res, next) => {
    try {
      for (const target of targets) {
        if (req[target]) {
          const validatedData = await schema.parseAsync(req[target]);
          req[target] = validatedData;
        }
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Pass all validation errors to the error handler
        // console.log("Validation errors:", error);
        return next(
          new AppError(
            JSON.stringify({
              message: "Validation failed",
              errors: error.issues.map((err) => ({
                field: err.path.join("."),
                message: err.message,
              })),
            }),
            400
          )
        );
      }

      // Let the error handler catch unexpected errors
      return next(error);
    }
  };
}

module.exports = { validateData };
