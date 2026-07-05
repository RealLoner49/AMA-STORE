const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const seedProducts = require("./seedProducts");

const dataDir = path.join(__dirname, "../../data");
const productsFile = path.join(dataDir, "products.json");
const usersFile = path.join(dataDir, "users.json");

const defaultProducts = seedProducts.map((product, index) => ({
    _id: `local-ama-${index + 1}`,
    ...product,
    createdAt: new Date().toISOString()
}));

const ensureStore = () => {
    fs.mkdirSync(dataDir, { recursive: true });

    if (!fs.existsSync(productsFile)) {
        fs.writeFileSync(productsFile, JSON.stringify(defaultProducts, null, 2));
    }

    if (!fs.existsSync(usersFile)) {
        fs.writeFileSync(usersFile, JSON.stringify([], null, 2));
    }
};

const readProducts = () => {
    ensureStore();
    return JSON.parse(fs.readFileSync(productsFile, "utf8"));
};

const readUsers = () => {
    ensureStore();
    return JSON.parse(fs.readFileSync(usersFile, "utf8"));
};

const writeProducts = (products) => {
    ensureStore();
    fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
};

const writeUsers = (users) => {
    ensureStore();
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
};

const listProducts = () => readProducts().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

const getProduct = (id) => readProducts().find((product) => product._id === id);

const createProduct = (product) => {
    const products = readProducts();
    const nextProduct = {
        _id: crypto.randomUUID(),
        name: product.name,
        price: Number(product.price || 0),
        image: product.image,
        category: product.category || "Collection",
        placement: product.placement || "both",
        stock: Number(product.stock || 0),
        featured: Boolean(product.featured),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    products.unshift(nextProduct);
    writeProducts(products);
    return nextProduct;
};

const updateProduct = (id, product) => {
    const products = readProducts();
    const index = products.findIndex((item) => item._id === id);

    if (index === -1) return null;

    products[index] = {
        ...products[index],
        ...product,
        price: Number(product.price ?? products[index].price),
        stock: Number(product.stock ?? products[index].stock),
        featured: Boolean(product.featured),
        updatedAt: new Date().toISOString()
    };

    writeProducts(products);
    return products[index];
};

const deleteProduct = (id) => {
    const products = readProducts();
    const product = products.find((item) => item._id === id);

    if (!product) return null;

    writeProducts(products.filter((item) => item._id !== id));
    return product;
};

const getUser = (id) => {
    const user = readUsers().find((item) => item._id === id);
    if (!user) return null;

    const { password, ...safeUser } = user;
    return safeUser;
};

const findUserByEmail = (email) => readUsers().find((user) => user.email === email);

const createUser = (user) => {
    const users = readUsers();
    const nextUser = {
        _id: crypto.randomUUID(),
        name: user.name,
        email: user.email,
        password: user.password,
        role: user.role || "customer",
        collection: "local-users",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    users.unshift(nextUser);
    writeUsers(users);
    return nextUser;
};

module.exports = {
    listProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    getUser,
    findUserByEmail,
    createUser
};
