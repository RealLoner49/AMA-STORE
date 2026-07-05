const session = JSON.parse(localStorage.getItem("amaSession") || "null");
const token = localStorage.getItem("amaToken");
const isLoggedIn = Boolean(session && token);

const logout = () => {
    localStorage.removeItem("amaToken");
    localStorage.removeItem("amaSession");
    window.location.href = "login.html";
};

const getCartCount = () => {
    const cart = JSON.parse(localStorage.getItem("amaCart") || "[]");
    return cart.reduce((total, item) => total + Number(item.quantity || 0), 0);
};

const updateCartCount = () => {
    const count = getCartCount();
    document.querySelectorAll('a[href="cart.html"]').forEach((link) => {
        link.textContent = count > 0 ? `Cart (${count})` : "Cart";
        link.setAttribute("aria-label", count > 0 ? `Cart with ${count} item${count === 1 ? "" : "s"}` : "Cart");
    });
};

document.querySelectorAll("[data-auth-link]").forEach((link) => {
    if (!isLoggedIn) return;

    link.textContent = "Logout";
    link.href = "#";
    link.setAttribute("aria-label", "Logout");
    link.addEventListener("click", (event) => {
        event.preventDefault();
        logout();
    });
});

document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", logout);
});

updateCartCount();
window.updateAmaCartCount = updateCartCount;
