const express = require("express");
const router = express.Router();

// Define your routes here

const PaystackService = require("../PayStackPayment/Service/PaystackService");
const HotelsService = require("../Hotels/Service/HotelsService");

const PayStackController = require("../PayStackPayment/Controller/PayStackContr");
const HotelsController = require("../Hotels/Controller/HotelsController");

const payStackController = new PayStackController(new PaystackService());
const hotelsController = new HotelsController(new HotelsService());

// payStack payment route
router.post("/paystack/initialize", payStackController.initializeTransaction);
router.get("/paystack/verify/:reference", payStackController.verifyTransaction);

// hotels route
router.post("/hotels/add",hotelsController.AddHotel );


module.exports = router;
