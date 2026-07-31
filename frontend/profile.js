const isLocalFrontend = ["127.0.0.1", "localhost"].includes(window.location.hostname) && window.location.port !== "5000";
const API_BASE = isLocalFrontend ? "http://localhost:5000/api" : "/api";
const token = localStorage.getItem("amaToken");
const session = JSON.parse(localStorage.getItem("amaSession") || "null");

const profileName = document.querySelector("[data-profile-name]");
const profileEmail = document.querySelector("[data-profile-email]");
const profileInitials = document.querySelector("[data-profile-initials]");
const ordersCount = document.querySelector("[data-profile-orders-count]");
const itemsCount = document.querySelector("[data-profile-items-count]");
const totalSpent = document.querySelector("[data-profile-total-spent]");
const ordersRoot = document.querySelector("[data-profile-orders]");
const refreshButton = document.querySelector("[data-profile-refresh]");
const latestTitle = document.querySelector("[data-profile-latest-title]");
const latestDetail = document.querySelector("[data-profile-latest-detail]");
const latestStatus = document.querySelector("[data-profile-latest-status]");

const statusLabels = {
    pending: "Pending",
    confirmed: "Confirmed",
    delivered: "Delivered",
    paid: "Paid",
    cancelled: "Cancelled"
};

const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatNaira = (price) => new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
}).format(Number(price || 0));

const formatDate = (value) => {
    if (!value) return "Recently";
    return new Intl.DateTimeFormat("en-NG", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(value));
};

const formatPaymentMethod = (method) => ({
    pay_on_delivery: "Pay on delivery",
    bank_transfer: "Bank transfer",
    paystack: "Paystack"
}[method] || "Payment");

const getItemImage = (item) => item.product?.image || "./Imgs/LOGO.jpeg";
const getItemName = (item) => item.product?.name || item.name || "AMA product";
const getOrderItemLabel = (order) => {
    const firstItem = order.items?.[0];
    const extraItems = Math.max(0, (order.items || []).length - 1);

    return firstItem
        ? `${getItemName(firstItem)}${extraItems ? ` + ${extraItems} more` : ""}`
        : "AMA order";
};
const getInitials = (name = "") => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part[0]).join("");
    return (initials || "AM").toUpperCase();
};

const redirectToLogin = () => {
    localStorage.removeItem("amaToken");
    localStorage.removeItem("amaSession");
    window.location.href = "login.html";
};

const apiRequest = async (path) => {
    const response = await fetch(`${API_BASE}${path}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        return [];
    }

    if (!response.ok) {
        throw new Error(data.message || "Orders are still loading. Please try again.");
    }

    return data;
};

const renderOrders = (orders) => {
    const totalItems = orders.reduce((sum, order) => (
        sum + (order.items || []).reduce((itemSum, item) => itemSum + Number(item.quantity || 1), 0)
    ), 0);
    const spent = orders
        .filter((order) => order.status !== "cancelled")
        .reduce((sum, order) => sum + Number(order.total || 0), 0);

    if (ordersCount) ordersCount.textContent = orders.length;
    if (itemsCount) itemsCount.textContent = totalItems;
    if (totalSpent) totalSpent.textContent = formatNaira(spent);
    const latestOrder = orders[0];

    if (latestTitle && latestDetail && latestStatus) {
        if (latestOrder) {
            const status = latestOrder.status || "pending";
            const itemLabel = getOrderItemLabel(latestOrder);

            latestTitle.textContent = itemLabel;
            latestDetail.textContent = `${formatNaira(latestOrder.total)} - ${formatPaymentMethod(latestOrder.paymentMethod)} - ${formatDate(latestOrder.createdAt)}`;
            latestStatus.textContent = statusLabels[status] || status;
            latestStatus.className = status;
        } else {
            latestTitle.textContent = "No order yet";
            latestDetail.textContent = "Your latest order status will appear here.";
            latestStatus.textContent = "Waiting";
            latestStatus.className = "pending";
        }
    }

    if (!ordersRoot) return;

    if (!orders.length) {
        ordersRoot.innerHTML = `
            <div class="profile-empty">
                <h2>No orders yet</h2>
                <p>Your ordered products and statuses will show here after checkout.</p>
                <a href="shop.html">Start Shopping</a>
            </div>
        `;
        return;
    }

    ordersRoot.innerHTML = orders.map((order) => {
        const status = order.status || "pending";
        const items = order.items || [];

        return `
            <article class="profile-order">
                <div class="profile-order-top">
                    <div>
                        <span>Order placed</span>
                        <strong>${formatDate(order.createdAt)}</strong>
                    </div>
                    <mark class="${escapeHtml(status)}">${escapeHtml(statusLabels[status] || status)}</mark>
                </div>

                <div class="profile-order-items">
                    ${items.map((item) => `
                        <div class="profile-order-item">
                            <img src="${escapeHtml(getItemImage(item))}" alt="${escapeHtml(getItemName(item))}">
                            <div>
                                <strong>${escapeHtml(getItemName(item))}</strong>
                                <span>${Number(item.quantity || 1)} x ${formatNaira(item.price)}</span>
                            </div>
                            <b>${formatNaira(Number(item.price || 0) * Number(item.quantity || 1))}</b>
                        </div>
                    `).join("")}
                </div>

                <div class="profile-order-meta">
                    <div>
                        <span>Total</span>
                        <strong>${formatNaira(order.total)}</strong>
                    </div>
                    <div>
                        <span>Payment</span>
                        <strong>${escapeHtml(formatPaymentMethod(order.paymentMethod))}</strong>
                    </div>
                    <div>
                        <span>Delivery</span>
                        <strong>${escapeHtml([order.shippingAddress?.address, order.shippingAddress?.city].filter(Boolean).join(", ") || "Not provided")}</strong>
                    </div>
                </div>
            </article>
        `;
    }).join("");
};

const loadProfileOrders = async () => {
    if (!token || !session || session.role === "admin") {
        redirectToLogin();
        return;
    }

    if (refreshButton) refreshButton.disabled = true;
    if (ordersRoot && !ordersRoot.querySelector(".profile-order")) {
        ordersRoot.innerHTML = `<p class="products-empty">Loading your orders...</p>`;
    }

    try {
        const orders = await apiRequest("/orders/me");
        renderOrders(orders);
    } catch (error) {
        if (ordersRoot && !ordersRoot.querySelector(".profile-order")) {
            ordersRoot.innerHTML = `<p class="products-empty">Orders are still loading. Please try again.</p>`;
        }
    } finally {
        if (refreshButton) refreshButton.disabled = false;
    }
};

if (profileName) profileName.textContent = session?.name || "Customer";
if (profileEmail) profileEmail.textContent = session?.email || "";
if (profileInitials) profileInitials.textContent = getInitials(session?.name);

refreshButton?.addEventListener("click", loadProfileOrders);
loadProfileOrders();
setInterval(loadProfileOrders, 15000);
