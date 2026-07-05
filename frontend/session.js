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

const normalizePath = (path) => {
    const page = path.split("/").pop().split("#")[0].split("?")[0].toLowerCase();
    return page || "index.html";
};

const updateActiveNav = () => {
    const currentPage = normalizePath(window.location.pathname);
    const pageAliases = {
        "": "index.html",
        "index.html": "index.html",
        "shop.html": "shop.html",
        "lookbook.html": "lookbook.html",
        "support.html": "support.html",
        "cart.html": "cart.html",
        "checkout.html": "cart.html",
        "login.html": "login.html",
        "signup.html": "login.html"
    };
    const activePage = pageAliases[currentPage] || currentPage;

    document.querySelectorAll(".nav-link, .mobile-nav-link, .cart").forEach((link) => {
        const linkPage = pageAliases[normalizePath(link.getAttribute("href") || "")];
        if (linkPage && linkPage === activePage) {
            link.classList.add("is-active");
            link.setAttribute("aria-current", "page");
        } else {
            link.classList.remove("is-active");
            link.removeAttribute("aria-current");
        }
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
updateActiveNav();
window.updateAmaCartCount = updateCartCount;
