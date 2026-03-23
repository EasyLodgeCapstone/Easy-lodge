const express = require("express");
const router = express.Router();
const { Auth, AuthRefresh } = require("../../middleware/Auth.js");
const { validateData } = require("../../middleware/zodValidation.js");
// Define your routes here

const PaystackService = require("../PayStackPayment/Service/PaystackService");
const HotelsService = require("../Hotels/Service/HotelsService");
const AddHotelRoomsService = require("../AddHotelRooms/Service/AddHotelRoomsService");
const HotelBookingService = require("../HotelBooking/Service/HotelBookingService");

const PayStackController = require("../PayStackPayment/Controller/PayStackContr");
const HotelsController = require("../Hotels/Controller/HotelsController");
const AddHotelRoomsContr = require("../AddHotelRooms/Controller/AddHotelRoomContr");
const BookingRoomContr = require("../HotelBooking/Controller/BookingRoomContr");

// Define Zod validation schemas here
const { createRoomSchema } = require("../AddHotelRooms/ZodValidation.js");
const { createHotelSchema } = require("../Hotels/zodValidation.js");
const { bookingSchema } = require("../HotelBooking/zodValidation.js");

// Create instances of the controllers

const payStackController = new PayStackController(new PaystackService());
const hotelsController = new HotelsController(new HotelsService());
const addHotelRoomsContr = new AddHotelRoomsContr(new AddHotelRoomsService());
const bookingRoomContr = new BookingRoomContr(new HotelBookingService());

// payStack payment route
router.post(
  "/paystack/initialize",
  Auth,
  payStackController.initializeTransaction,
);
router.get(
  "/paystack/verify/:reference",
  Auth,
  payStackController.verifyTransaction,
);

// hotels route
router.get("/hotels", Auth, hotelsController.getHotels);
router.post(
  "/hotels/add",
  Auth,
  validateData(createHotelSchema, ["body"]),
  hotelsController.AddHotel,
);
// add hotel rooms route
router.get("/hotels/rooms", Auth, addHotelRoomsContr.getHotelRooms);
router.post(
  "/hotels/addhotelrooms",
  Auth,
  validateData(createRoomSchema, ["body"]),
  addHotelRoomsContr.AddHotelRoom,
);

// hotel booking route
// router.get("/hotels/bookings", hotelBookingContr.getHotelBookings);
router.post(
  "/hotels/bookings",
  Auth,
  // validateData(bookingSchema, ["body"]),
  bookingRoomContr.createBooking,
);

module.exports = router;
