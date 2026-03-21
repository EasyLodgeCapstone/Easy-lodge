const router = require("express").Router();

const RequestController = require("../../modules/services/request.controller");
const authMiddleware = require("../../middleware/auth.middleware");

router.post("/", authMiddleware, RequestController.createRequest);

router.get("/", authMiddleware, RequestController.getRequests);

router.patch("/:id", authMiddleware, RequestController.updateStatus);

module.exports = router;
