const { isDatabaseConnected } = require("../config/db");

const requireDatabase = (req, res, next) => {
    if (!isDatabaseConnected()) {
        return res.status(503).json({
            message: process.env.VERCEL
                ? "Database is not connected. MongoDB Atlas is blocking Vercel. Add 0.0.0.0/0 in Atlas Network Access, then try again."
                : "Database is not connected. Check MONGODB_URI and MongoDB Atlas Network Access, then try again."
        });
    }

    next();
};

module.exports = { requireDatabase };
