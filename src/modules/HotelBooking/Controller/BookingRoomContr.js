const HotelBookingService = require("../Service/HotelBookingService");

class BookingRoomContr {
  constructor() {
    this.bookingService = new HotelBookingService();
  }

  createBooking = async (req, res) => {
    try {
      // Validate required fields
      const requiredFields = [
        "userId",
        "hotelId",
        "roomIds",
        "checkInDate",
        "checkOutDate",
        "numberOfGuests",
        "guestName",
        "guestEmail",
        "guestPhone",
      ];

      for (const field of requiredFields) {
        if (!req.body[field]) {
          return res.status(400).json({
            success: false,
            message: `${field} is required`,
          });
        }
      }

      // Validate roomIds is an array and not empty
      if (!Array.isArray(req.body.roomIds) || req.body.roomIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "roomIds must be a non-empty array",
        });
      }

      // Prepare booking data for the service
      const bookingData = {
        userId: req.body.userId,
        hotelId: req.body.hotelId,
        roomIds: req.body.roomIds,
        checkInDate: req.body.checkInDate,
        checkOutDate: req.body.checkOutDate,
        numberOfGuests: req.body.numberOfGuests,
        guestName: req.body.guestName,
        guestEmail: req.body.guestEmail,
        guestPhone: req.body.guestPhone,
        specialRequests: req.body.specialRequests || null,
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
      console.error("Error in CreateBooking controller:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  };
}

module.exports = BookingRoomContr;
