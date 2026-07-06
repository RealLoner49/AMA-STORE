const isLocalFrontend = ["127.0.0.1", "localhost"].includes(window.location.hostname) && window.location.port !== "5000";
const API_BASE = isLocalFrontend ? "http://localhost:5000/api" : "/api";
const token = localStorage.getItem("amaToken");

const adminEmailEl = document.querySelector("[data-admin-email]");
const productForm = document.querySelector("[data-product-form]");
const productList = document.querySelector("[data-product-list]");
const productMessage = document.querySelector("[data-product-message]");
const submitButton = document.querySelector("[data-product-submit]");
const cancelButton = document.querySelector("[data-product-cancel]");
const productsCountEl = document.querySelector("[data-products-count]");
const ordersCountEl = document.querySelector("[data-orders-count]");
const customersCountEl = document.querySelector("[data-customers-count]");
const revenueTotalEl = document.querySelector("[data-revenue-total]");
const ordersList = document.querySelector("[data-orders-list]");
const ordersStatusEl = document.querySelector("[data-orders-status]");
const imagePathInput = document.querySelector("[data-image-path]");
const imageFileInput = document.querySelector("[data-image-file]");
const imagePickButton = document.querySelector("[data-image-pick]");
const priceInput = productForm?.elements.price;
const deleteModal = document.querySelector("[data-delete-modal]");
const deleteProductNameEl = document.querySelector("[data-delete-product-name]");
const deleteConfirmButton = document.querySelector("[data-delete-confirm]");
const adminToast = document.querySelector("[data-admin-toast]");
const adminToastTitle = document.querySelector("[data-admin-toast-title]");
const adminToastMessage = document.querySelector("[data-admin-toast-message]");

let editingProductId = "";
let pendingDeleteProduct = null;
let adminToastTimer;

const placementLabels = {
    shop: "Shop page",
    lookbook: "Lookbook page",
    both: "Shop + Lookbook"
};

const formatNaira = (price) => {
    const amount = Number(price || 0);
    const nairaAmount = amount > 0 && amount < 1000 ? amount * 1000 : amount;

    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0
    }).format(nairaAmount);
};

const cleanNumber = (value) => String(value || "").replace(/[^\d]/g, "");

const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatNumberWithCommas = (value) => {
    const digits = cleanNumber(value);
    return digits ? Number(digits).toLocaleString("en-US") : "";
};

const redirectToLogin = () => {
    localStorage.removeItem("amaToken");
    localStorage.removeItem("amaSession");
    window.location.href = "login.html";
};

document.querySelectorAll("[data-logout], [data-admin-logout]").forEach((button) => {
    button.addEventListener("click", (event) => {
        event.preventDefault();
        redirectToLogin();
    });
});

const apiRequest = async (path, options = {}) => {
    let response;

    try {
        response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...(options.headers || {})
            }
        });
    } catch (error) {
        throw new Error("Cannot reach the server. Start the backend on port 5000 and make sure MongoDB is connected.");
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
};

const setProductMessage = (message, type = "") => {
    if (!productMessage) return;
    productMessage.textContent = message;
    productMessage.className = `admin-message ${type}`.trim();
};

const showAdminToast = (title, message) => {
    if (!adminToast) return;
    if (adminToastTitle) adminToastTitle.textContent = title;
    if (adminToastMessage) adminToastMessage.textContent = message;

    adminToast.hidden = false;
    adminToast.classList.add("is-visible");
    clearTimeout(adminToastTimer);
    adminToastTimer = setTimeout(() => {
        adminToast.classList.remove("is-visible");
        setTimeout(() => {
            adminToast.hidden = true;
        }, 220);
    }, 3200);
};

const verifyAdmin = async () => {
    if (!token) {
        redirectToLogin();
        return;
    }

    try {
        const data = await apiRequest("/auth/admin/me");

        if (adminEmailEl) {
            adminEmailEl.textContent = data.user.email;
        }
    } catch (error) {
        redirectToLogin();
    }
};

