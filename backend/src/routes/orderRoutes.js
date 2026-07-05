const express = require("express");
const Order = require("../models/Order");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, adminOnly, async (req, res) => {
    const orders = await Order.find().populate("customer", "name email").sort({ createdAt: -1 });
    res.json(orders);
});

router.post("/", protect, async (req, res) => {
    const order = await Order.create({
        ...req.body,
        customer: req.user._id
    });

    res.status(201).json(order);
});

module.exports = router;
