const express = require("express");
const Product = require("../models/Product");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { isDatabaseConnected } = require("../config/db");
const localStore = require("../data/localStore");

const router = express.Router();

router.get("/", async (req, res) => {
    const { page } = req.query;
    const validPages = ["shop", "lookbook"];
    const shouldFilterByPage = validPages.includes(page);

    if (!isDatabaseConnected()) {
        const products = localStore.listProducts();
        return res.json(shouldFilterByPage ? products.filter((product) => product.placement === page || product.placement === "both") : products);
    }

    const query = shouldFilterByPage ? { placement: { $in: [page, "both"] } } : {};
    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
});

router.get("/:id", async (req, res) => {
    if (!isDatabaseConnected()) {
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
    if (!isDatabaseConnected()) {
        return res.status(201).json(localStore.createProduct(req.body));
    }

    const product = await Product.create(req.body);
    res.status(201).json(product);
});

router.put("/:id", protect, adminOnly, async (req, res) => {
    if (!isDatabaseConnected()) {
        const product = localStore.updateProduct(req.params.id, req.body);

        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }

        return res.json(product);
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    if (!product) {
        return res.status(404).json({ message: "Product not found." });
    }

    res.json(product);
});

router.delete("/:id", protect, adminOnly, async (req, res) => {
    if (!isDatabaseConnected()) {
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
