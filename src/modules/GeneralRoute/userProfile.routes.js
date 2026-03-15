const router = require("express").Router();

const UsersController = require("./users.controller");
const authMiddleware = require("../../middleware/auth.middleware");

router.get("/profile", authMiddleware, UsersController.getProfile);

router.patch("/profile", authMiddleware, UsersController.updateProfile);

router.delete("/profile", authMiddleware, UsersController.deleteAccount);

module.exports = router;