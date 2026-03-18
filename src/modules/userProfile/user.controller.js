const UsersService = require("./users.service");

class UsersController {

    async getProfile(req, res) {
        try {

            const user = await UsersService.getProfile(req.user.id);

            res.status(200).json({
                success: true,
                data: user
            });

        } catch (error) {
            console.error("Error fetching profile:", error);
            res.status(500).json({
                success: false,
                message: "An error occurred while fetching profile",
                error: error.message
            });
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
            console.error("Error updating profile:", error);
            res.status(500).json({
                success: false,
                message: "An error occurred while updating profile",
                error: error.message
            });
        }
    }

    async deleteAccount(req, res, next) {
        try {

            const result = await UsersService.deleteAccount(req.user.id);

            res.status(200).json({
                success: true,
                message: "Account deleted",
                data: result
            });

        } catch (error) {
            console.error("Error deleting account:", error);
            res.status(500).json({
                success: false,
                message: "An error occurred while deleting account",
                error: error.message
            });
        }
    }
}

module.exports = new UsersController();