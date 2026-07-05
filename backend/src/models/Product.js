const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
        image: {
            type: String,
            required: true,
            trim: true
        },
        category: {
            type: String,
            default: "Gym Essentials",
            trim: true
        },
        stock: {
            type: Number,
            default: 0,
            min: 0
        },
        featured: {
            type: Boolean,
            default: false
        },
        placement: {
            type: String,
            enum: ["shop", "lookbook", "both"],
            required: true,
            default: "both"
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
