const router = require("express").Router({ mergeParams: true }); // mergeParams gives access to :categoryId from parent router
const ServiceItemController = require("../serviceItems/serviceitem.controller.js");
const { Auth, staffOrAdmin } = require("../../middleware/Auth.js");
const { validateData } = require("../../middleware/zodValidation.js");
const { createServiceItemSchema, updateServiceItemSchema } = require("../serviceItems/serviceitem.validation.js");

// Public — users browse items when building a request
router.get("/", Auth, ServiceItemController.getItemsByCategory);

// Admin/staff only — catalog management
router.get("/all", Auth, staffOrAdmin, ServiceItemController.getAllItemsAdmin);
router.post("/", Auth, staffOrAdmin, validateData(createServiceItemSchema, ["body"]), ServiceItemController.createItem);
router.patch("/:id", Auth, staffOrAdmin, validateData(updateServiceItemSchema, ["body"]), ServiceItemController.updateItem);
router.delete("/:id", Auth, staffOrAdmin, ServiceItemController.deleteItem);

router.patch("/:id/reactivate", Auth, staffOrAdmin, ServiceItemController.reactivateItem);
module.exports = router;