const db = require("../../config/db.js");
const { usersTable } = require("../../dbSchema/userSchema.js");
const { eq } = require("drizzle-orm");

const redisClient = require("../../utils/redis-client.js");
const { hashPassword, comparePassword, generateOtp } = require("../../utils/otpAndPassword.utils.js");
const { generateAccessToken, generateRefreshToken, } = require("../../utils/CreateJwtToken.js");
const { sendOTPEmail } = require("../email/email.js");



class userServiceActivities {
    async createUser(userData) {
        const { name, email, password } = userData;

        // check for existing user
        const existingUser = await db.query.usersTable.findFirst({
            where: (user, { eq }) => eq(user.email, email)
        });

        if (existingUser) {
            return res.status(409).json({
                "success": false,
                "message": "Identity conflict: Email already exists"
            });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Generate otp, otp expiry and send otp as email
        const otp = generateOtp();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const user = await db.insert(usersTable).values({
            name,
            email,
            password: hashedPassword,
            otp: otp,
            otpExpiry: otpExpiry,
            isVerified: false
        }).returning();

        await sendOTPEmail(email, name, "VERIFICATION", otp);

        // Return user without sensitive fields
        return user[0];
    }

    async login(email, password) {
        const user = await db.query(usersTable).findFirst({
            where: (user, { eq }) => eq(user.email, email)
        });
        if (!user) {
            return res.status(404).json({
                "success": false,
                "message": "User does not exist"
            });
        }
        if (user.lockUntil && user.lockUntil > new Date()) {
            throw new Error("Account temporarily locked. Try again later.");
        }

        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {

            const attempts = user.loginAttempts + 1;
            if (attempts >= 5) {
                await db.update(usersTable)
                    .set({
                        loginAttempts: attempts,
                        lockUntil: new Date(Date.now() + 10 * 60 * 1000)
                    }) // Lock account for 10 minutes
                    .where(eq(usersTable.email, email));
                return res.status(403).json({
                    "success": false,
                    "message": "Account locked due to multiple failed login attempts. Try again in 10 minutes."
                });
            } else {
                await db.update(usersTable)
                    .set({ loginAttempts: attempts })
                    .where(eq(usersTable.email, email));
                return res.status(401).json({
                    "success": false,
                    "message": "Invalid user credentials"
                });
            }
        }


        if (!user.isVerified) {
            return res.status(403).json({
                "success": false,
                "message": "Account not verified. Please verify your account to log in."
            });
        }

        // Generate token
        const payload = { id: user.id, role: user.role }
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        await redisClient.set(`refreshToken:${user.id}`, refreshToken, 'EX', 7 * 24 * 60 * 60); // Store refresh token in Redis with 7 days expiry
        await db.update(usersTable)
            .set({
                loginAttempts: 0,
                lockUntil: null
            })
            .where(eq(usersTable.id, user.id));
        return {
            user,
            accessToken,
            refreshToken
        };
        // Remove sensitive data before returning
        //const loggedInUser = await User.findById(user._id).select("-password -otp -otpExpiry");
        //return { user: loggedInUser, token };
    }

    async verifyAccount(email, otp) {
        const user = await db.query(usersTable).findFirst({
            where: (user, { eq }) => eq(user.email, email)
        });

        if (!user) return res.status(404).json({ "success": false, "message": "User not found" });
        if (user.isVerified) return res.status(400).json({ "success": false, "message": "Account already verified" });

        // Check if OTP matches and hasn't expired
        if (user.otp !== otp) return res.status(400).json({ "success": false, "message": "Invalid OTP" });
        if (!user.otp) return res.status(404).json({ "success": false, "message": "otp expired" });


        await db.update(usersTable)
            .set({ isVerified: true, otp: null, otpExpiry: null })
            .where(eq(usersTable.email, email));

        return true;
    }

    async resendOtp(email) {
        const user = await db.query(usersTable).findFirst({
            where: (user, { eq }) => eq(user.email, email)
        });

        if (!user) return res.status(404).json({ "success": false, "message": "User not found" });

        // Generate otp, otp expiry and send otp as email
        const otp = generateOtp();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
        await db.update(usersTable)
            .set({ otp: otp, otpExpiry: otpExpiry })
            .where(eq(usersTable.email, email));

        await sendOTPEmail(email, user.name, "VERIFICATION", otp);

        return true;
    }

    async generateRefreshToken(userId, token) {

        const storedToken = await redisClient.get(`refresh:${userId}`);
        if (!storedToken || storedToken !== token) {
            return res.status(400).json({ "success": false, "message": "Invalid refresh session" }); // No valid refresh token found
        }
        const accessToken = generateAccessToken({ id: userId });
        return accessToken;
    }


    async forgotPassword(email) {
        const user = await db.query.usersTable.findFirst({
            where: (user, { eq }) => eq(user.email, email)
        });
        if (!user) return res.status(404).json({ "success": false, "message": "User not found" });

        // Generate otp, otp expiry and send otp as email
        const otp = generateOtp();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        await db.update(usersTable)
            .set({ otp: otp, otpExpiry: otpExpiry })
            .where(eq(usersTable.email, email));

        await sendOTPEmail(email, user.name, "PASSWORD_RESET", otp);
        return otp;
    }

    async resetPassword(email, otp, newPassword) {
        const user = await db.query.usersTable.findFirst({
            where: (user, { eq }) => eq(user.email, email)
        });
        if (!user) { 
            return res.status(404).json({ "success": false, "message": "User not found" });
         }
        if (!user.otp || user.otp !== otp) { 
            return res.status(404).json({ "success": false, "message": "Invalid OTP" }); 
        }
        if (user.otpExpiry < new Date()) {
            return res.status(400).json({ "success": false, "message": "OTP expired" });
        }


        const hashed = await hashPassword(newPassword);
        await db.update(usersTable)
            .set({ password: hashed,
                    otp: null,
                    otpExpiry: null
             })
            .where(eq(usersTable.email, email));

        return { message: "Password reset successful", success: true };
    }

    async logout(userId) {
        // Clear the refresh token in the DB to invalidate the session
        await redisClient.del(`refreshToken:${userId}`);
        return { message: "Logged out successfully", success: true };
    }


    // For all OAuth logins, all have same logic    
    async oAuthLogin(user) {
        user = await db.query.usersTable.findFirst({
            where: (user, { eq }) => eq(user.email, profile.email)
        });

        if (!user) {
            const createdUser = await db.insert(usersTable).values({
                name: profile.name,
                email: profile.email,
                isVerified: true // OAuth users are considered verified
            }).returning();
            user = createdUser[0];
        }
        const accessToken = generateAccessToken({ id: user.id, role: user.role });

        return { user, accessToken };
    }


}


module.exports = new userServiceActivities();