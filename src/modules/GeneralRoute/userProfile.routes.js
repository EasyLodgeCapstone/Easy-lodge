const router = require("express").Router();

const { Auth } = require("../../middleware/Auth.js");
const UsersController = require("../userProfile/user.controller.js");
const avatarUpload = require("../../config/multerAvatar.js");
const { validateData } = require("../../middleware/zodValidation.js");
const { updateProfileSchema } = require("../userProfile/userProfile.validation.js");


// All user routes are protected
router.get("/profile", Auth, UsersController.getProfile);
router.patch("/profile", Auth, validateData(updateProfileSchema, ["body"]), UsersController.updateProfile);

router.patch("/avatar", Auth, avatarUpload.single("avatar"), UsersController.uploadAvatar);

router.delete("/profile", Auth, UsersController.deleteAccount);

module.exports = router;