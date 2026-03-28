const { db } = require("../../config/db.js");
const { usersTable } = require("../../dbSchema/userSchema.js");
const { profilesTable } = require("../../dbSchema/profileSchema.js")
const { eq } = require("drizzle-orm");
const { hashPassword } = require("../../utils/otpAndPassword.utils.js");
const AppError = require("../../middleware/appError.js")

class UsersService {

    async getProfile(userId) {
        const user = await db.query.usersTable.findFirst({
            where: (users, { eq }) => eq(users.id, userId)
        });

        if (!user) throw new AppError("User not found", 404);

        // Strip sensitive fields before returning
        const { password, otp, otpExpiry, ...safeUser } = user;
        return safeUser;
    }

    async updateProfile(userId, updateData) {
        //rejects empty body formats

        if (Object.keys(updateData).length === 0) {
            throw new AppError("No update data provided", 400);
        }

        const userUpdates = {};
        const profileUpdates = {};

        if (updateData.name) userUpdates.name = updateData.name;
        if (updateData.email) {
            const existingUser = await db.query.usersTable.findFirst({
                where: (users, { eq, and, ne }) => and(
                    eq(users.email, updateData.email),
                    ne(users.id, userId)
                )
            });
            if (existingUser) {
                throw new AppError("Cannot update profile with these details", 409);
            }
            userUpdates.email = updateData.email;
        } 

        if (updateData.password) {
            userUpdates.password = await hashPassword(updateData.password)
        };
        if (updateData.phone) profileUpdates.phone = updateData.phone;

        if (updateData.bio) profileUpdates.bio = updateData.bio;
        if (updateData.country) profileUpdates.country = updateData.country;

        if (Object.keys(userUpdates).length > 0){
            await db.update(usersTable)
                .set(userUpdates)
                .where(eq(usersTable.id, userId));
        }
        // Update profilesTable if there are profile-level changes
        if (Object.keys(profileUpdates).length > 0) {
            await db.update(profilesTable)
                .set(profileUpdates)
                .where(eq(profilesTable.userId, userId));
        }

        const fresh = await db.query.usersTable.findFirst({
            where: (u, { eq }) => eq(u.id, userId)
        });
        const { password, otp, otpExpiry, ...safeUser } = fresh;
        return safeUser;
    }

    async updateAvatar(userId, avatarUrl) {
        await db.update(profilesTable)
            .set({ avatarUrl })
            .where(eq(profilesTable.userId, userId));
        return { avatarUrl };
    }

    async deleteAccount(userId) {

       const result = await db.update(usersTable)
            .set({
                isDeleted: true,
                deletedAt: new Date()
            })
            .where(eq(usersTable.id, userId))
            .returning();
        if (!result.length) throw new AppError("User not found", 404);
        return true;
    }
}

module.exports = new UsersService();