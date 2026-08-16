const express = require("express");
const Product = require("../models/Product");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { connectDB, isDatabaseConnected } = require("../config/db");
const localStore = require("../data/localStore");

const router = express.Router();
const canWriteLocalStore = () => !process.env.VERCEL && !process.env.MONGODB_URI;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureProductsDatabase = async () => {
    const retryDelays = [0, 700, 1500];

    for (const delay of retryDelays) {
        if (delay) {
            await wait(delay);
        }

        if (isDatabaseConnected()) {
            return true;
        }

        await connectDB();

        if (isDatabaseConnected()) {
            return true;
        }
    }

    return false;
};

const productsUnavailable = (res) => res.status(503).json({
    message: "Products are still connecting. Please try again."
});

const normalizeProductBody = (body) => {
    const images = Array.isArray(body.images)
        ? body.images.map((image) => String(image || "").trim()).filter(Boolean).slice(0, 3)
        : [];
    const primaryImage = String(body.image || images[0] || "").trim();
    const normalizedImages = [primaryImage, ...images].filter(Boolean)
        .filter((image, index, list) => list.indexOf(image) === index)
        .slice(0, 3);

    return {
        ...body,
        image: normalizedImages[0] || primaryImage,
        images: normalizedImages
    };
};

router.get("/", async (req, res) => {
    const { page } = req.query;
    const validPages = ["shop", "lookbook"];
    const shouldFilterByPage = validPages.includes(page);

    if (!await ensureProductsDatabase()) {
        const products = localStore.listProducts();
        return res.json(shouldFilterByPage ? products.filter((product) => product.placement === page || product.placement === "both") : products);
    }

    const query = shouldFilterByPage ? { placement: { $in: [page, "both"] } } : {};
    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
});

router.get("/:id", async (req, res) => {
    if (!await ensureProductsDatabase()) {
        const product = localStore.getProduct(req.params.id);

        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }

        return res.json(product);
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
        return res.status(404).json({ message: "Product not found." });
    }

    res.json(product);
});

router.post("/", protect, adminOnly, async (req, res) => {
    const productBody = normalizeProductBody(req.body);

    if (!await ensureProductsDatabase()) {
        if (!canWriteLocalStore()) {
            return productsUnavailable(res);
        }

        return res.status(201).json(localStore.createProduct(productBody));
    }

    const product = await Product.create(productBody);
    res.status(201).json(product);
});

router.put("/:id", protect, adminOnly, async (req, res) => {
    const productBody = normalizeProductBody(req.body);

    if (!await ensureProductsDatabase()) {
        if (!canWriteLocalStore()) {
            return productsUnavailable(res);
        }

        const product = localStore.updateProduct(req.params.id, productBody);

        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }

        return res.json(product);
    }

    const product = await Product.findByIdAndUpdate(req.params.id, productBody, {
        new: true,
        runValidators: true
    });

    if (!product) {
        return res.status(404).json({ message: "Product not found." });
    }

    res.json(product);
});

router.delete("/:id", protect, adminOnly, async (req, res) => {
    if (!await ensureProductsDatabase()) {
        if (!canWriteLocalStore()) {
            return productsUnavailable(res);
        }

        const product = localStore.deleteProduct(req.params.id);

        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }

        return res.json({ message: "Product deleted." });
    }

    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
        return res.status(404).json({ message: "Product not found." });
    }

    res.json({ message: "Product deleted." });
});

module.exports = router;
