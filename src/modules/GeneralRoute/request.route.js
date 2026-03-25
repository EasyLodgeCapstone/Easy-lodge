const router = require("express").Router();

const RequestController = require("../requests/request.controller.js");
const { Auth, staffOrAdmin } = require("../../middleware/Auth.js");
const { validateData } = require("../../middleware/zodValidation.js");

const { createRequestSchema, updateStatusSchema } = require("../requests/request.validation.js");

// User routes
router.post("/", Auth, validateData(createRequestSchema, ["body"]), RequestController.createRequest);
router.get("/", Auth, RequestController.getUserRequests); 
router.get("/:id", Auth, RequestController.getRequestById);

// Staff/admin only for status updates.
router.patch("/:id/status", Auth, staffOrAdmin, validateData(updateStatusSchema, ["body"]), RequestController.updateStatus);

module.exports = router;
