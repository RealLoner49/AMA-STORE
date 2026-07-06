const express = require("express");
const NewsletterSubscriber = require("../models/NewsletterSubscriber");
const { requireDatabase } = require("../middleware/dbMiddleware");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

router.post("/", requireDatabase, async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!email) {
        return res.status(400).json({ message: "Email address is required." });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Enter a valid email address." });
    }

    const existingSubscriber = await NewsletterSubscriber.findOne({ email });
    if (existingSubscriber) {
        return res.status(409).json({ message: "This email is already on the AMA updates list." });
    }

    await NewsletterSubscriber.create({
        email,
        source: req.body.source || "home"
    });

    res.status(201).json({ message: "Email saved. You'll get AMA new-drop updates first." });
});

router.get("/", protect, adminOnly, requireDatabase, async (req, res) => {
    const subscribers = await NewsletterSubscriber.find().sort({ createdAt: -1 });
    res.json(subscribers);
});

module.exports = router;
