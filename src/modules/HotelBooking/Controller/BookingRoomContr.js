const HotelBookingService = require("../Service/HotelBookingService");
const { bookingSchema } = require("../zodValidation"); // Import your schema

class BookingRoomContr {
  constructor() {
    this.bookingService = new HotelBookingService();
  }

  createBooking = async (req, res) => {
    try {
      // Debug logging
      console.log("Request user:", req.user);
      console.log("Request body:", req.body);

      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Authentication required. Please log in.",
        });
      }

      // Prepare data for validation
      let roomIds = req.body.roomIds;
      
      // Process roomIds if it's a string (from form data)
      if (typeof roomIds === 'string') {
        try {
          roomIds = JSON.parse(roomIds);
        } catch (e) {
          roomIds = roomIds.split(',').map(id => parseInt(id.trim()));
        }
      }

      const validationData = {
        userId: parseInt(req.user.id),
        hotelId: parseInt(req.body.hotelId),
        roomIds: Array.isArray(roomIds) ? roomIds.map(id => parseInt(id)) : [parseInt(roomIds)],
        checkInDate: req.body.checkInDate,
        checkOutDate: req.body.checkOutDate,
        numberOfGuests: parseInt(req.body.numberOfGuests),
        guestName: req.body.guestName,
        guestEmail: req.body.guestEmail,
        guestPhone: req.body.guestPhone,
        specialRequests: req.body.specialRequests || null,
        roomGuestNames: req.body.roomGuestNames || {},
      };

      // Validate with Zod
      const validatedData = bookingSchema.parse(validationData);

      console.log("✅ Validation passed:");

      // Prepare booking data for the service
      const bookingData = {
        userId: validatedData.userId,
        hotelId: validatedData.hotelId,
        roomIds: validatedData.roomIds,
        checkInDate: validatedData.checkInDate,
        checkOutDate: validatedData.checkOutDate,
        numberOfGuests: validatedData.numberOfGuests,
        guestName: validatedData.guestName,
        guestEmail: validatedData.guestEmail,
        guestPhone: validatedData.guestPhone,
        specialRequests: validatedData.specialRequests,
        roomGuestNames: validatedData.roomGuestNames,
      };

      // Call the service to create the booking
      const result = await this.bookingService.createBooking(bookingData);

      // Send success response
      return res.status(201).json({
        success: true,
        message: "Booking created successfully",
        data: result,
      });

    } catch (error) {
      // Handle Zod validation errors
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }

      // Handle other errors
      console.error("Error in CreateBooking controller:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  };
}

module.exports = BookingRoomContr;