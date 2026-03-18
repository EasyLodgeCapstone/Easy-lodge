const { integer, pgTable, varchar, timestamp } = require("drizzle-orm/pg-core");
const { usersTable } = require("./userSchema");

const serviceRequestTable = pgTable("service_requests", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id").references(() => usersTable.id).notNull(),
    roomId: integer("room_id").notNull(),
    requestType: varchar("request_type", { length: 200 }).notNull(),
    description: varchar("description", { length: 500 }),
    status: varchar("status", { length: 50 }).default("pending"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
});

module.exports = { serviceRequestTable };