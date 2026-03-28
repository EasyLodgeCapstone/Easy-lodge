const express = require("express");
const router = express.Router();

const adminController = require("../admin/admin.controller.js");
const { Auth, adminOnly } = require("../../middleware/Auth.js");
const { validateData } = require("../../middleware/zodValidation.js");
const { createAdminOrStaffSchema, adminLoginSchema, updateUserRoleSchema, } = require("../admin/admin.validation.js");

//requires admin secret
router.post( "/register", validateData(createAdminOrStaffSchema, ["body"]),adminController.registerAdminOrStaff );
router.post( "/login", validateData(adminLoginSchema, ["body"]), adminController.loginAdmin );

//admin only
router.patch( "/users/:id/role", Auth, adminOnly, validateData(updateUserRoleSchema, ["body"]), adminController.updateUserRole );

module.exports = router;