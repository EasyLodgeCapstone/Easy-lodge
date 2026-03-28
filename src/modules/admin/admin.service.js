const { db } = require("../../config/db.js");
const { usersTable } = require("../../dbSchema/userSchema.js");
const { eq } = require("drizzle-orm");

const redisClient = require("../../utils/redis-client.js");
const { hashPassword, comparePassword, generateOtp } = require("../../utils/otpAndPassword.utils.js");
const { generateAccessToken, generateRefreshToken } = require("../../utils/CreateJwtToken.js");
const { sendOTPEmail } = require("../email/email.js");
const AppError = require("../../middleware/appError.js");

const Max_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 1000; // 2 minutes
GRACE_PERIOD_DAYS = 90;//for account deletion 

class AdminServiceActivities {

    async createAdminOrStaff({ name, email, password, role, adminSecret }) {
        if (adminSecret !== process.env.ADMIN_SECRET) {
            throw new AppError("Invalid admin secret", 403);
        }

        const existingUser = await db.query.usersTable.findFirst({
            where: (user, { eq }) => eq(user.email, email),
        });

        if (existingUser) {
            throw new AppError("Email already exists", 409);
        }

        const hashedPassword = await hashPassword(password);

        const otp = generateOtp();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        const user = await db
            .insert(usersTable)
            .values({
                name,
                email,
                password: hashedPassword,
                role, // "admin" or "staff"
                otp,
                otpExpiry,
                isVerified: false,
            })
            .returning();

        await sendOTPEmail(email, name, "VERIFICATION", otp);

        // remove sensitive fields before returning
        const { password: _pw, otp: _otp, otpExpiry: _exp, ...safeUser } = user[0];
        return safeUser;
    }

    async adminLogin(email, password) {
        const user = await db.query.usersTable.findFirst({
            where: (user, { eq }) => eq(user.email, email),
        });

        if (!user) {
            throw new AppError("Invalid credentials", 401);
        }

        if (user.role === "user") {
            throw new AppError("Access denied. Admin and staff only.", 403);
        }

        if (!user.password) {
            throw new AppError(
                "This account was created via Google. Please sign in with Google.",
                401
            );
        }

        //deletion check...almost forgot to add it.
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


        // Account lockout check
        if (user.lockUntil && user.lockUntil > new Date()) {
            const secondsLeft = Math.ceil((user.lockUntil - new Date()) / 1000);
            const minutesLeft = Math.ceil(secondsLeft / 60);
            throw new AppError(
                `Account temporarily locked. Try again in ${minutesLeft} minute${minutesLeft > 1 ? "s" : ""}.`,
                403,
                { lockUntil: user.lockUntil, secondsRemaining: secondsLeft }
            );
        }

        const isPasswordValid = await comparePassword(password, user.password);

        if (!isPasswordValid) {
            const attempts = user.loginAttempts + 1;
            const remainingAttempts = Max_LOGIN_ATTEMPTS - attempts;

            if (attempts >= Max_LOGIN_ATTEMPTS) {
                const lockUntil = new Date(Date.now() + LOCK_TIME);
                await db
                    .update(usersTable)
                    .set({ loginAttempts: attempts, lockUntil })
                    .where(eq(usersTable.email, email));

                throw new AppError(
                    "Account temporarily locked due to multiple failed login attempts. Try again in 2 minutes.",
                    403,
                    { loginAttempts: attempts, lockUntil }
                );
            }

            await db
                .update(usersTable)
                .set({ loginAttempts: attempts })
                .where(eq(usersTable.email, email));

            throw new AppError(
                "Invalid credentials. Multiple failed attempts will trigger a temporary account lockout.",
                401,
                { loginAttempts: attempts, remainingAttempts }
            );
        }

        if (!user.isVerified) {
            throw new AppError(
                "Account not verified. Please verify your email before logging in.",
                403
            );
        }

        // Generate tokens — role is baked into the JWT payload
        const payload = { id: user.id, role: user.role };
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        await redisClient.set(
            `refreshToken:${user.id}`,
            refreshToken,
            "EX",
            7 * 24 * 60 * 60 // 7 days
        );

        // Reset lockout fields on successful login
        await db
            .update(usersTable)
            .set({ loginAttempts: 0, lockUntil: null })
            .where(eq(usersTable.id, user.id));

        const { password: _pw, otp: _otp, otpExpiry: _exp, ...safeUser } = user;
        return { user: safeUser, accessToken, refreshToken };
    }

    //allows for an admin to make another user an admin or a staff
    async updateUserRole(targetUserId, newRole) {
        const targetUser = await db.query.usersTable.findFirst({
            where: (user, { eq }) => eq(user.id, targetUserId),
        });

        if (!targetUser) {
            throw new AppError("User not found", 404);
        }

        if (targetUser.isDeleted) {
            throw new AppError("Cannot update role of a deleted account", 400);
        }

        // No-op guard — avoid unnecessary DB writes
        if (targetUser.role === newRole) {
            throw new AppError(`User already has the role '${newRole}'`, 400);
        }

        const updated = await db
            .update(usersTable)
            .set({ role: newRole, updatedAt: new Date() })
            .where(eq(usersTable.id, targetUserId))
            .returning();

        const { password: _pw, otp: _otp, otpExpiry: _exp, ...safeUser } = updated[0];
        return safeUser;
    }
}

module.exports = new AdminServiceActivities();