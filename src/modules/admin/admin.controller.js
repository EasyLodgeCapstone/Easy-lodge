const adminServiceActivities = require("./admin.service.js");

class AdminController {
    async registerAdminOrStaff(req, res, next) {
        try {
            const { name, email, password, role, adminSecret } = req.body;

            const user = await adminServiceActivities.createAdminOrStaff({
                name,
                email,
                password,
                role,
                adminSecret,
            });

            res.status(201).json({
                success: true,
                message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully. Please verify your email.`,
                data: user,
            });
        } catch (error) {
            next(error);
        }
    }

   
     //Only admin and staff accounts are allowed through.
    async loginAdmin(req, res, next) {
        try {
            const { email, password } = req.body;

            const result = await adminServiceActivities.adminLogin(email, password);

            res.status(200).json({
                success: true,
                message: "Login successful.",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    //allows for an admin to make another user an admin or a staff
    async updateUserRole(req, res, next) {
        try {
            const targetUserId = parseInt(req.params.id, 10);
            if (isNaN(targetUserId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID",
                });
            }
            const { role } = req.body;

            const updatedUser = await adminServiceActivities.updateUserRole(
                targetUserId,
                role
            );

            res.status(200).json({
                success: true,
                message: `User role updated to '${role}' successfully.`,
                data: updatedUser,
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AdminController();