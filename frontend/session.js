(() => {
const session = JSON.parse(localStorage.getItem("amaSession") || "null");
const token = localStorage.getItem("amaToken");
const isLoggedIn = Boolean(session && token);
const isAdmin = isLoggedIn && String(session?.role || "").toLowerCase() === "admin";
let loaderHideTimer;
let loaderHoldCount = 0;

const installAmaLoader = () => {
    if (document.querySelector("[data-ama-loader]")) return;

    const style = document.createElement("style");
    style.textContent = `
        .ama-loader {
            position: fixed;
            inset: 0;
            z-index: 5000;
            display: grid;
            place-items: center;
            overflow: hidden;
            background: #f7f2ea;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.28s ease;
        }

        .ama-loader.is-visible {
            opacity: 1;
            pointer-events: auto;
        }

        .ama-loader-panel {
            position: relative;
            display: grid;
            justify-items: center;
            gap: 14px;
            width: min(180px, calc(100vw - 48px));
            padding: 0;
            background: transparent;
        }

        .ama-loader-logo {
            color: #111;
            font-family: Georgia, "Times New Roman", serif;
            font-size: clamp(36px, 8vw, 52px);
            font-weight: 500;
            letter-spacing: 0.1em;
            line-height: 1;
            text-transform: uppercase;
        }

        .ama-loader-text {
            color: #111;
            font-size: 12px;
            font-weight: 500;
            letter-spacing: 0.52em;
            line-height: 1;
            text-align: center;
            text-transform: uppercase;
            transform: translateX(0.26em);
        }

        .ama-loader-bar {
            position: relative;
            width: 88px;
            height: 1px;
            overflow: hidden;
            background: rgba(184, 137, 74, 0.42);
        }

        .ama-loader-bar::after {
            content: "";
            position: absolute;
            inset: 0 auto 0 0;
            width: 38%;
            border-radius: inherit;
            background: #b8894a;
            animation: amaLoaderBar 1.35s ease-in-out infinite;
        }

        @keyframes amaLoaderBar {
            0% { transform: translateX(-110%); }
            100% { transform: translateX(240%); }
        }
    `;

    const loader = document.createElement("div");
    loader.className = "ama-loader is-visible";
    loader.setAttribute("data-ama-loader", "");
    loader.setAttribute("role", "status");
    loader.setAttribute("aria-live", "polite");
    loader.innerHTML = `
        <div class="ama-loader-panel">
            <div class="ama-loader-logo">AMA</div>
            <div class="ama-loader-bar" aria-hidden="true"></div>
            <div class="ama-loader-text" data-ama-loader-text>Loading</div>
        </div>
    `;

    document.head.appendChild(style);
    document.body.appendChild(loader);
};

const showAmaLoader = (message = "Loading") => {
    const loader = document.querySelector("[data-ama-loader]");
    const text = document.querySelector("[data-ama-loader-text]");
    if (!loader) return;

    clearTimeout(loaderHideTimer);
    if (text) text.textContent = message;
    loader.hidden = false;
    requestAnimationFrame(() => loader.classList.add("is-visible"));
};

const hideAmaLoader = (delay = 160) => {
    const loader = document.querySelector("[data-ama-loader]");
    if (!loader) return;
    if (loaderHoldCount > 0) return;

    clearTimeout(loaderHideTimer);
    loaderHideTimer = setTimeout(() => {
        loader.classList.remove("is-visible");
        setTimeout(() => {
            if (!loader.classList.contains("is-visible")) loader.hidden = true;
        }, 200);
    }, delay);
};

const holdAmaLoader = (message = "Loading") => {
    loaderHoldCount += 1;
    showAmaLoader(message);
};

const releaseAmaLoader = (delay = 160) => {
    loaderHoldCount = Math.max(0, loaderHoldCount - 1);
    if (loaderHoldCount === 0) hideAmaLoader(delay);
};

const patchFetchLoader = () => {
    if (window.__amaFetchLoaderPatched) return;
    window.__amaFetchLoaderPatched = true;

    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
        const options = args[1] || {};
        const method = String(options.method || "GET").toUpperCase();
        const shouldShow = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

        if (shouldShow) showAmaLoader(method === "DELETE" ? "Deleting" : "Processing");

        try {
            return await nativeFetch(...args);
        } finally {
            if (shouldShow) hideAmaLoader();
        }
    };
};

const bindInteractionLoader = () => {
    document.addEventListener("click", (event) => {
        const link = event.target.closest("a[href]");
        if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        const href = link.getAttribute("href") || "";
        const target = link.getAttribute("target");
        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || target === "_blank") return;

        showAmaLoader("Loading");
    });

    document.addEventListener("submit", (event) => {
        if (event.defaultPrevented) return;
        showAmaLoader("Processing");
    });
};

