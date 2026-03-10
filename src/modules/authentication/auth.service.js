const User = require("./userSchema.js");
const bcrypt = require("bcrypt");
const { TokenService } = require("../../utils/tokens");
const { AuthTokens } = require("../../utils/hash");
const { sendOTPEmail } = require("../email/email.js");


const newToken = TokenService
const hash = AuthTokens


class userServiceActivities {

    async generateOtp(email, name, type) {
        const otp = await sendOTPEmail(email, name, type)
        return otp;
    }

    async generateOtpExpiry() {
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes
        return expiry;
    }


    async createUser(userData) {
        const { email, password, name } = userData;

        // check for existing user
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            throw new ApiError(409, "Identity conflict: Email already taken");
        }

        // Hash password
        const hashedPassword = await hash.hashPassword(password);

        // Generate otp, otp expiry and send otp as email
        const result = await this.generateOtp(email, name, 'VERIFICATION');
        const otp = result.otp
        const otpExpiry = await this.generateOtpExpiry();

        // Create user
        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            otp,
            otpExpiry
        });

        // Return user without sensitive fields
        return User.findById(newUser._id).select("-password -otpExpiry");
    }

    async login(email, password) {
        const user = await User.findOne({ email });
        if (!user) {
            throw new ApiError(404, "User does not exist");
        }

        const isPasswordValid = await hash.comparePassword(password, user.password);
        if (!isPasswordValid) {
            throw new ApiError(401, "Invalid user credentials");
        }

        if (!user.isVerified) {
            throw new ApiError(403, "Account not verified. Please verify your account to log in.");
        }

        // Generate token
        const payload = { id: user._id, role: user.role }
        const token = newToken.generateAccessToken(payload);



        // Remove sensitive data before returning
        const loggedInUser = await User.findById(user._id).select("-password -otp -otpExpiry");
        return { user: loggedInUser, token };
    }

    async verifyAccount(email, otp) {
        const user = await User.findOne({ email });

        if (!user) throw new ApiError(404, "User not found");
        if (user.isVerified) throw new ApiError(400, "Account already verified");

        // Check if OTP matches and hasn't expired
        if (user.otp !== otp) throw new ApiError(400, "Invalid OTP");
        if (new Date() > user.otpExpiry) throw new ApiError(400, "OTP has expired");

        user.isVerified = true;
        user.otp = null; // Clear OTP once used
        user.otpExpiry = null;
        await user.save();

        return user;
    }

    async resendOtp(email) {
        const user = await User.findOne({ email });
        if (!user) throw new ApiError(404, "User not found");

        // Generate otp, otp expiry and send otp as email
        const result = await this.generateOtp(user.email, user.name, 'RESEND_OTP');
        const newOtp = result.otp
        const newOtpExpiry = await this.generateOtpExpiry();

        user.otp = newOtp;
        user.otpExpiry = newOtpExpiry;
        await user.save();

        return user.otp;
    }

    async generateRefreshToken(userId, role) {

        const refreshToken = newToken.generateRefreshToken({ id: userId }, role);

        await User.findByIdAndUpdate(userId, { refreshToken });
        return refreshToken;
    }


    async forgotPassword(email) {
        const user = await User.findOne({ email });
        if (!user) throw new ApiError(404, "User not found");

        // Generate otp, otp expiry and send otp as email
        const result = await this.generateOtp(user.email, user.name, 'PASSWORD_RESET');
        const otp = result.otp
        const otpExpiry = await this.generateOtpExpiry();
        await user.save();


        return otp;
    }

    async resetPassword(email, otp, newPassword) {
        const user = await User.findOne({ email });
        if (!user) throw new ApiError(400, "Invalid or expired OTP");

        user.password = await AuthTokens.hashPassword(newPassword);
        user.otp = null;
        user.otpExpiry = null;
        await user.save();

        return { message: "Password reset successful" };
    }

    async updateUserDetails(userId, updateData) {

        const updates = {}; // will update only provided fields

        if (updateData.name) updates.name = updateData.name;
        if (updateData.email) {
            const existing = await User.findOne({ email: updateData.email, _id: { $ne: userId } });
            if (existing) throw new ApiError(400, "Email already in use by another account");
            updates.email = updateData.email;
        }
        if (updateData.password) {
            updates.password = await AuthTokens.hashPassword(updateData.password);
        }
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updates }, // $set ensures only these fields are touched
            { new: true, runValidators: true }
        ).select("-password -otp -otpExpiry");

        if (!user) throw new ApiError(404, "User not found");
        return user;
    }

    async softDeleteUser(userId) {
        // We mark the user as deleted and set a timestamp
        const user = await User.findByIdAndUpdate(
            userId,
            {
                isDeleted: true,
                deletedAt: new Date(),
                status: "inactive" // Optional: update status for easier filtering
            },
            { new: true }
        );

        if (!user) throw new ApiError(404, "User not found");
        return { message: "Account deactivated successfully" };
    }

    async logout(userId) {
        // Clear the refresh token in the DB to invalidate the session
        await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
    }


    // For all OAuth logins, all have same logic    
    async oAuthLogin(user) {
        // Generate token 
        const token = newToken.generateAccessToken(user._id, user.role);

        // Clean sensitive data before returning user info
        const loggedInUser = await User.findById(user._id).select("-password -otp -otpExpiry");

        return { user: loggedInUser, token };
    }


}


module.exports = userServiceActivities;