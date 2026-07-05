const Product = require("../models/Product");
const SeedState = require("../models/SeedState");
const seedProducts = require("../data/seedProducts");

const PRODUCT_SEED_KEY = "initial-products";
const PRODUCT_PLACEMENT_SEED_KEY = "product-placement-v1";

const seedProductPlacement = async () => {
    const alreadySeeded = await SeedState.findOne({ key: PRODUCT_PLACEMENT_SEED_KEY });

    if (alreadySeeded) {
        return;
    }

    await Promise.all(seedProducts.map((product) => (
        Product.updateMany(
            { name: product.name },
            { $set: { placement: product.placement || "both" } }
        )
    )));

    await SeedState.create({ key: PRODUCT_PLACEMENT_SEED_KEY });
};

const seedInitialProducts = async () => {
    await Product.updateMany(
        { placement: { $exists: false } },
        { $set: { placement: "both" } }
    );

    const alreadySeeded = await SeedState.findOne({ key: PRODUCT_SEED_KEY });

    if (alreadySeeded) {
        await seedProductPlacement();
        return;
    }

    const productCount = await Product.countDocuments();

    if (productCount === 0) {
        await Product.insertMany(seedProducts);
        console.log(`Seeded ${seedProducts.length} products`);
    }

    await SeedState.create({ key: PRODUCT_SEED_KEY });
    await seedProductPlacement();
};

module.exports = seedInitialProducts;
