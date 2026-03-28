const { hotelBookings } = require("../../../dbSchema/HotelBookingSchema");
const { bookingRooms } = require("../../../dbSchema/HotelBookingSchema");
const { hotelRooms } = require("../../../dbSchema/HotelRoomSchema");
const { eq, sql } = require("drizzle-orm");
const { db } = require("../../../config/db");
const { differenceInDays, parseISO } = require("date-fns");

class HotelBookingService {
  constructor() {
    this.hotelBookings = hotelBookings;
    this.hotelRooms = hotelRooms;
    this.bookingRooms = bookingRooms;

    if (!db) {
      throw new Error("Database connection not found");
    }

    if (!this.hotelRooms) {
      throw new Error("Hotel rooms table not found");
    }

    if (!this.hotelBookings) {
      throw new Error("Hotel bookings table not found");
    }

    if (!this.bookingRooms) {
      throw new Error("Booking rooms table not found");
    }
  }

  async generateReference() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `EASY${timestamp}${random}LODGE`;
  }

  // Service/HotelBookingService.js
  async getRoomDetails(roomIds) {
    try {
      // Validate input
      if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
        throw new Error(`Invalid roomIds: ${JSON.stringify(roomIds)}`);
      }

      // Parse to integers
      const parsedIds = roomIds
        .map((id) => parseInt(id))
        .filter((id) => !isNaN(id));

      if (parsedIds.length === 0) {
        throw new Error("No valid room IDs after parsing");
      }

      console.log(`🔍 Fetching ${parsedIds.length} rooms:`, parsedIds);

      // ✅ Use IN clause with sql.join (works perfectly)
      const rooms = await db
        .select()
        .from(this.hotelRooms)
        .where(sql`${this.hotelRooms.id} IN (${sql.join(parsedIds, sql`, `)})`);

      console.log(`✅ Found ${rooms.length} rooms`);

      // Verify all rooms were found
      if (rooms.length !== parsedIds.length) {
        const foundIds = rooms.map((r) => r.id);
        const missingIds = parsedIds.filter((id) => !foundIds.includes(id));
        throw new Error(`Rooms not found: ${missingIds.join(", ")}`);
      }

      return rooms;
    } catch (error) {
      console.error("❌ Error in getRoomDetails:", error.message);
      throw error;
    }
  }

  async calcSubTotal(rooms) {
    try {
      // Calculate the subtotal based on room objects (per night)
      const subtotal = rooms.reduce((total, room) => {
        const roomPrice = parseFloat(room.pricePerNight);
        return total + roomPrice;
      }, 0);
      return parseFloat(subtotal.toFixed(2));
    } catch (error) {
      throw new Error("Error calculating subtotal: " + error.message);
    }
  }

  async CalcNumOfTime(checkInDate, checkoutDate) {
    try {
      const start =
        typeof checkInDate === "string"
          ? parseISO(checkInDate)
          : new Date(checkInDate);
      const end =
        typeof checkoutDate === "string"
          ? parseISO(checkoutDate)
          : new Date(checkoutDate);

      const nights = differenceInDays(end, start);

      if (nights <= 0) {
        throw new Error("Check-out date must be after check-in date");
      }

      return nights;
    } catch (error) {
      throw new Error("Error calculating number of nights: " + error.message);
    }
  }

  async createBooking(bookingData) {
    try {
      // Fetch room details from database
      const rooms = await this.getRoomDetails(bookingData.roomIds);

      // Validate that all rooms were found
      if (rooms.length !== bookingData.roomIds.length) {
        throw new Error("Some rooms were not found");
      }

      return await db.transaction(async (tx) => {
        // Calculate number of nights
        const numberOfNights = await this.CalcNumOfTime(
          bookingData.checkInDate,
          bookingData.checkOutDate,
        );

        // Calculate per-night subtotal
        const perNightSubtotal = await this.calcSubTotal(rooms);

        // Calculate totals (multiply by number of nights)
        const subtotal = perNightSubtotal * numberOfNights;
        const taxAmount = parseFloat((subtotal * 0.1).toFixed(2));
        const totalAmount = parseFloat((subtotal + taxAmount).toFixed(2));

        // ✅ Convert date strings to Date objects
        const checkInDate = new Date(bookingData.checkInDate);
        const checkOutDate = new Date(bookingData.checkOutDate);
        const now = new Date();

        // Validate dates
        if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
          throw new Error("Invalid date format");
        }

        // Create the booking object - DON'T spread bookingData
        const newBooking = {
          bookingReference: await this.generateReference(),
          userId: bookingData.userId,
          hotelId: bookingData.hotelId,
          checkInDate: checkInDate,
          checkOutDate: checkOutDate,
          numberOfNights: numberOfNights,
          numberOfGuests: bookingData.numberOfGuests,
          numberOfRooms: rooms.length,
          guestName: bookingData.guestName,
          guestEmail: bookingData.guestEmail,
          guestPhone: bookingData.guestPhone,
          specialRequests: bookingData.specialRequests || null,
          subtotal: subtotal.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          paymentStatus: "pending",
          bookingStatus: "confirmed",
          metadata: {
            userId: bookingData.userId,
            hotelId: bookingData.hotelId,
            checkInDate: checkInDate,
            checkOutDate: checkOutDate,
            numberOfNights: numberOfNights,
            numberOfGuests: bookingData.numberOfGuests,
            numberOfRooms: rooms.length,
            guestName: bookingData.guestName,
            guestEmail: bookingData.guestEmail,
            guestPhone: bookingData.guestPhone,
            specialRequests: bookingData.specialRequests || null,
            roomIds: bookingData.roomIds,
          },
        };

        console.log("Booking created:");

        // ✅ Uncommented: Insert the booking
        const [booking] = await tx
          .insert(this.hotelBookings)
          .values(newBooking)
          .returning();

        // ✅ Fixed: Map room data with guest names from request
        const bookingRoomsData = rooms.map((room) => {
          // Find guest names for this room from bookingData
          // const roomGuestNames = bookingData.roomGuestNames?.[room.id] || null;

          return {
            bookingId: booking.id, // ✅ Now 'booking' is defined
            roomId: room.id,
            pricePerNight: room.pricePerNight.toString(),
          };
        });

        console.log("Booking created:");
        console.log("Booking rooms:");

        // ✅ Uncommented: Insert booking rooms
        await tx.insert(this.bookingRooms).values(bookingRoomsData);

        // ✅ Fixed: Return both booking and rooms
        return {
          success: true,
          booking: booking,
          rooms: bookingRoomsData,
        };
      });
    } catch (error) {
      console.error("Error creating booking:", error);
      throw new Error("Error creating booking: " + error.message);
    }
  }
}

module.exports = HotelBookingService;