const logout = () => {
    showAmaLoader("Logging out");
    localStorage.removeItem("amaToken");
    localStorage.removeItem("amaSession");
    window.location.href = "login.html";
};

const getCartCount = () => {
    const cart = JSON.parse(localStorage.getItem("amaCart") || "[]");
    return cart.reduce((total, item) => total + Number(item.quantity || 0), 0);
};

const updateCartCount = () => {
    if (isAdmin) return;

    const count = getCartCount();
    document.querySelectorAll('a[href="cart.html"]').forEach((link) => {
        link.textContent = count > 0 ? `Cart (${count})` : "Cart";
        link.setAttribute("aria-label", count > 0 ? `Cart with ${count} item${count === 1 ? "" : "s"}` : "Cart");
    });
};

const updateAdminNav = () => {
    if (!isAdmin) return;

    document.querySelectorAll('a[href="cart.html"]').forEach((link) => {
        link.textContent = "Admin";
        link.href = "admin.html";
        link.dataset.adminNav = "true";
        link.setAttribute("aria-label", "Open admin dashboard");
    });
};

const addCustomerProfileNav = () => {
    if (!isLoggedIn || isAdmin) return;

    document.querySelectorAll(".nav-right").forEach((nav) => {
        if (nav.querySelector('a[href="profile.html"]')) return;

        const profileLink = document.createElement("a");
        profileLink.className = "cart";
        profileLink.href = "profile.html";
        profileLink.textContent = "Profile";
        profileLink.setAttribute("aria-label", "Open profile");

        const cartLink = nav.querySelector('a[href="cart.html"]');
        nav.insertBefore(profileLink, cartLink || null);
    });

    document.querySelectorAll(".mobile-menu").forEach((menu) => {
        if (menu.querySelector('a[href="profile.html"]')) return;

        const profileLink = document.createElement("a");
        profileLink.className = "mobile-nav-link";
        profileLink.href = "profile.html";
        profileLink.textContent = "Profile";

        const cartLink = menu.querySelector('a[href="cart.html"]');
        menu.insertBefore(profileLink, cartLink || null);
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
        "profile.html": "profile.html",
        "admin.html": "admin.html",
        "login.html": "login.html",
        "signup.html": "login.html"
    };
    const activePage = pageAliases[currentPage] || currentPage;

    document.querySelectorAll(".nav-link, .mobile-nav-link, .cart").forEach((link) => {
        if (link.hasAttribute("data-logout") || link.dataset.authLink === "logout") {
            link.classList.remove("is-active");
            link.removeAttribute("aria-current");
            return;
        }

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

    if (!isAdmin) {
        link.remove();
        return;
    }

    link.textContent = "Logout";
    link.href = "#";
    link.dataset.authLink = "logout";
    link.setAttribute("aria-label", "Logout");
    link.classList.remove("is-active");
    link.removeAttribute("aria-current");
    link.addEventListener("click", (event) => {
        event.preventDefault();
        logout();
    });
});

document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", logout);
});

installAmaLoader();
patchFetchLoader();
bindInteractionLoader();
window.addEventListener("load", () => hideAmaLoader(260));
setTimeout(() => hideAmaLoader(), 1200);

updateAdminNav();
addCustomerProfileNav();
updateCartCount();
updateActiveNav();
window.updateAmaCartCount = updateCartCount;
window.showAmaLoader = showAmaLoader;
window.hideAmaLoader = hideAmaLoader;
window.holdAmaLoader = holdAmaLoader;
window.releaseAmaLoader = releaseAmaLoader;
})();
