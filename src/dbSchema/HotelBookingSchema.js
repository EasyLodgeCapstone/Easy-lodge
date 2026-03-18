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
    
  roomId: integer("room_id")
    .references(() => hotelRooms.id, { onDelete: "set null" }),
  
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
  pricePerNight: decimal("price_per_night", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0.00"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0.00"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("USD"),
  
  // ========== PAYMENT ==========
  paymentStatus: varchar("payment_status", { length: 50 }).default("pending"),
  // 'pending', 'paid', 'failed', 'refunded'
  
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentReference: varchar("payment_reference", { length: 100 }),
  
  // ========== BOOKING STATUS ==========
  bookingStatus: varchar("booking_status", { length: 50 }).default("confirmed"),
  // 'confirmed', 'pending', 'cancelled', 'completed', 'no_show'
  
  cancellationReason: text("cancellation_reason"),
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: integer("cancelled_by"), // userId or adminId
  
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
  roomIdIdx: index("idx_hotel_bookings_room_id").on(table.roomId),
  statusIdx: index("idx_hotel_bookings_status").on(table.bookingStatus),
  paymentStatusIdx: index("idx_hotel_bookings_payment_status").on(table.paymentStatus),
  dateRangeIdx: index("idx_hotel_bookings_dates").on(table.checkInDate, table.checkOutDate),
  userStatusIdx: index("idx_hotel_bookings_user_status").on(table.userId, table.bookingStatus),
  createdAtIdx: index("idx_hotel_bookings_created_at").on(table.createdAt),
}));

module.exports = { hotelBookings };