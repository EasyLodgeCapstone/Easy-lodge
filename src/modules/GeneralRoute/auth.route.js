const router = require("express").Router();
const Auth = require("../../middleware/Auth.js");
const AuthController = require("../authentication/auth.controller.js");

router.post("/login", Auth, AuthController.loginUser);
router.post("/register", Auth, AuthController.registerUser);
router.post("/verify-otp", Auth, AuthController.verifyAccount);
router.post("/resend-otp", Auth, AuthController.resendOtp);
router.post("/forgot-password", Auth, AuthController.forgotPassword);
router.post("/reset-password", Auth, AuthController.resetPassword);
module.exports = router;