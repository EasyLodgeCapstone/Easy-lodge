const { db } = require("../../config/db.js");
const { usersTable } = require("../../dbschema/users.schema");
const { profileSchema } = require("../../dbSchema/profileSchema.js")
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
                throw new Error("Email already in use");
            }
            userUpdates.email = updateData.email;
        }

        if (updateData.password) {
            userUpdates.password = await hashPassword(updateData.password)
        };
        if (updateData.phone) profileUpdates.phone = updateData.phone;

        if (updateData.bio) profileUpdates.bio = updateData.bio;
        if (updateData.country) profileUpdates.country = updateData.country;

        let updatedUser = null;
        if (Object.keys(userUpdates).length > 0){
            const result = await db.update(usersTable)
                .set(userUpdates)
                .where(eq(usersTable.id, userId))
                .returning();
            updatedUser = result[0];    
        }
        // Update profilesTable if there are profile-level changes
        if (Object.keys(profileUpdates).length > 0) {
            await db.update(profilesTable)
                .set(profileUpdates)
                .where(eq(profilesTable.userId, userId));
        }

        return updatedUser;
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