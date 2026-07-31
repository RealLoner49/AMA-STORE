const { isDatabaseConnected } = require("../config/db");

const requireDatabase = (req, res, next) => {
    if (!isDatabaseConnected()) {
        return res.status(503).json({
            message: "We are having problem fetching orders."
        });
    }

    next();
};

module.exports = { requireDatabase };
