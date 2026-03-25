const { integer, pgTable, varchar, timestamp, pgEnum, text  } = require("drizzle-orm/pg-core");
const { usersTable } = require("./userSchema");
const { serviceItemsTable } = require("./serviceItemSchema");
 
const priorityEnum = pgEnum("priority_level", ["normal", "urgent"]);
const statusEnum = pgEnum("request_status", ["pending", "in_progress", "completed", "cancelled"]);


const serviceRequestTable = pgTable("service_requests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .references(() => usersTable.id)
    .notNull(),
  roomId: integer("room_id").notNull(),
  serviceItemId: integer("service_item_id")
    .references(() => serviceItemsTable.id)
    .notNull(),
  bookingReference: varchar("booking_reference", { length: 100 })
    .unique()
    .notNull(),

  quantity: integer("quantity").default(1).notNull(),
  priority: priorityEnum("priority").default("normal"),
  notes: text("notes"),                                       // user's custom instructions
  scheduledAt: timestamp("scheduled_at"),                     // optional requested delivery time
  status: statusEnum("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

module.exports = { serviceRequestTable, priorityEnum, statusEnum };
