const { ZodError } = require("zod");
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
        const errors = error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        // Pass a structured AppError — message stays a plain string,
        // validation detail goes into the data field where it belongs
        return next(
          new AppError("Validation failed", 400, { errors })
        );
      }

      //  error handler catches unexpected errors
      return next(error);
    }
  };
}

module.exports = { validateData };