const resetProductForm = () => {
    editingProductId = "";
    productForm?.reset();
    if (imageFileInput) imageFileInput.value = "";
    if (submitButton) submitButton.textContent = "Add Product";
    if (cancelButton) cancelButton.hidden = true;
};

const renderProducts = (products) => {
    if (!productList) return;

    if (productsCountEl) {
        productsCountEl.textContent = products.length;
    }

    if (!products.length) {
        productList.innerHTML = `<p class="admin-empty">No products yet. Add your first item above.</p>`;
        return;
    }

    productList.innerHTML = products.map((product) => `
        <div class="admin-product-row">
            <img src="${product.image}" alt="${product.name}">
            <div>
                <strong>${product.name}</strong>
                <span>${formatNaira(product.price)} • ${product.category} • ${placementLabels[product.placement] || "Shop + Lookbook"} • Stock ${product.stock}</span>
            </div>
            <div class="admin-product-actions">
                <button type="button" data-edit-product="${product._id}">Edit</button>
                <button type="button" data-delete-product="${product._id}">Delete</button>
            </div>
        </div>
    `).join("");
};

const formatPaymentMethod = (method) => ({
    pay_on_delivery: "Pay on delivery",
    bank_transfer: "Bank transfer",
    paystack: "Paystack"
}[method] || "Payment");

const formatOrderDate = (date) => {
    if (!date) return "Just now";

    return new Intl.DateTimeFormat("en-NG", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(date));
};

const renderOrders = (orders) => {
    const paidOrders = orders.filter((order) => order.status === "paid");
    const customers = new Set(orders.map((order) => order.contact?.email || order.customer?.email).filter(Boolean));
    const revenue = paidOrders.reduce((total, order) => total + Number(order.total || 0), 0);

    if (ordersCountEl) ordersCountEl.textContent = orders.length;
    if (customersCountEl) customersCountEl.textContent = customers.size;
    if (revenueTotalEl) revenueTotalEl.textContent = formatNaira(revenue);
    if (ordersStatusEl) ordersStatusEl.textContent = orders.length ? "Auto-refreshing" : "No orders yet";

    if (!ordersList) return;

    if (!orders.length) {
        ordersList.innerHTML = `<p class="admin-empty">Orders will appear here after checkout.</p>`;
        return;
    }

    ordersList.innerHTML = orders.slice(0, 6).map((order) => {
        const customerName = order.contact?.name || order.customer?.name || "Customer";
        const customerEmail = order.contact?.email || order.customer?.email || "";
        const itemCount = (order.items || []).reduce((total, item) => total + Number(item.quantity || 1), 0);
        const statusClass = order.status === "paid" ? "paid" : "pending";

        return `
            <article class="admin-order-row">
                <div>
                    <strong>${escapeHtml(customerName)}</strong>
                    <span>${escapeHtml(customerEmail)} &bull; ${itemCount} item${itemCount === 1 ? "" : "s"} &bull; ${formatOrderDate(order.createdAt)}</span>
                </div>
                <div>
                    <strong>${formatNaira(order.total)}</strong>
                    <span>${formatPaymentMethod(order.paymentMethod)}</span>
                </div>
                <mark class="${statusClass}">${escapeHtml(order.status || "pending")}</mark>
            </article>
        `;
    }).join("");
};

const loadOrders = async () => {
    try {
        const orders = await apiRequest("/orders");
        renderOrders(orders);
    } catch (error) {
        if (ordersStatusEl) ordersStatusEl.textContent = "Orders unavailable";
        if (ordersList) ordersList.innerHTML = `<p class="admin-empty">${escapeHtml(error.message)}</p>`;
    }
};

const loadProducts = async () => {
    try {
        const products = await apiRequest("/products");
        renderProducts(products);
    } catch (error) {
        setProductMessage(error.message, "error");
    }
};

