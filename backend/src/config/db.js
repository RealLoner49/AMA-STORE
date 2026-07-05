const mongoose = require("mongoose");

mongoose.set("bufferCommands", false);

let retryTimer;
let connectionPromise;

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is missing. Add it to backend/.env.");
        }

        if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
            return true;
        }

        if (connectionPromise) {
            return connectionPromise;
        }

        connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000
        }).then(async () => {
            console.log("MongoDB connected");

            const seedInitialProducts = require("../utils/seedProducts");
            await seedInitialProducts();
            return true;
        });

        return await connectionPromise;
    } catch (error) {
        console.error(`MongoDB connection failed: ${error.message}`);

        clearTimeout(retryTimer);
        connectionPromise = null;

        if (!process.env.VERCEL) {
            retryTimer = setTimeout(connectDB, 10000);
            retryTimer.unref?.();
        }

        return false;
    }
};

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

module.exports = { connectDB, isDatabaseConnected };
