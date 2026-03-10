const { integer, pgTable, varchar, timestamp } = require("drizzle-orm/pg-core");
const { usersTable } = require("./userSchema");


const profilesTable = pgTable("profiles", {

    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id").references(() => usersTable.id).notNull(),
    phone: varchar("phone", { length: 20 }),
    bio: varchar("bio", { length: 500 }),
    avatarUrl: varchar("avatar_url", { length: 255 }),
    country: varchar("country", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
});

module.exports = { profilesTable };