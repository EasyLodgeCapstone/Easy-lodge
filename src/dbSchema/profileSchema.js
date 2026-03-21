const { 
  integer, 
  pgTable, 
  varchar, 
  timestamp,
  serial,
  index,
  foreignKey
} = require("drizzle-orm/pg-core");
const { usersTable } = require("./userSchema");

const profilesTable = pgTable(
  "profiles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    phone: varchar("phone", { length: 20 }),
    bio: varchar("bio", { length: 500 }),
    avatarUrl: varchar("avatar_url", { length: 255 }),
    country: varchar("country", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    // Explicit foreign key constraint
    userFk: foreignKey({
      columns: [table.userId],
      foreignColumns: [usersTable.id],
      name: "fk_profiles_user_id"
    }).onDelete("cascade").onUpdate("cascade"),
    
    // Index for faster queries
    userIdIdx: index("idx_profiles_user_id").on(table.userId),
  })
);

module.exports = { profilesTable };