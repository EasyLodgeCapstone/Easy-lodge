const {
    integer,
    pgTable,
    varchar,
    boolean,
    timestamp,
    pgEnum
} = require("drizzle-orm/pg-core");

const userRoleEnum = pgEnum("user_role", ["admin", "staff", "user"]);

const usersTable = pgTable("users", {

    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    name: varchar("name", { length: 100 }).notNull(),

    email: varchar("email", { length: 255 }).notNull().unique(),

    password: varchar("password", { length: 255 }).notNull(),

    otp: varchar("otp", { length: 6 }),

    otpExpiry: timestamp("otp_expiry"),

    isVerified: boolean("is_verified").default(false),

    role: userRoleEnum("role").default("user"),

    isDeleted: boolean("is_deleted").default(false),

    deletedAt: timestamp("deleted_at"),

    createdAt: timestamp("created_at").defaultNow(),

    updatedAt: timestamp("updated_at").defaultNow(),

    loginAttempts: integer("login_attempts").default(0),

    lockUntil: timestamp("lock_until")
});

module.exports = { usersTable, userRoleEnum };