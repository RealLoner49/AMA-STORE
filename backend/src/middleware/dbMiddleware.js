const { connectDB, isDatabaseConnected } = require("../config/db");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const requireDatabase = async (req, res, next) => {
    const retryDelays = [0, 1200, 2500, 4000];

    for (const delay of retryDelays) {
        if (delay) {
            await wait(delay);
        }

        if (isDatabaseConnected()) {
            return next();
        }

        await connectDB();

        if (isDatabaseConnected()) {
            return next();
        }
    }

    return res.status(503).json({
        message: "We are having problem fetching orders."
    });
};

module.exports = { requireDatabase };