const fillProductForm = async (id) => {
    try {
        const product = await apiRequest(`/products/${id}`);
        editingProductId = product._id;
        productForm.name.value = product.name;
        productForm.price.value = formatNumberWithCommas(product.price);
        productForm.image.value = product.image;
        productForm.category.value = product.category;
        productForm.placement.value = product.placement || "both";
        productForm.stock.value = product.stock;
        productForm.featured.checked = product.featured;
        if (submitButton) submitButton.textContent = "Save Product";
        if (cancelButton) cancelButton.hidden = false;
        setProductMessage("Editing product.");
    } catch (error) {
        setProductMessage(error.message, "error");
    }
};

const openDeleteModal = (product) => {
    pendingDeleteProduct = product;
    if (deleteProductNameEl) deleteProductNameEl.textContent = product.name || "this product";
    if (deleteModal) deleteModal.hidden = false;
    deleteConfirmButton?.focus();
};

const closeDeleteModal = () => {
    pendingDeleteProduct = null;
    if (deleteModal) deleteModal.hidden = true;
};

if (productForm) {
    productForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const product = {
            name: productForm.name.value,
            price: Number(cleanNumber(productForm.price.value)),
            image: productForm.image.value,
            category: productForm.category.value,
            placement: productForm.placement.value,
            stock: Number(productForm.stock.value || 0),
            featured: productForm.featured.checked
        };
        const placementLabel = placementLabels[product.placement] || "Shop + Lookbook";

        try {
            const path = editingProductId ? `/products/${editingProductId}` : "/products";
            const method = editingProductId ? "PUT" : "POST";
            await apiRequest(path, {
                method,
                body: JSON.stringify(product)
            });
            setProductMessage(editingProductId ? "Product updated." : "Product added.", "success");
            showAdminToast(
                editingProductId ? "Product updated" : "Product added",
                `${product.name} is now showing on ${placementLabel}.`
            );
            resetProductForm();
            loadProducts();
        } catch (error) {
            setProductMessage(error.message, "error");
        }
    });
}

priceInput?.addEventListener("input", () => {
    priceInput.value = formatNumberWithCommas(priceInput.value);
});

const openImagePicker = () => {
    imageFileInput?.click();
};

imagePathInput?.addEventListener("click", openImagePicker);
imagePickButton?.addEventListener("click", openImagePicker);

imageFileInput?.addEventListener("change", () => {
    const file = imageFileInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
        if (!imagePathInput) return;
        imagePathInput.value = reader.result;
        setProductMessage(`Selected ${file.name} from your gallery.`, "success");
    });
    reader.addEventListener("error", () => {
        setProductMessage("Could not read that image. Please choose another file.", "error");
    });
    reader.readAsDataURL(file);
});

if (productList) {
    productList.addEventListener("click", async (event) => {
        const editId = event.target.dataset.editProduct;
        const deleteId = event.target.dataset.deleteProduct;

        if (editId) {
            fillProductForm(editId);
        }

        if (deleteId) {
            const productRow = event.target.closest(".admin-product-row");
            const productName = productRow?.querySelector("strong")?.textContent || "this product";
            openDeleteModal({ _id: deleteId, name: productName });
        }
    });
}

document.querySelectorAll("[data-delete-cancel]").forEach((button) => {
    button.addEventListener("click", closeDeleteModal);
});

deleteConfirmButton?.addEventListener("click", async () => {
    if (!pendingDeleteProduct) return;

    try {
        await apiRequest(`/products/${pendingDeleteProduct._id}`, { method: "DELETE" });
        setProductMessage("Product deleted.", "success");
        showAdminToast("Product deleted", `${pendingDeleteProduct.name} has been removed from the store.`);
        closeDeleteModal();
        loadProducts();
    } catch (error) {
        setProductMessage(error.message, "error");
        closeDeleteModal();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDeleteModal();
});

if (cancelButton) {
    cancelButton.addEventListener("click", resetProductForm);
}

verifyAdmin().then(() => {
    loadProducts();
    loadOrders();
    setInterval(loadOrders, 15000);
});
