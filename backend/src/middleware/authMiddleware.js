const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Admin = require("../models/Admin");

const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
        return res.status(401).json({ message: "Not authorized." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.collection === "env-admin") {
            req.user = {
                _id: decoded.id,
                id: decoded.id,
                name: "AMA Admin",
                email: process.env.ADMIN_EMAIL,
                role: "admin"
            };
            return next();
        }

        const Model = decoded.collection === "admins" ? Admin : User;
        const user = await Model.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(401).json({ message: "User no longer exists." });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: "Session expired. Please login again." });
    }
};

const adminOnly = (req, res, next) => {
    const configuredAdminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const userEmail = req.user?.email?.toLowerCase();

    if (req.user?.role !== "admin" || userEmail !== configuredAdminEmail) {
        return res.status(403).json({ message: "Admin access required." });
    }

    next();
};

module.exports = { protect, adminOnly };
