const { isDatabaseConnected } = require("../config/db");

const requireDatabase = (req, res, next) => {
    if (!isDatabaseConnected()) {
        return res.status(503).json({
            message: "Database is not connected. Check MONGODB_URI and MongoDB Atlas Network Access, then try again."
        });
    }

    next();
};

module.exports = { requireDatabase };
