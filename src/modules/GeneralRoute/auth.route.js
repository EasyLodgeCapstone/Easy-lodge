const router = require("express").Router();
const passport = require("../../config/passportConfig.js");
const { Auth, AuthRefresh} = require("../../middleware/Auth.js");
const AuthController = require("../authentication/auth.controller.js");
const { validateData } = require("../../middleware/zodValidation.js");
const { 
    createUserSchema, 
    loginSchema, 
    verifyAccountSchema, 
    resendOtpSchema, 
    forgotPasswordSchema, 
    resetPasswordSchema,
    recoverInitiateSchema,
    recoverVerifySchema } = require("../authentication/authentication.validation.js");


router.post("/login", validateData(loginSchema, ["body"]), AuthController.loginUser);
router.post("/register", validateData(createUserSchema, ["body"]), AuthController.registerUser);
router.post("/verify-otp", validateData(verifyAccountSchema, ["body"]), AuthController.verifyAccount);
router.post("/resend-otp", validateData(resendOtpSchema, ["body"]), AuthController.resendOtp);
router.post("/forgot-password", validateData(forgotPasswordSchema, ["body"]), AuthController.forgotPassword);
router.post("/reset-password", validateData(resetPasswordSchema, ["body"]), AuthController.resetPassword);
router.post("/recover/initiate", validateData(recoverInitiateSchema, ["body"]), AuthController.initiateRecovery);
router.post("/recover/verify", validateData(recoverVerifySchema, ["body"]), AuthController.recoverAccount);

//google and oauth route

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));
router.get("/google/callback", passport.authenticate("google", { session: false, failureRedirect: "/api/auth/login"  }), AuthController.loginWithOauth);//url to be changed to frontend url.

router.post("/refresh-token", AuthRefresh, AuthController.refreshToken);
router.post("/logout", Auth, AuthController.logoutUser);

module.exports = router;