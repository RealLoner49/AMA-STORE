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
            background:
                linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(239, 239, 239, 0.92)),
                repeating-linear-gradient(90deg, rgba(17, 17, 17, 0.06) 0 1px, transparent 1px 18px);
            backdrop-filter: blur(14px);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.18s ease;
        }

        .ama-loader::before,
        .ama-loader::after {
            content: "";
            position: absolute;
            inset: auto -10% 18%;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(17, 17, 17, 0.24), transparent);
            animation: amaLoaderSweep 1.8s ease-in-out infinite;
        }

        .ama-loader::after {
            inset: 18% -10% auto;
            animation-delay: -0.9s;
        }

        .ama-loader.is-visible {
            opacity: 1;
            pointer-events: auto;
        }

        .ama-loader-panel {
            display: grid;
            justify-items: center;
            gap: 18px;
            width: min(260px, calc(100vw - 44px));
            padding: 30px 26px 28px;
            border: 1px solid rgba(17, 17, 17, 0.12);
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.88);
            box-shadow: 0 24px 80px rgba(0, 0, 0, 0.18);
        }

        .ama-loader-logo {
            color: #111;
            font-size: 18px;
            font-weight: 900;
            letter-spacing: 0.22em;
            text-transform: uppercase;
        }

        .ama-loader-mark {
            position: relative;
            width: 92px;
            height: 52px;
            background:
                linear-gradient(90deg, transparent 0 11px, #111 11px 15px, transparent 15px 28px, #111 28px 32px, transparent 32px 45px, #111 45px 49px, transparent 49px 62px, #111 62px 66px, transparent 66px),
                linear-gradient(#111, #111);
            background-size: 100% 100%, 72px 3px;
            background-position: center, center 25px;
            background-repeat: no-repeat;
            animation: amaLoaderPulse 1s ease-in-out infinite;
        }

        .ama-loader-mark::before,
        .ama-loader-mark::after {
            content: "";
            position: absolute;
            top: 50%;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #111;
            transform: translateY(-50%);
            animation: amaLoaderDot 1s ease-in-out infinite;
        }

        .ama-loader-mark::before {
            left: -18px;
        }

        .ama-loader-mark::after {
            right: -18px;
            animation-delay: -0.5s;
        }

        .ama-loader-text {
            color: #111;
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 0.08em;
            line-height: 1.35;
            text-align: center;
            text-transform: uppercase;
        }

        .ama-loader-bar {
            position: relative;
            width: 100%;
            height: 3px;
            overflow: hidden;
            border-radius: 999px;
            background: #ededed;
        }

        .ama-loader-bar::after {
            content: "";
            position: absolute;
            inset: 0 auto 0 0;
            width: 44%;
            border-radius: inherit;
            background: #111;
            animation: amaLoaderBar 1s ease-in-out infinite;
        }

        @keyframes amaLoaderSpin {
            to { transform: rotate(360deg); }
        }

        @keyframes amaLoaderPulse {
            0%, 100% { transform: translateY(0); opacity: 0.72; }
            50% { transform: translateY(-2px); opacity: 1; }
        }

        @keyframes amaLoaderDot {
            0%, 100% { transform: translateY(-50%) scale(0.58); opacity: 0.35; }
            50% { transform: translateY(-50%) scale(1); opacity: 1; }
        }

        @keyframes amaLoaderSweep {
            0%, 100% { transform: translateX(-18%); opacity: 0.25; }
            50% { transform: translateX(18%); opacity: 0.75; }
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
            <div class="ama-loader-mark" aria-hidden="true"></div>
            <div class="ama-loader-text" data-ama-loader-text>Loading...</div>
            <div class="ama-loader-bar" aria-hidden="true"></div>
        </div>
    `;

    document.head.appendChild(style);
    document.body.appendChild(loader);
};

const showAmaLoader = (message = "Loading...") => {
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

const holdAmaLoader = (message = "Loading...") => {
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

        if (shouldShow) showAmaLoader(method === "DELETE" ? "Deleting..." : "Processing...");

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

        showAmaLoader("Loading...");
    });

    document.addEventListener("submit", (event) => {
        if (event.defaultPrevented) return;
        showAmaLoader("Processing...");
    });
};

const logout = () => {
    showAmaLoader("Logging out...");
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
