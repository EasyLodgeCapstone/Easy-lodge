const CategoryService = require("./category.service.js");
const AppError = require("../../middleware/appError.js");

class CategoryController {

    async createCategory(req, res, next) {
        try {
            const category = await CategoryService.createCategory(req.body);
            res.status(201).json({
                success: true,
                message: "Category created successfully",
                data: category,
            });
        } catch (error) {
            next(error);
        }
    }

    async getAllCategories(req, res, next) {
        try {
            const categories = await CategoryService.getAllCategories();
            res.status(200).json({
                success: true,
                message: "Categories retrieved successfully",
                data: categories,
            });
        } catch (error) {
            next(error);
        }
    }

    async getAllCategoriesAdmin(req, res, next) {
        try {
            const categories = await CategoryService.getAllCategoriesAdmin();
            res.status(200).json({
                success: true,
                message: "All categories retrieved successfully",
                data: categories,
            });
        } catch (error) {
            next(error);
        }
    }

    async updateCategory(req, res, next) {
        try {
            const category = await CategoryService.updateCategory(req.params.id, req.body);
            if (!category) {
                return next(new AppError("Category not found", 404));
            }
            res.status(200).json({
                success: true,
                message: "Category updated successfully",
                data: category,
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteCategory(req, res, next) {
        try {
            const category = await CategoryService.deleteCategory(req.params.id);
            if (!category) {
                return next(new AppError("Category not found", 404));
            }
            res.status(200).json({
                success: true,
                message: "Category deactivated successfully",
                data: category,
            });
        } catch (error) {
            next(error);
        }
    }

    async reactivateCategory(req, res, next) {
        try {
            const category = await CategoryService.reactivateCategory(req.params.id);
            if (!category) {
                return next(new AppError("Category not found", 404));
            }
            if (category.alreadyActive) {
                return res.status(200).json({
                    success: true,
                    message: "Category is already active",
                    data: category,
                });
            }
            res.status(200).json({
                success: true,
                message: "Category reactivated successfully",
                data: category,
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CategoryController();