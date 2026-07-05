const cartRoot = document.querySelector("[data-cart-root]");

const formatNaira = (price) => {
    const amount = Number(price || 0);

    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0
    }).format(amount);
};

const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getCart = () => JSON.parse(localStorage.getItem("amaCart") || "[]");
const isLoggedInForCart = Boolean(localStorage.getItem("amaToken") && localStorage.getItem("amaSession"));

const saveCart = (cart) => {
    localStorage.setItem("amaCart", JSON.stringify(cart));
    window.updateAmaCartCount?.();
};

const renderCart = () => {
    if (!cartRoot) return;

    const cart = getCart();
    if (!cart.length) {
        cartRoot.innerHTML = `
            <div class="cart-empty">
                <p class="section-kicker">Cart</p>
                <h2>Your cart is empty</h2>
                <a href="shop.html" class="solid-link">Continue Shopping</a>
            </div>
        `;
        return;
    }

    const subtotal = cart.reduce((total, item) => total + Number(item.price || 0) * Number(item.quantity || 1), 0);
    const totalItems = cart.reduce((total, item) => total + Number(item.quantity || 1), 0);

    cartRoot.innerHTML = `
        <div class="cart-items">
            ${cart.map((item) => `
                <article class="cart-item" data-cart-item="${escapeHtml(item._id)}">
                    <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">
                    <div class="cart-item-info">
                        <p>${escapeHtml(item.category || "AMA Collection")}</p>
                        <h2>${escapeHtml(item.name)}</h2>
                        <span>${formatNaira(item.price)}</span>
                    </div>
                    <div class="cart-quantity" aria-label="Quantity controls">
                        <button type="button" data-qty-action="decrease">-</button>
                        <strong>${Number(item.quantity || 1)}</strong>
                        <button type="button" data-qty-action="increase">+</button>
                    </div>
                    <strong class="cart-line-total">${formatNaira(Number(item.price || 0) * Number(item.quantity || 1))}</strong>
                    <button class="cart-remove" type="button" data-qty-action="remove">Remove</button>
                </article>
            `).join("")}
        </div>
        <aside class="cart-summary">
            <p class="section-kicker">Summary</p>
            <h2>Order Total</h2>
            <div>
                <span>Items</span>
                <strong>${totalItems}</strong>
            </div>
            <div>
                <span>Subtotal</span>
                <strong>${formatNaira(subtotal)}</strong>
            </div>
            <div>
                <span>Shipping</span>
                <strong>Calculated later</strong>
            </div>
            <a href="${isLoggedInForCart ? "checkout.html" : "login.html"}" class="solid-link" data-checkout-link>Checkout</a>
            <a href="shop.html" class="cart-secondary-link">Continue Shopping</a>
        </aside>
    `;
};

cartRoot?.addEventListener("click", (event) => {
    const action = event.target.dataset.qtyAction;
    if (!action) return;

    const row = event.target.closest("[data-cart-item]");
    if (!row) return;

    const cart = getCart();
    const item = cart.find((cartItem) => cartItem._id === row.dataset.cartItem);
    if (!item) return;

    if (action === "increase") item.quantity = Number(item.quantity || 1) + 1;
    if (action === "decrease") item.quantity = Math.max(1, Number(item.quantity || 1) - 1);

    const nextCart = action === "remove"
        ? cart.filter((cartItem) => cartItem._id !== row.dataset.cartItem)
        : cart;

    saveCart(nextCart);
    renderCart();
});

renderCart();
