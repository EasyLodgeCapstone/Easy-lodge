const router = require("express").Router();

const { Auth } = require("../../middleware/Auth.js");
const UsersController = require("./users.controller");
const upload = require("../../config/multer.js");
const { validateData } = require("../../middleware/zodValidation.js");
const { updateProfileSchema } = require("./userProfile.validation.js");


// All user routes are protected
router.get("/profile", Auth, UsersController.getProfile);
router.patch("/profile", Auth, validateData(updateProfileSchema, ["body"]), UsersController.updateProfile);

router.patch("/avatar", Auth, upload.single("avatar"), UsersController.uploadAvatar);

// General image upload
router.post("/images", Auth, upload.array("images", 10), UsersController.uploadImages);

router.delete("/profile", Auth, UsersController.deleteAccount);

module.exports = router;