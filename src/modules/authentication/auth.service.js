const { db } = require("../../config/db.js");
const { usersTable } = require("../../dbSchema/userSchema.js");
const { eq } = require("drizzle-orm");

const redisClient = require("../../utils/redis-client.js");
const { hashPassword, comparePassword, generateOtp } = require("../../utils/otpAndPassword.utils.js");
const { generateAccessToken, generateRefreshToken, } = require("../../utils/CreateJwtToken.js");
const { sendOTPEmail } = require("../email/email.js");
const AppError = require("../../middleware/appError.js");

const Max_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 1000; // 2 minutes
const GRACE_PERIOD_DAYS = 90;//for account deletion 


class userServiceActivities {
    async createUser(userData) {
        const { name, email, password } = userData;

        // check for existing user
        const existingUser = await db.query.usersTable.findFirst({
            where: (user, { eq }) => eq(user.email, email)
        });

        if (existingUser) {
            throw new AppError("Identity conflict: Email already exists", 400);
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
        const { password: _pw, otp: _otp, otpExpiry: _exp, ...safeUser } = user[0];
        return safeUser;
    }

    async login(email, password) {
        const user = await db.query.usersTable.findFirst({
            where: (user, { eq }) => eq(user.email, email)
        });
        if (!user) {
            throw new AppError("user does not exist", 401);
        }

        if (!user.password) {
            throw new AppError("this account was created via google, please sign in with google", 401);
        }

        // i dont know but since we have a specific route for admin/staff login...maybe enforce it??? or not??
        //  i'll keep it commented out for now, uncomment if necessary
        /*
        if (user.role !== "user") {
            throw new AppError("Unauthorized", 401);
        }*/

        if (user.isDeleted) {
            const deletedAt = new Date(user.deletedAt);
            const daysSinceDeletion = (Date.now() - deletedAt) / (1000 * 60 * 60 * 24);

            if (daysSinceDeletion > GRACE_PERIOD_DAYS) {
                throw new AppError("This account has been permanently deactivated.", 401);
            }

            throw new AppError(
                "This account has been deleted. Would you like to recover it?",
                423, // 423 Locked
                { recoverable: true, email }
            );
        }

        if (user.lockUntil && user.lockUntil > new Date()) {
            const secondsLeft = Math.ceil((user.lockUntil - new Date()) / 1000);
            const minutesLeft = Math.ceil(secondsLeft / 60);
            throw new AppError(
                `Account temporarily locked. Try again in ${minutesLeft} minute${minutesLeft > 1 ? "s" : ""} .`,
                 403,
                  { lockUntil: user.lockUntil, secondsRemaining: secondsLeft });
        }

        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {

            const attempts = user.loginAttempts + 1;
            const remainingAttempts = Max_LOGIN_ATTEMPTS - attempts;

            if (attempts >= Max_LOGIN_ATTEMPTS) {
                const lockUntil = new Date(Date.now() + LOCK_TIME);
                await db.update(usersTable)
                    .set({
                        loginAttempts: attempts,
                        lockUntil
                    }) // Lock account for the specified time
                    .where(eq(usersTable.email, email));
                throw new AppError(
                    "Account temporarily locked due to multiple failed login attempts. Try again later (after 2m mins).",
                     403, 
                     {loginAttempts: attempts, lockUntil });
            } else {
                await db.update(usersTable)
                    .set({ loginAttempts: attempts })
                    .where(eq(usersTable.email, email));
                throw new AppError(
                    "Invalid user credentials, multiple tries will trigger account lockout.",
                     401,
                      { loginAttempts: attempts, remainingAttempts }
                    );
            }
        }


        if (!user.isVerified) {
            throw new AppError("Account not verified. Please verify your account to log in.", 403);
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

        // remove sensitive data before returning
        const { password: _pw, otp: _otp, otpExpiry: _exp, ...safeUser } = user;
        
        return {
            user: safeUser,
            accessToken,
            refreshToken
        };
    }

    async verifyAccount(email, otp) {
        //const normalizedOtp = String(otp).trim();
        const user = await db.query.usersTable.findFirst({
            where: (user, { eq }) => eq(user.email, email)
        });

        if (!user) throw new AppError("User not found", 404);
        if (user.isVerified) throw new AppError("Account already verified", 400);

        // Check if OTP matches and hasn't expired
        if (!user.otp || !user.otpExpiry) throw new AppError("Otp expired or not found, please request a new one", 400);
        if (user.otpExpiry < new Date()) throw new AppError("OTP expired, request a new one", 400);
        if (user.otp !== otp) throw new AppError("Invalid OTP", 400);


        await db.update(usersTable)
            .set({ isVerified: true, otp: null, otpExpiry: null })
            .where(eq(usersTable.email, email));

        return true;
    }

    async resendOtp(email) {
        const user = await db.query.usersTable.findFirst({
            where: (user, { eq }) => eq(user.email, email)
        });

        if (!user) throw new AppError("User not found", 404);
        if (user.isVerified) throw new AppError("Account is already verified", 400);

        // Generate otp, otp expiry and send otp as email
        const otp = generateOtp();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
        await db.update(usersTable)
            .set({ otp: otp, otpExpiry: otpExpiry })
            .where(eq(usersTable.email, email));

        await sendOTPEmail(email, user.name, "VERIFICATION", otp);

        return true; //return otp for testing
    }

    async refreshAccessToken(userId, token) {

        const storedToken = await redisClient.get(`refreshToken:${userId}`);
        if (!storedToken || storedToken !== token) {
            throw new AppError("Invalid or expired refresh session, please log in again", 401); // No valid refresh token found
        }
        const accessToken = generateAccessToken({ id: userId });
        return accessToken;
    }


    async forgotPassword(email) {
        const user = await db.query.usersTable.findFirst({
            where: (user, { eq }) => eq(user.email, email)
        });
        if (!user) throw new AppError("User not found", 404);

        // Generate otp, otp expiry and send otp as email
        const otp = generateOtp();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        await db.update(usersTable)
            .set({ otp, otpExpiry })
            .where(eq(usersTable.email, email));

        await sendOTPEmail(email, user.name, "PASSWORD_RESET", otp);
        return true;//or return otp
    }

    async resetPassword(email, otp, newPassword) {
        const user = await db.query.usersTable.findFirst({
            where: (user, { eq }) => eq(user.email, email)
        });
        if (!user) { 
            throw new AppError("User not found", 404);
        }
        if (!user.otp || user.otp !== otp) { 
            throw new AppError("Invalid OTP", 400);
        }
        if (user.otpExpiry < new Date()) {
            throw new AppError("OTP expired", 400);
        }


        const hashed = await hashPassword(newPassword);
        await db.update(usersTable)
            .set({ password: hashed,
                    otp: null,
                    otpExpiry: null
             })
            .where(eq(usersTable.email, email));

        return true;
    }

    async initiateRecovery(email) {
        const user = await db.query.usersTable.findFirst({
            where: (u, { eq }) => eq(u.email, email)
        });

        if (!user) throw new AppError("User not found", 404);
        if (!user.isDeleted) throw new AppError("Account is not deleted", 400);

        const deletedAt = new Date(user.deletedAt);
        const daysSinceDeletion = (Date.now() - deletedAt) / (1000 * 60 * 60 * 24);

        if (daysSinceDeletion > GRACE_PERIOD_DAYS) {
            throw new AppError("Recovery period has expired. This account can no longer be recovered.", 403);
        }

        const otp = generateOtp();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);//10 mins

        await db.update(usersTable)
            .set({ otp, otpExpiry })
            .where(eq(usersTable.email, email));

        await sendOTPEmail(email, user.name, "ACCOUNT_RECOVERY", otp);
        return true;
    }

    async recoverAccount(email, otp) {
        const user = await db.query.usersTable.findFirst({
            where: (u, { eq }) => eq(u.email, email)
        });

        if (!user) throw new AppError("User not found", 404);
        if (!user.isDeleted) throw new AppError("Account is not deleted", 400);

        const deletedAt = new Date(user.deletedAt);
        const daysSinceDeletion = (Date.now() - deletedAt) / (1000 * 60 * 60 * 24);

        if (daysSinceDeletion > GRACE_PERIOD_DAYS) {
            throw new AppError("Recovery period has expired.", 403);
        }

        if (!user.otp || !user.otpExpiry) throw new AppError("No OTP found, please request a new one", 400);
        if (user.otpExpiry < new Date()) throw new AppError("OTP expired, request a new one", 400);
        if (user.otp !== otp) throw new AppError("Invalid OTP", 400);

        // Reactivate the account
        await db.update(usersTable)
            .set({
                isDeleted: false,
                deletedAt: null,
                otp: null,
                otpExpiry: null,
            })
            .where(eq(usersTable.email, email));

        // Log them in — generate tokens
        const freshUser = await db.query.usersTable.findFirst({
            where: (u, { eq }) => eq(u.email, email)
        });

        const payload = { id: freshUser.id, role: freshUser.role };
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        await redisClient.set(`refreshToken:${freshUser.id}`, refreshToken, 'EX', 7 * 24 * 60 * 60);
        const { password: _pw, otp: _otp, otpExpiry: _exp, ...safeUser } = freshUser;
        return { user: safeUser, accessToken, refreshToken };
    }

    async logout(userId) {
        // Clear the refresh token in the DB to invalidate the session
        await redisClient.del(`refreshToken:${userId}`);
        return true;
    }


    // For all OAuth logins, all have same logic    
    async oAuthLogin(profile) {
        let user = await db.query.usersTable.findFirst({
            where: (u, { eq }) => eq(u.email, profile.email)
        });

        if (user && user.isDeleted) {
            const daysSinceDeletion = (Date.now() - new Date(user.deletedAt)) / (1000 * 60 * 60 * 24);
            if (daysSinceDeletion > GRACE_PERIOD_DAYS) {
                throw new AppError("This account has been permanently deactivated.", 401);
            };
            await db.update(usersTable)
                .set({
                    isDeleted: false,
                    deletedAt: null,
                    otp: null,
                    otpExpiry: null
                })
                .where(eq(usersTable.id, user.id));

            user = await db.query.usersTable.findFirst({
                where: (u, { eq }) => eq(u.id, user.id)
            });
        }
        if (!user) {
            const createdUser = await db.insert(usersTable).values({
                name: profile.name,
                email: profile.email,
                isVerified: true // OAuth users are considered verified
            }).returning();
            user = createdUser[0];
        }
        const accessToken = generateAccessToken({ id: user.id, role: user.role });

        // remove sensitive data before returning
        const { password: _pw, otp: _otp, otpExpiry: _exp, ...safeUser } = user;
        return { user: safeUser, accessToken };
    }
}


module.exports = new userServiceActivities();