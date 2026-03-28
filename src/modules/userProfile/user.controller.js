const UsersService = require("./userProfile.services.js");
const ImageService = require("./imageServices.js");
const AppError = require("../../middleware/appError.js");

class UsersController {

    async getProfile(req, res, next) {
        try {

            const user = await UsersService.getProfile(req.user.id);

            res.status(200).json({
                success: true,
                data: user
            });

        } catch (error) {
            next(error);
        }
    }

    async updateProfile(req, res, next) {
        try {

            const user = await UsersService.updateProfile(
                req.user.id,
                req.body
            );

            res.status(200).json({
                success: true,
                message: "Profile updated successfully",
                data: user
            });

        } catch (error) {
           next(error);
        }
    }

    async uploadAvatar(req, res, next) {
        try {
            if (!req.file) {
                throw new AppError("No file uploaded", 400);
            }

            const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
            if (!allowedMimeTypes.includes(req.file.mimetype)) {
                throw new AppError("Avatar must be a JPEG, PNG, or WebP image", 400);
            }

            const { url, publicId } = await ImageService.uploadImages(req.file);
            await UsersService.updateAvatar(req.user.id, url, publicId);

            res.status(200).json({
                success: true,
                message: "Avatar uploaded successfully",
                data: { avatarUrl: url }
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteAccount(req, res, next) {
        try {

            await UsersService.deleteAccount(req.user.id);

            res.status(200).json({
                success: true,
                message: "Account deleted successfully"
            });

        } catch (error) {
            next(error)
        }
    }
}

module.exports = new UsersController();