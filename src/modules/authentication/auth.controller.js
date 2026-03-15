const userServiceActivities = require("./auth.service.js");

class AuthController {

    async registerUser(req, res) {
        try {
            const { name, email, password } = req.body;

            const user = await userServiceActivities.createUser({ name, email, password });

            res.status(201).json({
                success: true,
                message: "User created successfully. Please verify your email.",
                data: user
            });
        } catch (err) {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "An error occurred while creating the user",
                    error: err.message
                });
            }
        }
    }


    async loginUser(req, res) {
        try {
            const { email, password } = req.body;

            const result = await userServiceActivities.login(email, password);

            res.status(200).json({
                success: true,
                message: "Login successful. Please verify your email if you haven't already.",

            });

        } catch (error) {
            res.status(500).json({
                success: false, message: "An error occurred during login",
                error: error.message
            });
        }
    };

    async verifyAccount(req, res) {
        try {
            const { email, otp } = req.body;

            await userServiceActivities.verifyAccount(email, otp);

            res.status(200).json({
                success: true,
                message: "Account verified successfully. You can now log in."
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "An error occurred during account verification",
                error: error.message
            });
        }
    };

    async resendOtp(req, res) {
        try {
            const { email } = req.body;

            const result = await userServiceActivities.resendOtp(email);

            res.status(200).json({
                success: true,
                message: "OTP resent successfully. Please check your email.",
                otp: result // For testing purposes only. Remove in production.
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: "An error occurred while resending OTP",
                error: error.message
            });
        }
    };

    async refreshToken(req, res) {
        try {
            const { id } = req.user; // From decoded refresh token
            const token = await userServiceActivities.generateRefreshToken(id)
            res.status(200).json({
                success: true,
                message: "Token refreshed successfully",
                data: { token }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "An error occurred while refreshing token",
                error: error.message
            });
        }

    };

    async forgotPassword(req, res) {
        try {
            await userServiceActivities.forgotPassword(req.body.email);
            res.status(200).json({
                success: true,
                message: "OTP sent to email if it exists",
                otp // For testing purposes only. Remove in production.
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "An error occurred while sending OTP",
                error: error.message
            });
        }
    };

    async resetPassword(req, res) {
        try {
            const { email, otp, newPassword } = req.body;
            await userServiceActivities.resetPassword(email, otp, newPassword);
            res.status(200).json({
                success: true,
                message: "Password reset successful"
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "An error occurred while resetting password",
                error: error.message
            });
        }
    };


    async deleteProfile(req, res, next) {
        try {
            const result = await userServiceActivities.softDeleteUser(req.user.id);
            res.status(200).json({
                success: true,
                message: "Profile deleted successfully",
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "An error occurred while deleting profile",
                error: error.message
            });
        }
    };

    async logoutUser(req, res) {
        try {
            await userServiceActivities.logout(req.user.id);
            res.status(200).json({
                success: true,
                message: "Logout successful"
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "An error occurred while logging out",
                error: error.message
            });
        }
    };

    async loginWithOauth(req, res, next) {
        try {
            // Passport's middleware populates req.user
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication failed"
                });
            }

            const result = await userServiceActivities.oAuthLogin(req.user);

            res.status(200).json({
                success: true,
                message: "Login successful",
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "An error occurred while logging in with OAuth",
                error: error.message
            });
        }
    };
}

module.exports = new AuthController();