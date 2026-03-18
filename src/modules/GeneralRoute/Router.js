const express = require("express");
const router = express.Router();

// Define your routes here

const PaystackService = require("../PayStackPayment/Service/PaystackService");
const HotelsService = require("../Hotels/Service/HotelsService");
const AddHotelRoomsService = require("../AddHotelRooms/Service/AddHotelRoomsService");

const PayStackController = require("../PayStackPayment/Controller/PayStackContr");
const HotelsController = require("../Hotels/Controller/HotelsController");
const AddHotelRoomsContr = require("../AddHotelRooms/Controller/AddHotelRoomContr");

// Create instances of the controllers

const payStackController = new PayStackController(new PaystackService());
const hotelsController = new HotelsController(new HotelsService());
const addHotelRoomsContr = new AddHotelRoomsContr(new AddHotelRoomsService());

// payStack payment route
router.post("/paystack/initialize", payStackController.initializeTransaction);
router.get("/paystack/verify/:reference", payStackController.verifyTransaction);

// hotels route
router.post("/hotels/add", hotelsController.AddHotel);
// add hotel rooms route
router.post("/hotels/addhotelrooms", addHotelRoomsContr.AddHotelRoom);

module.exports = router;
