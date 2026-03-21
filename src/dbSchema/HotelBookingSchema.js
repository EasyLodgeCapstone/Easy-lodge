// dbSchema/hotelBookingSchema.js
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
const { usersTable } = require("../dbSchema/userSchema");
const { hotels } = require("../dbSchema/HotelsSchema");
const { hotelRooms } = require("../dbSchema/HotelRoomSchema");

// ========== MAIN BOOKINGS TABLE ==========
const hotelBookings = pgTable("hotel_bookings", {
  // ========== PRIMARY KEY ==========
  id: serial("id").primaryKey(),
  
  // ========== BOOKING IDENTIFIERS ==========
  bookingReference: varchar("booking_reference", { length: 100 }).unique().notNull(),
  
  // ========== RELATIONSHIPS ==========
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
    
  hotelId: integer("hotel_id")
    .notNull()
    .references(() => hotels.id, { onDelete: "cascade" }),
  
  // REMOVED: roomId field - now using junction table for multiple rooms
  
  // ========== BOOKING DETAILS ==========
  checkInDate: timestamp("check_in_date").notNull(),
  checkOutDate: timestamp("check_out_date").notNull(),
  numberOfNights: integer("number_of_nights").notNull(),
  numberOfGuests: integer("number_of_guests").notNull(),
  numberOfRooms: integer("number_of_rooms").default(1),
  
  // ========== GUEST INFORMATION ==========
  guestName: varchar("guest_name", { length: 255 }),
  guestEmail: varchar("guest_email", { length: 255 }),
  guestPhone: varchar("guest_phone", { length: 50 }),
  specialRequests: text("special_requests"),
  
  // ========== PRICING ==========
  // REMOVED: pricePerNight - now stored per room in junction table
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0.00"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0.00"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("USD"),
  
  // ========== PAYMENT ==========
  paymentStatus: varchar("payment_status", { length: 50 }).default("pending"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentReference: varchar("payment_reference", { length: 100 }),
  
  // ========== BOOKING STATUS ==========
  bookingStatus: varchar("booking_status", { length: 50 }).default("confirmed"),
  cancellationReason: text("cancellation_reason"),
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: integer("cancelled_by"),
  
  // ========== METADATA ==========
  metadata: jsonb("metadata").default({}),
  
  // ========== TIMESTAMPS ==========
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  
}, (table) => ({
  bookingRefIdx: index("idx_hotel_bookings_reference").on(table.bookingReference),
  userIdIdx: index("idx_hotel_bookings_user_id").on(table.userId),
  hotelIdIdx: index("idx_hotel_bookings_hotel_id").on(table.hotelId),
  statusIdx: index("idx_hotel_bookings_status").on(table.bookingStatus),
  paymentStatusIdx: index("idx_hotel_bookings_payment_status").on(table.paymentStatus),
  dateRangeIdx: index("idx_hotel_bookings_dates").on(table.checkInDate, table.checkOutDate),
  userStatusIdx: index("idx_hotel_bookings_user_status").on(table.userId, table.bookingStatus),
  createdAtIdx: index("idx_hotel_bookings_created_at").on(table.createdAt),
}));

// ========== JUNCTION TABLE: BOOKING ROOMS ==========
const bookingRooms = pgTable("booking_rooms", {
  id: serial("id").primaryKey(),
  
  // Foreign key to bookings table
  bookingId: integer("booking_id")
    .notNull()
    .references(() => hotelBookings.id, { onDelete: "cascade" }),
  
  // Foreign key to rooms table
  roomId: integer("room_id")
    .notNull()
    .references(() => hotelRooms.id, { onDelete: "cascade" }),
  
  // Room-specific pricing for this booking
  pricePerNight: decimal("price_per_night", { precision: 10, scale: 2 }).notNull(),
  
  // Optional: track which guests are in which room
  guestNames: text("guest_names"),
  
  // Optional: room quantity if booking multiple of same room type
  quantity: integer("quantity").default(1),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  
}, (table) => ({
  bookingIdIdx: index("idx_booking_rooms_booking_id").on(table.bookingId),
  roomIdIdx: index("idx_booking_rooms_room_id").on(table.roomId),
  uniqueBookingRoom: index("idx_unique_booking_room").on(table.bookingId, table.roomId),
}));

module.exports = { hotelBookings, bookingRooms };