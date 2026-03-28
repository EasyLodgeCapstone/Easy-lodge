// dbSchema/hotelSchema.js
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
  index,
  uniqueIndex
} = require("drizzle-orm/pg-core");
const { usersTable } = require("../dbSchema/userSchema");

const hotels = pgTable("hotels", {
  // ========== PRIMARY KEY ==========
  id: serial("id").primaryKey(),
  
  // ========== OWNER RELATIONSHIP ==========
  ownerId: integer("owner_id")
    .references(() => usersTable.id, { onDelete: "set null" }),
  
  // ========== BASIC INFORMATION ==========
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  description: text("description"),
  
  // ========== CONTACT INFORMATION ==========
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  website: varchar("website", { length: 255 }),
  
  // ========== LOCATION ==========
  address: varchar("address", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }),
  zipCode: varchar("zip_code", { length: 20 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  
  // ========== RATINGS & REVIEWS ==========
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  reviewCount: integer("review_count").default(0),
  
  // ========== PRICING ==========
  priceRange: varchar("price_range", { length: 20 }), // '$', '$$', '$$$', '$$$$'
  minPrice: decimal("min_price", { precision: 10, scale: 2 }),
  maxPrice: decimal("max_price", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("USD"),
  
  // ========== HOTEL DETAILS ==========
  starRating: integer("star_rating"), // 1-5 stars
  
  // ========== AMENITIES ==========
  amenities: jsonb("amenities").default([]),
  // e.g., ["wifi", "pool", "spa", "gym", "restaurant", "parking"]
  
  // ========== MEDIA ==========
  images: jsonb("images").default([]),
  thumbnail: varchar("thumbnail", { length: 500 }),
  videoUrl: varchar("video_url", { length: 500 }),
  
  // ========== CAPACITY ==========
  totalRooms: integer("total_rooms").default(0),
  availableRooms: integer("available_rooms").default(0),
  
  // ========== POLICIES ==========
  policies: jsonb("policies").default({}),
  // e.g., {
  //   cancellationPolicy: "Free cancellation up to 24 hours before check-in",
  //   petPolicy: "Pets allowed with fee",
  //   smokingPolicy: "No smoking in rooms"
  // }
  
  // ========== STATUS ==========
  isActive: boolean("is_active").default(true),
  isVerified: boolean("is_verified").default(false),
  isFeatured: boolean("is_featured").default(false),
  status: varchar("status", { length: 50 }).default("pending"),
  // 'pending', 'approved', 'rejected', 'suspended'
  
  // ========== METADATA ==========
  metadata: jsonb("metadata").default({}),
  seoData: jsonb("seo_data").default({}),
  
  // ========== TIMESTAMPS ==========
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"), // Soft delete
  
}, (table) => ({
  // ========== INDEXES ==========
  ownerIdIdx: index("idx_hotels_owner_id").on(table.ownerId),
  slugIdx: uniqueIndex("idx_hotels_slug").on(table.slug),
  nameIdx: index("idx_hotels_name").on(table.name),
  
  // Location indexes
  cityIdx: index("idx_hotels_city").on(table.city),
  stateIdx: index("idx_hotels_state").on(table.state),
  countryIdx: index("idx_hotels_country").on(table.country),
  
  // Status indexes
  statusIdx: index("idx_hotels_status").on(table.status),
  isActiveIdx: index("idx_hotels_is_active").on(table.isActive),
  isVerifiedIdx: index("idx_hotels_is_verified").on(table.isVerified),
  isFeaturedIdx: index("idx_hotels_is_featured").on(table.isFeatured),
  
  // Rating & price indexes
  ratingIdx: index("idx_hotels_rating").on(table.rating),
  starRatingIdx: index("idx_hotels_star_rating").on(table.starRating),
  minPriceIdx: index("idx_hotels_min_price").on(table.minPrice),
  
  // Date indexes
  createdAtIdx: index("idx_hotels_created_at").on(table.createdAt),
  
  // Composite indexes for common queries
  cityStatusIdx: index("idx_hotels_city_status").on(table.city, table.status),
  locationRatingIdx: index("idx_hotels_location_rating").on(table.city, table.rating),
  priceStatusIdx: index("idx_hotels_price_status").on(table.minPrice, table.status),
}));

module.exports = { hotels };