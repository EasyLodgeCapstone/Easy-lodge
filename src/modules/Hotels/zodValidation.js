const { z } = require("zod");

// ========== ZOD SCHEMA FOR HOTEL CREATION ==========
const createHotelSchema = z
  .object({
    // Basic Information
    userId: z.number().int().positive("User ID must be a positive integer"),
    hotelName: z
      .string()
      .min(2, "Hotel name must be at least 2 characters")
      .max(100, "Hotel name too long"),
    hotelEmail: z.string().email("Invalid email format").optional().default(""),
    hotelPhone: z
      .string()
      .regex(
        /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,5}[-\s\.]?[0-9]{1,5}$/,
        "Invalid phone number",
      )
      .optional()
      .default(""),
    hotelWebsite: z.string().url("Invalid URL").optional().default(""),

    // Location
    hotelAddress: z
      .string()
      .min(5, "Address must be at least 5 characters")
      .optional()
      .default(""),
    hotelCity: z
      .string()
      .min(2, "City must be at least 2 characters")
      .optional()
      .default(""),
    hotelState: z
      .string()
      .min(2, "State must be at least 2 characters")
      .optional()
      .default(""),
    hotelCountry: z
      .string()
      .min(2, "Country must be at least 2 characters")
      .optional()
      .default(""),
    hotelZipCode: z.string().optional().default(""),

    // Description
    hotelDescription: z
      .string()
      .min(20, "Description must be at least 20 characters")
      .max(2000, "Description too long")
      .optional()
      .default(""),

    // Ratings & Pricing
    hotelRating: z
      .number()
      .min(0, "Rating must be at least 0")
      .max(5, "Rating cannot exceed 5")
      .optional()
      .default(0),
    hotelReviewCount: z
      .number()
      .int()
      .min(0, "Review count cannot be negative")
      .optional()
      .default(0),
    hotelPriceRange: z
      .enum(["$", "$$", "$$$", "$$$$"], {
        errorMap: () => ({
          message: "Price range must be $, $$, $$$, or $$$$",
        }),
      })
      .optional()
      .default("$"),
    hotelMinPrice: z
      .number()
      .min(0, "Minimum price cannot be negative")
      .optional()
      .default(0),
    hotelMaxPrice: z
      .number()
      .min(0, "Maximum price cannot be negative")
      .optional()
      .default(0),

    // Rooms
    hotelTotalRooms: z
      .number()
      .int()
      .min(0, "Total rooms cannot be negative")
      .optional()
      .default(0),
    hotelAvailableRooms: z
      .number()
      .int()
      .min(0, "Available rooms cannot be negative")
      .optional()
      .default(0),

    // Amenities & Policies
    hotelAmenities: z.array(z.string()).optional().default([]),
    hotelPolicies: z
      .object({
        checkIn: z.string().optional(),
        checkOut: z.string().optional(),
        cancellation: z.string().optional(),
        children: z.string().optional(),
        pets: z.string().optional(),
        smoking: z.string().optional(),
      })
      .optional()
      .default({}),

    // Media
    hotelImages: z.array(z.string()).optional().default([]),
    hotelThumbnail: z.string().nullable().optional().default(null),
    hotelVideo: z.string().nullable().optional().default(null),
  })
  .refine(
    (data) => {
      // Custom validation: Max price should be greater than min price
      if (
        data.hotelMaxPrice > 0 &&
        data.hotelMinPrice > 0 &&
        data.hotelMaxPrice <= data.hotelMinPrice
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Maximum price must be greater than minimum price",
      path: ["hotelMaxPrice"],
    },
  );

module.exports = { createHotelSchema };
