const express = require("express");
const router = express.Router();

// Define your routes here

const PaystackService = require("../PayStackPayment/Service/PaystackService");
const PayStackController = require("../PayStackPayment/Controller/PayStackContr");

const payStackController = new PayStackController(new PaystackService());

// payStack payment route
router.post("/paystack/initialize", payStackController.initializeTransaction);
router.get("/paystack/verify/:reference", payStackController.verifyTransaction);

module.exports = router;
