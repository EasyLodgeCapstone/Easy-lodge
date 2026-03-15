const db = require("../../config/db.js");
const { usersTable } = require("../../db/schema/users.schema");
const { eq, ne } = require("drizzle-orm");
const { hashPassword, comparePassword, generateOtp } = require("../../utils/otpAndPassword.utils.js");

class UsersService {

    async getProfile(userId) {

        const user = await db.query.usersTable.findFirst({
            where: (users, { eq }) => eq(users.id, userId)
        });

        return user;
    }

    async updateProfile(userId, updateData) {

        const updates = {};
        if (updateData.name) updates.name = updateData.name;
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
            updates.email = updateData.email;
        }

        if (updateData.password) {
            updates.password = await hashPassword(updateData.password)
        };
        if (updateData.phone) updates.phone = updateData.phone;
        const updated = await db.update(usersTable)
            .set(updates)
            .where(eq(usersTable.id, userId))
            .returning();

        return updated[0];
    }

    async softDeleteUser(userId) {

        const result = await db.update(usersTable)
            .set({
                isDeleted: true,
                deletedAt: new Date()
            })
            .where(eq(usersTable.id, userId))
            .returning();

        if (!result.length) {
            throw new Error("User not found");
        }

        return result[0];
    }
    async deleteAccount(userId) {

        await db.update(usersTable)
            .set({
                isDeleted: true,
                deletedAt: new Date()
            })
            .where(eq(usersTable.id, userId));

        return true;
    }
}

module.exports = new UsersService();