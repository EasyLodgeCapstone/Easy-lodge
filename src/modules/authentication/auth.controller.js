
const { ApiError } = require("../../helpers/apiError");
const { apiResponse } = require("../../helpers/apiResponse");
const User = require("./onBoarding.model");
const bcrypt = require("bcrypt");
const userServiceActivities = require("./onBoarding.activities");


const userService = new userServiceActivities();

const onBoardUser = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        const user = await userService.createUser({ name, email, password });

        apiResponse(res, 201, user, "User registered successfully");
    } catch (err) {
        next(err);
    }
}


const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await userService.login(email, password);

        apiResponse(res, 200, user, "Login successful");

    } catch (error) {
        next(error);
    }
};

const verifyAccount = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        await userService.verifyAccount(email, otp);

        apiResponse(res, 200, null, "Account verified successfully");
    } catch (error) {
        next(error);
    }
};

const resendOtp = async (req, res, next) => {
    try {
        const { email } = req.body;

        const result = await userService.resendOtp(email);

        apiResponse(res, 200, result, "A new OTP has been sent to your email");

    } catch (error) {
        next(error);
    }
};

const refreshToken = async (req, res, next) => {
    try {
        const { userId, role } = req.user; // From decoded refresh token
        const token = await userService.generateRefreshToken(userId, role)
        apiResponse(res, 200, { token }, "Token refreshed");
    } catch (error) {
        next(error);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const otp = await userService.forgotPassword(req.body.email);
        apiResponse(res, 200, null, "Reset OTP sent to email");
    } catch (error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { email, otp, newPassword } = req.body;
        await userService.resetPassword(email, otp, newPassword);
        apiResponse(res, 200, null, "Password changed successfully");
    } catch (error) {
        next(error);
    }
};


const updateProfile = async (req, res, next) => {
    try {
        const user = await userService.updateUserDetails(req.user.id, req.body);
        apiResponse(res, 200, user, "Profile updated successfully");
    } catch (error) {
        next(error);
    }
};

const deleteProfile = async (req, res, next) => {
    try {
        const result = await userService.softDeleteUser(req.user.id);
        apiResponse(res, 200, null, result.message);
    } catch (error) {
        next(error);
    }
};

const logoutUser = async (req, res, next) => {
    try {
        await userService.logout(req.user.id);
        apiResponse(res, 200, null, "Logged out successfully");
    } catch (error) {
        next(error);
    }
};

const loginWithOauth = async (req, res, next) => {
    try {
        // Passport's middleware populates req.user
        if (!req.user) {
            throw new ApiError(401, "Authentication failed");
        }

        const result = await userService.oAuthLogin(req.user);

        apiResponse(res, 200, result, " login successful");
    } catch (error) {
        next(error);
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