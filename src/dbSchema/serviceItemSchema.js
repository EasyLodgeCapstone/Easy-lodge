const { integer, pgTable, varchar, boolean, timestamp, numeric } = require("drizzle-orm/pg-core");
const { serviceCategoriesTable } = require("./categorySchema");

const serviceItemsTable = pgTable("service_items", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    categoryId: integer("category_id")
        .references(() => serviceCategoriesTable.id)
        .notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    description: varchar("description", { length: 500 }),
    price: numeric("price", { precision: 10, scale: 2 }),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

module.exports = { serviceItemsTable };