const checkoutForm = document.querySelector("[data-checkout-form]");
const checkoutSummary = document.querySelector("[data-checkout-summary]");
const bankTransferPanel = document.querySelector("[data-bank-transfer]");
const isLocalFrontend = ["127.0.0.1", "localhost"].includes(window.location.hostname) && window.location.port !== "5000";
const API_BASE = isLocalFrontend ? "http://localhost:5000/api" : "/api";
const checkoutToken = localStorage.getItem("amaToken");
const checkoutSession = JSON.parse(localStorage.getItem("amaSession") || "null");
let isSubmittingCheckout = false;

if (!checkoutToken || !checkoutSession) {
    window.location.href = "login.html";
}
const PAYSTACK_PUBLIC_KEY = "pk_test_9fd36c5c00120536c49b3ac0f3d28c3a41705696";

const formatNaira = (price) => new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
}).format(Number(price || 0));

const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getCart = () => JSON.parse(localStorage.getItem("amaCart") || "[]");

const isObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || ""));

const setMessage = (message, type = "") => {
    const messageEl = document.querySelector("[data-checkout-message]");
    if (!messageEl) return;
    messageEl.textContent = message;
    messageEl.className = `checkout-message ${type}`.trim();
};

const updatePaymentDetails = () => {
    if (!bankTransferPanel || !checkoutForm) return;
    bankTransferPanel.hidden = checkoutForm.paymentMethod.value !== "bank_transfer";
};

const buildOrderBody = (cart, subtotal, paymentReference = "") => ({
    items: cart.map((item) => ({
        ...(isObjectId(item._id) ? { product: item._id } : {}),
        name: item.name,
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1)
    })),
    total: subtotal,
    contact: {
        name: checkoutForm.name.value,
        email: checkoutForm.email.value,
        phone: checkoutForm.phone.value
    },
    shippingAddress: {
        address: checkoutForm.address.value,
        city: checkoutForm.city.value
    },
    paymentMethod: checkoutForm.paymentMethod.value,
    paymentReference
});

const saveOrder = async (body) => {
    const response = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
                Authorization: `Bearer ${checkoutToken}`
        },
        body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Could not place order.");
    return data;
};

const finishOrder = () => {
    localStorage.removeItem("amaCart");
    window.updateAmaCartCount?.();
    setMessage("Order placed successfully. Redirecting...", "success");
    setTimeout(() => {
        window.location.href = "shop.html";
    }, 1100);
};

const payWithPaystack = (cart, subtotal) => new Promise((resolve, reject) => {
    if (!window.PaystackPop) {
        reject(new Error("Paystack could not load. Check your internet connection and try again."));
        return;
    }

    if (!PAYSTACK_PUBLIC_KEY.startsWith("pk_test_") || PAYSTACK_PUBLIC_KEY.includes("replace_with")) {
        reject(new Error("Add your Paystack test public key in checkout.js first."));
        return;
    }

    const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: checkoutForm.email.value,
        amount: Math.round(subtotal * 100),
        currency: "NGN",
        ref: `AMA-${Date.now()}`,
        metadata: {
            custom_fields: [
                {
                    display_name: "Customer Name",
                    variable_name: "customer_name",
                    value: checkoutForm.name.value
                },
                {
                    display_name: "Phone",
                    variable_name: "phone",
                    value: checkoutForm.phone.value
                }
            ],
            cart_items: cart.map((item) => ({
                name: item.name,
                quantity: Number(item.quantity || 1),
                price: Number(item.price || 0)
            }))
        },
        callback: (response) => resolve(response.reference),
        onClose: () => reject(new Error("Payment was cancelled."))
    });

    handler.openIframe();
});

const renderSummary = () => {
    if (!checkoutSummary) return;

    const cart = getCart();
    if (!cart.length) {
        checkoutSummary.innerHTML = `
            <div class="cart-empty">
                <p class="section-kicker">Checkout</p>
                <h2>Your cart is empty</h2>
                <a href="shop.html" class="solid-link">Shop Collection</a>
            </div>
        `;
        checkoutForm?.querySelectorAll("input, button").forEach((element) => {
            element.disabled = true;
        });
        return;
    }

    const subtotal = cart.reduce((total, item) => total + Number(item.price || 0) * Number(item.quantity || 1), 0);
    const itemCount = cart.reduce((total, item) => total + Number(item.quantity || 1), 0);

    checkoutSummary.innerHTML = `
        <p class="section-kicker">Order</p>
        <h2>Review Items</h2>
        <div class="checkout-items">
            ${cart.map((item) => `
                <article class="checkout-item">
                    <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">
                    <div>
                        <h3>${escapeHtml(item.name)}</h3>
                        <p>${Number(item.quantity || 1)} x ${formatNaira(item.price)}</p>
                    </div>
                    <strong>${formatNaira(Number(item.price || 0) * Number(item.quantity || 1))}</strong>
                </article>
            `).join("")}
        </div>
        <div class="checkout-total-row">
            <span>Items</span>
            <strong>${itemCount}</strong>
        </div>
        <div class="checkout-total-row">
            <span>Subtotal</span>
            <strong>${formatNaira(subtotal)}</strong>
        </div>
        <div class="checkout-total-row">
            <span>Shipping</span>
            <strong>Calculated after confirmation</strong>
        </div>
        <button class="checkout-submit" type="submit">Place Order</button>
        <p class="checkout-message" data-checkout-message></p>
    `;
};

const fillSessionDetails = () => {
    if (!checkoutForm || !checkoutSession) return;
    checkoutForm.name.value = checkoutSession.name || "";
    checkoutForm.email.value = checkoutSession.email || "";
};

checkoutForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmittingCheckout) return;

    if (!checkoutToken) {
        setMessage("Please login before placing your order.", "error");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 900);
        return;
    }

    const cart = getCart();
    if (!cart.length) {
        setMessage("Your cart is empty.", "error");
        return;
    }

    const subtotal = cart.reduce((total, item) => total + Number(item.price || 0) * Number(item.quantity || 1), 0);
    const submitButton = checkoutForm.querySelector(".checkout-submit");
    isSubmittingCheckout = true;
    if (submitButton) submitButton.disabled = true;
    setMessage("Placing order...");

    try {
        const paymentReference = checkoutForm.paymentMethod.value === "paystack"
            ? await payWithPaystack(cart, subtotal)
            : "";
        await saveOrder(buildOrderBody(cart, subtotal, paymentReference));
        finishOrder();
    } catch (error) {
        setMessage(error.message, "error");
    } finally {
        isSubmittingCheckout = false;
        if (submitButton) submitButton.disabled = false;
    }
});

checkoutForm?.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
    input.addEventListener("change", () => {
        updatePaymentDetails();
        if (input.value === "bank_transfer") return;
        if (!checkoutForm.checkValidity() || !getCart().length || isSubmittingCheckout) return;
        checkoutForm.requestSubmit();
    });
});

fillSessionDetails();
renderSummary();
updatePaymentDetails();
