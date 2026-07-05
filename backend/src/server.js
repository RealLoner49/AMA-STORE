const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { connectDB, isDatabaseConnected } = require("./config/db");
const { requireDatabase } = require("./middleware/dbMiddleware");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const newsletterRoutes = require("./routes/newsletterRoutes");

dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 5000;
const frontendPath = path.join(__dirname, "../../frontend");

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api", async (req, res, next) => {
    await connectDB();
    next();
});

app.get("/api/health", async (req, res) => {
    await connectDB();
    res.json({
        ok: true,
        database: isDatabaseConnected() ? "connected" : "disconnected"
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", requireDatabase, orderRoutes);
app.use("/api/newsletter", newsletterRoutes);

app.use(express.static(frontendPath));

app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

connectDB();

if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`AMA STORE backend running on http://localhost:${PORT}`);
    });
}

module.exports = app;
