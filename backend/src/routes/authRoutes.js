const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Admin = require("../models/Admin");
const createToken = require("../utils/token");
const { isDatabaseConnected } = require("../config/db");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const getAdminEmail = () => String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const getAdminPassword = () => String(process.env.ADMIN_PASSWORD || "");
const databaseUnavailableMessage = process.env.VERCEL
    ? "Database is disconnected. MongoDB Atlas is blocking Vercel. In Atlas Network Access, add 0.0.0.0/0, then redeploy or try again."
    : "Database is disconnected. This account was not saved to MongoDB. Add your current IP in Atlas Network Access, then restart the backend.";

router.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!name || !normalizedEmail || !password) {
        return res.status(400).json({ message: "Name, email, and password are required." });
    }

    if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    if (normalizedEmail === getAdminEmail()) {
        return res.status(403).json({ message: "This email is reserved for admin access." });
    }

    if (!isDatabaseConnected()) {
        return res.status(503).json({
            message: databaseUnavailableMessage
        });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
        return res.status(409).json({ message: "An account with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: "customer"
    });

    res.status(201).json({ message: "Account created." });
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const adminEmail = getAdminEmail();
    const adminPassword = getAdminPassword();

    if (!normalizedEmail || !password) {
        return res.status(400).json({ message: "Email and password are required." });
    }

    const isAdminLogin = normalizedEmail === adminEmail;

    if (isAdminLogin && (!adminEmail || !adminPassword)) {
        return res.status(500).json({ message: "Admin login is not configured yet." });
    }

    if (isAdminLogin && password === adminPassword && !isDatabaseConnected()) {
        const user = {
            _id: "env-admin",
            name: "AMA Admin",
            email: normalizedEmail,
            role: "admin",
            collection: "env-admin"
        };

        return res.json({
            token: createToken(user),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    }

    if (!isDatabaseConnected()) {
        return res.status(503).json({
            message: databaseUnavailableMessage
        });
    }

    let user = isAdminLogin ? await Admin.findOne({ email: normalizedEmail }) : await User.findOne({ email: normalizedEmail });

    if (!user && isAdminLogin && password === adminPassword) {
        user = await Admin.create({
            name: "AMA Admin",
            email: normalizedEmail,
            password: await bcrypt.hash(password, 10),
            role: "admin"
        });
    }

    if (!user) {
        return res.status(404).json({ message: "No account found with this email." });
    }

    let passwordMatches = await bcrypt.compare(password, user.password);

    if (isAdminLogin && !passwordMatches && password === adminPassword) {
        user.password = await bcrypt.hash(password, 10);
        await user.save();
        passwordMatches = true;
    }

    if (!passwordMatches) {
        return res.status(401).json({ message: "Incorrect password. Please try again." });
    }

    if (isAdminLogin) {
        user.role = "admin";
        await User.deleteMany({ email: normalizedEmail });
    }

    res.json({
        token: createToken(user),
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    });
});

router.get("/me", protect, (req, res) => {
    res.json({ user: req.user });
});

router.get("/admin/me", protect, require("../middleware/authMiddleware").adminOnly, (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;
