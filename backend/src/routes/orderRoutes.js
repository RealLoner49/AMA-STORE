const express = require("express");
const Order = require("../models/Order");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, adminOnly, async (req, res) => {
    const orders = await Order.find().populate("customer", "name email").sort({ createdAt: -1 });
    res.json(orders);
});

router.post("/", protect, async (req, res) => {
    const paymentMethod = req.body.paymentMethod || "pay_on_delivery";
    const paymentReference = String(req.body.paymentReference || "").trim();
    const status = paymentMethod === "paystack" && paymentReference ? "paid" : "pending";

    const order = await Order.create({
        ...req.body,
        customer: req.user._id,
        paymentMethod,
        paymentReference,
        status
    });

    res.status(201).json(order);
});

module.exports = router;
