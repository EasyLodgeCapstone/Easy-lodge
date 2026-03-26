const ServiceItemService = require("./serviceItem.service.js");
const CategoryService = require("../categories/category.service.js");
const AppError = require("../../middleware/appError.js");

class ServiceItemController {

    async createItem(req, res, next) {
        try {
            const categoryId = parseInt(req.params.categoryId);

            // Verify category exists and is active before adding an item to it
            const category = await CategoryService.getCategoryById(categoryId);
            if (!category || !category.isActive) {
                return next(new AppError("Category not found", 404));
            }

            const item = await ServiceItemService.createItem(categoryId, req.body);
            res.status(201).json({
                success: true,
                message: "Service item created successfully",
                data: item,
            });
        } catch (error) {
            next(error);
        }
    }

    async getItemsByCategory(req, res, next) {
        try {
            const items = await ServiceItemService.getItemsByCategory(
                parseInt(req.params.categoryId)
            );
            res.status(200).json({
                success: true,
                message: "Service items retrieved successfully",
                data: items,
            });
        } catch (error) {
            next(error);
        }
    }

    async getAllItemsAdmin(req, res, next) {
        try {
            const items = await ServiceItemService.getAllItemsAdmin(
                parseInt(req.params.categoryId)
            );
            res.status(200).json({
                success: true,
                message: "All service items retrieved successfully",
                data: items,
            });
        } catch (error) {
            next(error);
        }
    }

    async updateItem(req, res, next) {
        try {
            const item = await ServiceItemService.updateItem(
                parseInt(req.params.id),
                req.body
            );
            if (!item) {
                return next(new AppError("Service item not found", 404));
            }
            res.status(200).json({
                success: true,
                message: "Service item updated successfully",
                data: item,
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteItem(req, res, next) {
        try {
            const item = await ServiceItemService.deleteItem(parseInt(req.params.id));
            if (!item) {
                return next(new AppError("Service item not found", 404));
            }
            res.status(200).json({
                success: true,
                message: "Service item deactivated successfully",
                data: item,
            });
        } catch (error) {
            next(error);
        }
    }

    async reactivateItem(req, res, next) {
        try {
            const item = await ServiceItemService.reactivateItem(parseInt(req.params.id));
            if (!item) {
                return next(new AppError("Service item not found", 404));
            }
            if (item.alreadyActive) {
                return res.status(200).json({
                    success: true,
                    message: "Service item is already active",
                    data: item,
                });
            }
            res.status(200).json({
                success: true,
                message: "Service item reactivated successfully",
                data: item,
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ServiceItemController();