// dbSchema/hotelRoomSchema.js
const { 
  pgTable, 
  serial, 
  integer, 
  varchar, 
  timestamp, 
  boolean,
  decimal,
  jsonb,
  text,
  index
} = require("drizzle-orm/pg-core");
const { hotels } = require("../dbSchema/HotelsSchema");

const hotelRooms = pgTable("hotel_rooms", {
  // ========== PRIMARY KEY ==========
  id: serial("id").primaryKey(),
  
  // ========== RELATIONSHIPS ==========
  hotelId: integer("hotel_id")
    .notNull()
    .references(() => hotels.id, { onDelete: "cascade" }),
  
  // ========== ROOM DETAILS ==========
  roomNumber: varchar("room_number", { length: 50 }),
  roomType: varchar("room_type", { length: 100 }).notNull(),
  // e.g., "standard", "deluxe", "suite", "presidential"
  
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // ========== CAPACITY ==========
  capacity: integer("capacity").notNull(), // Max number of guests
  bedType: varchar("bed_type", { length: 100 }),
  // e.g., "king", "queen", "twin", "double"
  
  bedCount: integer("bed_count").default(1),
  size: varchar("size", { length: 50 }), // e.g., "300 sq ft"
  
  // ========== PRICING ==========
  pricePerNight: decimal("price_per_night", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("NGN"),
  
  // Discounted price (for promotions)
  discountedPrice: decimal("discounted_price", { precision: 10, scale: 2 }),
  
  // ========== AMENITIES ==========
  amenities: jsonb("amenities").default([]),
  // e.g., ["wifi", "tv", "ac", "minibar", "safe"]
  
  // ========== MEDIA ==========
  images: jsonb("images").default([]),
  
  // ========== AVAILABILITY ==========
  totalRooms: integer("total_rooms").default(1), // How many of this type
  availableRooms: integer("available_rooms").default(0),
  
  isAvailable: boolean("is_available").default(true),
  isBooked: boolean("is_booked").default(false),
  
  // ========== STATUS ==========
  status: varchar("status", { length: 50 }).default("active"),
  // 'active', 'maintenance', 'inactive'
  
  // ========== METADATA ==========
  metadata: jsonb("metadata").default({}),
  
  // ========== TIMESTAMPS ==========
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  
}, (table) => ({
  hotelIdIdx: index("idx_hotel_rooms_hotel_id").on(table.hotelId),
  roomTypeIdx: index("idx_hotel_rooms_room_type").on(table.roomType),
  priceIdx: index("idx_hotel_rooms_price").on(table.pricePerNight),
  availabilityIdx: index("idx_hotel_rooms_availability").on(table.isAvailable),
  hotelRoomTypeIdx: index("idx_hotel_rooms_hotel_type").on(table.hotelId, table.roomType),
}));

module.exports = { hotelRooms };