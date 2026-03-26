const userServiceActivities = require("./auth.service.js");

class AuthController {

    async registerUser(req, res, next) {
        try {
            const { name, email, password } = req.body;

            const user = await userServiceActivities.createUser({ name, email, password });

            res.status(201).json({
                success: true,
                message: "User created successfully. Please verify your email.",
                data: user
            });
        } catch (error) {
            next(error);
        }
    }


    async loginUser(req, res, next) {
        try {
            const { email, password } = req.body;

            const result = await userServiceActivities.login(email, password);

            res.status(200).json({
                success: true,
                message: "Login successful. Please verify your email if you haven't already.",
                data: result
            });

        } catch (error) {
            next(error);
        }
    }

    async verifyAccount(req, res, next) {
        try {
            const { email, otp } = req.body;

            await userServiceActivities.verifyAccount(email, otp);

            res.status(200).json({
                success: true,
                message: "Account verified successfully. You can now log in."
            });
        } catch (error) {
            next(error);
        }
    }

    async resendOtp(req, res, next) {
        try {
            const { email } = req.body;

            const result = await userServiceActivities.resendOtp(email); // remove the const result later and remove otp from response.

            res.status(200).json({
                success: true,
                message: "OTP resent successfully. Please check your email.",
                //otp: result // For testing purposes only. Remove in production.
            });

        } catch (error) {
            next(error);
        }
    }

    async refreshToken(req, res, next) {
        try {
            const token = await userServiceActivities.refreshAccessToken(req.user.id, req.refreshToken);
            res.status(200).json({
                success: true,
                message: "Token refreshed successfully",
                data: { token }
            });
        } catch (error) {
            next(error);
        }
    }

    async forgotPassword(req, res, next) {
        try {
            const otp = await userServiceActivities.forgotPassword(req.body.email);
            res.status(200).json({
                success: true,
                message: "OTP sent to email if it exists",
                //otp 
                // For testing purposes only. Remove in production.
            });
        } catch (error) {
            next(error);
        }
    }

    async resetPassword(req, res, next) {
        try {
            const { email, otp, newPassword } = req.body;
            await userServiceActivities.resetPassword(email, otp, newPassword);
            res.status(200).json({
                success: true,
                message: "Password reset successful"
            });
        } catch (error) {
            next(error);
        }
    }

    async initiateRecovery(req, res, next) {
        try {
            const { email } = req.body;
            await userServiceActivities.initiateRecovery(email);
            res.status(200).json({
                success: true,
                message: "Recovery OTP sent to your email."
            });
        } catch (error) {
            next(error);
        }
    }

    async recoverAccount(req, res, next) {
        try {
            const { email, otp } = req.body;
            const result = await userServiceActivities.recoverAccount(email, otp);
            res.status(200).json({
                success: true,
                message: "Account recovered successfully. You are now logged in.",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async logoutUser(req, res, next) {
        try {
            await userServiceActivities.logout(req.user.id);
            res.status(200).json({
                success: true,
                message: "Logout successful"
            });
        } catch (error) {
            next(error);
        }
    }

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
            next(error);
        }
    }
}

module.exports = new AuthController();