const { z } = require("zod");

// ========== ZOD SCHEMA FOR BOOKING CREATION ==========
const bookingSchema = z
  .object({
    // User Information
    userId: z.number().int().positive("User ID must be a positive integer"),
    hotelId: z.number().int().positive("Hotel ID must be a positive integer"),

    // Room Information
    roomIds: z
      .array(z.number().int().positive("Room ID must be a positive integer"))
      .min(1, "At least one room must be selected")
      .max(10, "Maximum 10 rooms per booking"),

    // Dates
    checkInDate: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Check-in date must be in YYYY-MM-DD format",
      )
      .refine(
        (date) => !isNaN(new Date(date).getTime()),
        "Invalid check-in date",
      ),

    checkOutDate: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Check-out date must be in YYYY-MM-DD format",
      )
      .refine(
        (date) => !isNaN(new Date(date).getTime()),
        "Invalid check-out date",
      ),

    // Guest Information
    numberOfGuests: z
      .number()
      .int()
      .min(1, "At least 1 guest required")
      .max(20, "Maximum 20 guests per booking"),

    guestName: z
      .string()
      .min(2, "Guest name must be at least 2 characters")
      .max(100, "Guest name too long")
      .regex(
        /^[a-zA-Z\s'-]+$/,
        "Guest name can only contain letters, spaces, apostrophes, and hyphens",
      ),

    guestEmail: z
      .string()
      .email("Invalid email format")
      .max(255, "Email too long"),

    guestPhone: z
      .string()
      .regex(
        /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,5}[-\s\.]?[0-9]{1,5}$/,
        "Invalid phone number",
      )
      .min(5, "Phone number must be at least 5 characters")
      .max(20, "Phone number too long"),

    // Optional fields
    specialRequests: z
      .string()
      .max(500, "Special requests cannot exceed 500 characters")
      .optional()
      .nullable()
      .default(null),

    // Optional: Room-specific guest names
    roomGuestNames: z.record(z.string()).optional().default({}),
  })
  .refine(
    (data) => {
      // Custom validation: Check-out must be after check-in
      const checkIn = new Date(data.checkInDate);
      const checkOut = new Date(data.checkOutDate);
      return checkOut > checkIn;
    },
    {
      message: "Check-out date must be after check-in date",
      path: ["checkOutDate"],
    },
  );

module.exports = { bookingSchema };
