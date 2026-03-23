const { z } = require("zod");

// Define Zod schema for hotel room creation
const createRoomSchema = z.object({
  userId: z.number().int().positive("User ID must be a positive integer"),
  hotelId: z.number().int().positive("Hotel ID must be a positive integer"),
  roomNumber: z.string().min(1, "Room number is required"),
  roomType: z.enum(["single", "double", "suite", "deluxe", "presidential"], {
    errorMap: () => ({ message: "Invalid room type" }),
  }),
  roomPrice: z.number().positive("Room price must be positive"),
  roomCapacity: z.number().int().min(1, "Capacity must be at least 1"),
  bedType: z.enum(["single", "double", "queen", "king"], {
    errorMap: () => ({ message: "Invalid bed type" }),
  }),
  bedCount: z.number().int().min(1, "Bed count must be at least 1"),
  size: z.number().positive("Room size must be positive").optional(),
  pricePerNight: z.number().positive("Price per night must be positive"),
  discountedPrice: z.number().positive().optional(),
  amenities: z.array(z.string()).optional(),
});

module.exports = { createRoomSchema };
