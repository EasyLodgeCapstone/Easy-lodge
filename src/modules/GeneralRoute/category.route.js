const router = require("express").Router();
const CategoryController = require("../categories/category.controller.js");
const { Auth, staffOrAdmin } = require("../../middleware/Auth.js");
const { validateData } = require("../../middleware/zodValidation.js");
const { createCategorySchema, updateCategorySchema } = require("../categories/category.validation.js");

// Public route
router.get("/", Auth, CategoryController.getAllCategories);

// Admin/staff only for catalog management
router.post("/", Auth, staffOrAdmin, validateData(createCategorySchema, ["body"]), CategoryController.createCategory);
router.patch("/:id", Auth, staffOrAdmin, validateData(updateCategorySchema, ["body"]), CategoryController.updateCategory);
router.delete("/:id", Auth, staffOrAdmin, CategoryController.deleteCategory);

module.exports = router;