const jwt = require("jsonwebtoken");

const createToken = (user) => {
    const collection = typeof user.collection === "string"
        ? user.collection
        : user.role === "admin" ? "admins" : "users";

    return jwt.sign(
        {
            id: user._id,
            role: user.role,
            collection
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

module.exports = createToken;
