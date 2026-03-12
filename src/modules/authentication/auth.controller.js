const userSchema = require("../../dbSchema/userSchema.js")
const bcrypt = require("bcrypt");
const userServiceActivities = require("./auth.service.js");

const onBoardUser = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        const user = await userServiceActivities.createUser({ name, email, password });

        res.status(201).json({ 
            success: true, 
            message: "User created successfully. Please verify your email." 
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


const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await userServiceActivities.login(email, password);

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

const verifyAccount = async (req, res, next) => {
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

const resendOtp = async (req, res, next) => {
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

const refreshToken = async (req, res, next) => {
    try {
        const { userId, role } = req.user; // From decoded refresh token
        const token = await userServiceActivities.generateRefreshToken(userId, role)
        apiResponse(res, 200, { token }, "Token refreshed");
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "An error occurred while refreshing token", 
            error: error.message 
        });
    }   
    
};

const forgotPassword = async (req, res, next) => {
    try {
        const otp = await userServiceActivities.forgotPassword(req.body.email);
        res.status(200).json({ 
            success: true, 
            message: "OTP sent to email if it exists in our system.", 
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

const resetPassword = async (req, res, next) => {
    try {
        const { email, otp, newPassword } = req.body;
        await userServiceActivities.resetPassword(email, otp, newPassword);
        res.status(200).json({ 
            success: true, 
            message: "Password changed successfully" 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "An error occurred while resetting password", 
            error: error.message 
        });
    }
};


const updateProfile = async (req, res, next) => {
    try {
        const user = await userServiceActivities.updateUserDetails(req.user.id, req.body);
       res.status(200).json({ 
        success: true, 
        message: "Profile updated successfully", 
        data: user 
    });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "An error occurred while updating profile", 
            error: error.message 
        });
    }
};

const deleteProfile = async (req, res, next) => {
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

const logoutUser = async (req, res, next) => {
    try {
        await userServiceActivities.logout(req.user.id);
        res.status(200).json({ 
            success: true, 
            message: "Log out successful" 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "An error occurred while logging out", 
            error: error.message 
        });
    }
};

const loginWithOauth = async (req, res, next) => {
    try {
        // Passport's middleware populates req.user
        if (!req.user) {
            throw new ApiError(401, "Authentication failed");
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


module.exports = {
    onBoardUser,
    loginUser,
    verifyAccount,
    resendOtp,
    refreshToken,
    forgotPassword,
    resetPassword,
    updateProfile,
    deleteProfile,
    logoutUser,
    loginWithOauth,

};