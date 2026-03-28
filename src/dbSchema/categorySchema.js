const { integer, pgTable, varchar, boolean, timestamp } = require("drizzle-orm/pg-core");

const serviceCategoriesTable = pgTable("service_categories", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 100 }).notNull().unique(),// "Food", "Laundry", etc.
    description: varchar("description", { length: 300 }),
    isActive: boolean("is_active").default(true), // soft disables a whole category
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

module.exports = { serviceCategoriesTable };