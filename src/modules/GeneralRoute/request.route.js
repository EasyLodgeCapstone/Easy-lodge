const router = require("express").Router();

const RequestController = require("../requests/request.controller.js");
const { Auth, staffOrAdmin } = require("../../middleware/Auth.js");
const { validateData } = require("../../middleware/zodValidation.js");
const { createRequestSchema, updateStatusSchema, getRequestsQuerySchema } = require("../requests/request.validation.js");

// User routes
router.post("/", Auth, validateData(createRequestSchema, ["body"]), RequestController.createRequest);
router.get("/", Auth, validateData(getRequestsQuerySchema, ["query"]),  RequestController.getUserRequests);
router.get("/all", Auth, staffOrAdmin, validateData(getRequestsQuerySchema, ["query"]), RequestController.getAllRequests); // Staff/admin only
router.get("/:id", Auth, RequestController.getRequestById);

// User cancellation — only works on pending requests the user owns
router.patch("/:id/cancel", Auth, RequestController.cancelRequest);

// Staff/admin only
router.patch("/:id/status", Auth, staffOrAdmin, validateData(updateStatusSchema, ["body"]), RequestController.updateStatus);

module.exports = router;
