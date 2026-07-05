const mongoose = require("mongoose");

mongoose.set("bufferCommands", false);

let retryTimer;

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is missing. Add it to backend/.env.");
        }

        if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000
        });
        console.log("MongoDB connected");

        const seedInitialProducts = require("../utils/seedProducts");
        await seedInitialProducts();
    } catch (error) {
        console.error(`MongoDB connection failed: ${error.message}`);

        clearTimeout(retryTimer);
        retryTimer = setTimeout(connectDB, 10000);
        retryTimer.unref?.();
    }
};

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

module.exports = { connectDB, isDatabaseConnected };
