// dbSchema/hotelReviewSchema.js
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
const { hotelBookings } = require("../dbSchema/HotelBookingSchema");

const hotelReviews = pgTable("hotel_reviews", {
  // ========== PRIMARY KEY ==========
  id: serial("id").primaryKey(),
  
  // ========== RELATIONSHIPS ==========
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
    
  hotelId: integer("hotel_id")
    .notNull()
    .references(() => hotels.id, { onDelete: "cascade" }),
    
  bookingId: integer("booking_id")
    .references(() => hotelBookings.id, { onDelete: "set null" }),
  
  // ========== REVIEW DETAILS ==========
  rating: decimal("rating", { precision: 2, scale: 1 }).notNull(), // 1.0 - 5.0
  title: varchar("title", { length: 255 }),
  comment: text("comment"),
  
  // ========== RATINGS BREAKDOWN ==========
  cleanlinessRating: decimal("cleanliness_rating", { precision: 2, scale: 1 }),
  comfortRating: decimal("comfort_rating", { precision: 2, scale: 1 }),
  locationRating: decimal("location_rating", { precision: 2, scale: 1 }),
  facilitiesRating: decimal("facilities_rating", { precision: 2, scale: 1 }),
  staffRating: decimal("staff_rating", { precision: 2, scale: 1 }),
  valueForMoneyRating: decimal("value_for_money_rating", { precision: 2, scale: 1 }),
  
  // ========== MEDIA ==========
  images: jsonb("images").default([]),
  
  // ========== VERIFICATION ==========
  isVerified: boolean("is_verified").default(false), // Verified stay
  isRecommended: boolean("is_recommended").default(true),
  
  // ========== ADMIN ==========
  isApproved: boolean("is_approved").default(false),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  
  // ========== METADATA ==========
  metadata: jsonb("metadata").default({}),
  
  // ========== TIMESTAMPS ==========
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  
}, (table) => ({
  userIdIdx: index("idx_hotel_reviews_user_id").on(table.userId),
  hotelIdIdx: index("idx_hotel_reviews_hotel_id").on(table.hotelId),
  ratingIdx: index("idx_hotel_reviews_rating").on(table.rating),
  isApprovedIdx: index("idx_hotel_reviews_is_approved").on(table.isApproved),
  createdAtIdx: index("idx_hotel_reviews_created_at").on(table.createdAt),
  hotelRatingIdx: index("idx_hotel_reviews_hotel_rating").on(table.hotelId, table.rating),
}));

module.exports = { hotelReviews };