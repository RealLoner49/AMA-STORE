const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        items: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product"
                },
                name: String,
                price: Number,
                quantity: {
                    type: Number,
                    default: 1
                }
            }
        ],
        total: {
            type: Number,
            default: 0
        },
        contact: {
            name: String,
            email: String,
            phone: String
        },
        shippingAddress: {
            address: String,
            city: String
        },
        paymentMethod: {
            type: String,
            enum: ["pay_on_delivery", "bank_transfer", "paystack"],
            default: "pay_on_delivery"
        },
        paymentReference: String,
        status: {
            type: String,
            enum: ["pending", "paid", "shipped", "cancelled"],
            default: "pending"
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
