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
const ordersPanel = document.querySelector("[data-orders-panel]");
const ordersList = document.querySelector("[data-orders-list]");
const ordersStatusEl = document.querySelector("[data-orders-status]");
const ordersRefreshButton = document.querySelector("[data-orders-refresh]");
const ordersToggleButton = document.querySelector("[data-orders-toggle]");
const imagePathInput = document.querySelector("[data-image-path]");
const imageSummaryInput = document.querySelector("[data-image-summary]");
const imageCount = document.querySelector("[data-image-count]");
const imageFileInput = document.querySelector("[data-image-file]");
const imagePickButton = document.querySelector("[data-image-pick]");
const imagePreview = document.querySelector("[data-image-preview]");
const priceInput = productForm?.elements.price;
const deleteModal = document.querySelector("[data-delete-modal]");
const deleteProductNameEl = document.querySelector("[data-delete-product-name]");
const deleteConfirmButton = document.querySelector("[data-delete-confirm]");
const adminToast = document.querySelector("[data-admin-toast]");
const adminToastTitle = document.querySelector("[data-admin-toast-title]");
const adminToastMessage = document.querySelector("[data-admin-toast-message]");
const orderModal = document.querySelector("[data-order-modal]");
const orderModalContent = document.querySelector("[data-order-modal-content]");

let editingProductId = "";
let pendingDeleteProduct = null;
let adminToastTimer;
let isSavingProduct = false;
let latestOrderId = "";
let isLoadingOrders = false;
let currentOrders = [];
let selectedOrderId = "";
let pendingDeleteOrderId = "";
let selectedProductImages = [];

const placementLabels = {
    shop: "Shop page",
    lookbook: "Lookbook page",
    both: "Shop + Lookbook"
};

const orderStatusLabels = {
    pending: "Pending",
    confirmed: "Confirmed",
    delivered: "Delivered",
    paid: "Paid",
    cancelled: "Cancelled"
};

const editableOrderStatuses = ["pending", "confirmed", "delivered", "cancelled"];
const orderStatusOptions = editableOrderStatuses.map((value) => ({ value, label: orderStatusLabels[value] }));

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

ordersToggleButton?.addEventListener("click", () => {
    const isOpen = ordersPanel?.classList.toggle("is-orders-open") || false;
    ordersToggleButton.setAttribute("aria-expanded", String(isOpen));
});

const apiRequest = async (path, options = {}) => {
    let response;

    try {
        response = await fetch(`${API_BASE}${path}`, {
            cache: "no-store",
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
    selectedProductImages = [];
    if (imagePathInput) imagePathInput.dataset.images = "";
    if (imageSummaryInput) imageSummaryInput.value = "";
    renderImagePreview();
    if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Add Product";
    }
    if (cancelButton) cancelButton.hidden = true;
};

const getProductImages = (product) => {
    const images = Array.isArray(product.images) ? product.images : [];

    return [product.image, ...images]
        .map((image) => String(image || "").trim())
        .filter(Boolean)
        .filter((image, index, list) => list.indexOf(image) === index)
        .slice(0, 3);
};

const renderImagePreview = () => {
    if (!imagePreview) return;

    if (imageSummaryInput) {
        imageSummaryInput.value = selectedProductImages.length
            ? `${selectedProductImages.length} image${selectedProductImages.length === 1 ? "" : "s"} selected`
            : "";
    }

    if (imageCount) {
        imageCount.textContent = selectedProductImages.length
            ? `${selectedProductImages.length} of 3 product images selected`
            : "No images selected";
    }

    imagePreview.innerHTML = selectedProductImages.length
        ? selectedProductImages.map((image, index) => `
            <span class="admin-image-thumb">
                <img src="${escapeHtml(image)}" alt="Product image ${index + 1}">
                <b>${index + 1}</b>
            </span>
        `).join("")
        : `<span class="admin-image-hint">Choose up to 3 images. The first image shows on product cards.</span>`;
};

const setSelectedProductImages = (images) => {
    selectedProductImages = images
        .map((image) => String(image || "").trim())
        .filter(Boolean)
        .filter((image, index, list) => list.indexOf(image) === index)
        .slice(0, 3);

    if (imagePathInput) {
        imagePathInput.value = selectedProductImages[0] || "";
        imagePathInput.dataset.images = JSON.stringify(selectedProductImages);
    }

    renderImagePreview();
};

window.setAmaProductImages = setSelectedProductImages;

const getFormProductImages = () => {
    let images = selectedProductImages;

    if (imagePathInput?.dataset.images) {
        try {
            const parsedImages = JSON.parse(imagePathInput.dataset.images);
            if (Array.isArray(parsedImages)) images = parsedImages;
        } catch (error) {
            images = selectedProductImages;
        }
    }

    if (!images.length && productForm?.image.value) {
        images = [productForm.image.value];
    }

    return images
        .map((image) => String(image || "").trim())
        .filter(Boolean)
        .slice(0, 3);
};

const setProductSaving = (saving, mode = "add") => {
    isSavingProduct = saving;

    if (submitButton) {
        submitButton.disabled = saving;
        submitButton.textContent = saving
            ? mode === "edit" ? "Saving..." : "Adding..."
            : editingProductId ? "Save Product" : "Add Product";
    }

    if (cancelButton) {
        cancelButton.disabled = saving;
    }

    if (saving) {
        window.holdAmaLoader?.(mode === "edit" ? "Saving product..." : "Adding product...");
    } else {
        window.releaseAmaLoader?.();
    }
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

    productList.innerHTML = products.map((product) => {
        const productImages = getProductImages(product);

        return `
        <div class="admin-product-row">
            <img src="${escapeHtml(productImages[0] || product.image)}" alt="${escapeHtml(product.name)}">
            <div>
                <strong>${product.name}</strong>
                <span>${formatNaira(product.price)} • ${product.category} • ${placementLabels[product.placement] || "Shop + Lookbook"} • Stock ${product.stock}</span>
            </div>
            <div class="admin-product-actions">
                <button type="button" data-edit-product="${product._id}">Edit</button>
                <button type="button" data-delete-product="${product._id}">Delete</button>
            </div>
        </div>
    `;
    }).join("");
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

const getOrderCustomerName = (order) => order.contact?.name || order.customer?.name || "Customer";
const getOrderCustomerEmail = (order) => order.contact?.email || order.customer?.email || "";
const getOrderStatus = (order) => (orderStatusLabels[order.status] ? order.status : "pending");
const getOrderItemsCount = (order) => (order.items || []).reduce((total, item) => total + Number(item.quantity || 1), 0);

const getOrderProductImage = (item) => item.product?.image || "./Imgs/LOGO.jpeg";
const getOrderProductName = (item) => item.name || item.product?.name || "Product";
const getOrderPrimaryProductName = (order) => {
    const items = order.items || [];
    if (!items.length) return "order";

    const firstName = getOrderProductName(items[0]);
    return items.length > 1 ? `${firstName} + ${items.length - 1} more` : firstName;
};

const renderOrders = (orders) => {
    currentOrders = orders;
    const paidOrders = orders.filter((order) => ["paid", "delivered"].includes(order.status));
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
        const customerName = getOrderCustomerName(order);
        const customerEmail = getOrderCustomerEmail(order);
        const itemCount = getOrderItemsCount(order);
        const status = getOrderStatus(order);

        return `
            <article class="admin-order-row" data-order-id="${order._id}" tabindex="0" role="button" aria-label="View order from ${escapeHtml(customerName)}">
                <div>
                    <strong>${escapeHtml(customerName)}</strong>
                    <span>${escapeHtml(customerEmail)} &bull; ${itemCount} item${itemCount === 1 ? "" : "s"} &bull; ${formatOrderDate(order.createdAt)}</span>
                </div>
                <div class="admin-order-payment">
                    <strong>${formatNaira(order.total)}</strong>
                    <span>${formatPaymentMethod(order.paymentMethod)}</span>
                </div>
                <mark class="${status}">${escapeHtml(orderStatusLabels[status])}</mark>
            </article>
        `;
    }).join("");
};

const renderOrderModal = (order) => {
    if (!orderModalContent) return;

    const status = getOrderStatus(order);
    const customerName = getOrderCustomerName(order);
    const customerEmail = getOrderCustomerEmail(order);
    const modalStatusOptions = editableOrderStatuses.includes(status)
        ? orderStatusOptions
        : [{ value: status, label: orderStatusLabels[status] || status, disabled: true }, ...orderStatusOptions];
    const statusOptions = modalStatusOptions.map((option) => `
        <option value="${option.value}"${option.value === status ? " selected" : ""}${option.disabled ? " disabled" : ""}>${option.label}</option>
    `).join("");
    const items = order.items || [];
    const orderItems = items.length ? items.map((item) => `
        <article class="admin-order-item">
            <img src="${escapeHtml(getOrderProductImage(item))}" alt="${escapeHtml(getOrderProductName(item))}">
            <div>
                <strong>${escapeHtml(getOrderProductName(item))}</strong>
                <span>${Number(item.quantity || 1)} x ${formatNaira(item.price)}</span>
            </div>
            <b>${formatNaira(Number(item.price || 0) * Number(item.quantity || 1))}</b>
        </article>
    `).join("") : `<p class="admin-empty">No products found for this order.</p>`;

    orderModalContent.innerHTML = `
        <p class="admin-order-kicker">Order Details</p>
        <h2 id="orderModalTitle">${escapeHtml(customerName)}</h2>
        <p class="admin-order-modal-subtitle">${escapeHtml(customerEmail)} &bull; ${formatOrderDate(order.createdAt)}</p>

        <div class="admin-order-modal-products">
            ${orderItems}
        </div>

        <div class="admin-order-modal-meta">
            <div>
                <span>Total</span>
                <strong>${formatNaira(order.total)}</strong>
            </div>
            <div>
                <span>Payment</span>
                <strong>${formatPaymentMethod(order.paymentMethod)}</strong>
            </div>
            <div>
                <span>Phone</span>
                <strong>${escapeHtml(order.contact?.phone || "Not provided")}</strong>
            </div>
            <div>
                <span>Address</span>
                <strong>${escapeHtml([order.shippingAddress?.address, order.shippingAddress?.city].filter(Boolean).join(", ") || "Not provided")}</strong>
            </div>
        </div>

        <div class="admin-order-modal-actions">
            <label>
                Status
                <select class="${status}" data-order-status="${order._id}">
                    ${statusOptions}
                </select>
            </label>
            <button class="admin-order-update" type="button" data-update-order-status="${order._id}" disabled>Update</button>
            <button class="admin-order-delete" type="button" data-delete-order="${order._id}">Delete Order</button>
        </div>
        <div class="admin-order-delete-confirm" data-order-delete-confirm hidden>
            <div>
                <strong>Delete this order?</strong>
                <span>This removes it from recent orders permanently.</span>
            </div>
            <div>
                <button class="admin-link" type="button" data-cancel-order-delete>Cancel</button>
                <button class="admin-danger" type="button" data-confirm-order-delete="${order._id}">Delete order</button>
            </div>
        </div>
    `;
};

const openOrderModal = (id) => {
    const order = currentOrders.find((item) => item._id === id);
    if (!order || !orderModal) return;

    selectedOrderId = id;
    renderOrderModal(order);
    orderModal.hidden = false;
    document.body.classList.add("modal-open");
};

const closeOrderModal = () => {
    selectedOrderId = "";
    pendingDeleteOrderId = "";
    if (orderModal) orderModal.hidden = true;
    document.body.classList.remove("modal-open");
};

const updateOrderStatus = async (id, status, selectEl, buttonEl) => {
    const label = orderStatusLabels[status] || status;
    const order = currentOrders.find((item) => item._id === id);
    const customerName = order ? getOrderCustomerName(order) : "Customer";
    const productName = order ? getOrderPrimaryProductName(order) : "order";

    if (selectEl) selectEl.disabled = true;
    if (buttonEl) {
        buttonEl.disabled = true;
        buttonEl.textContent = "Updating...";
    }

    try {
        const updatedOrderResponse = await apiRequest(`/orders/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status })
        });
        const notification = updatedOrderResponse.notification;
        const notificationMessage = notification?.sent
            ? `Email sent to ${getOrderCustomerEmail(updatedOrderResponse) || "customer"}.`
            : notification?.reason || "Status saved. Email was not sent.";
        showAdminToast("AMA STORE", `${customerName}'s ${productName} is now ${label}. ${notificationMessage}`);
        await loadOrders({ manual: true });
        const updatedOrder = currentOrders.find((order) => order._id === id);
        if (updatedOrder && selectedOrderId === id) renderOrderModal(updatedOrder);
    } catch (error) {
        showAdminToast("Order update failed", error.message);
        await loadOrders({ manual: true });
    } finally {
        if (selectEl) selectEl.disabled = false;
        if (buttonEl) {
            buttonEl.textContent = "Update";
        }
    }
};

const openOrderDeleteConfirm = (id) => {
    pendingDeleteOrderId = id;
    const panel = orderModal?.querySelector("[data-order-delete-confirm]");
    const deleteButton = orderModal?.querySelector("[data-delete-order]");

    if (panel) panel.hidden = false;
    if (deleteButton) deleteButton.hidden = true;
};

const closeOrderDeleteConfirm = () => {
    pendingDeleteOrderId = "";
    const panel = orderModal?.querySelector("[data-order-delete-confirm]");
    const deleteButton = orderModal?.querySelector("[data-delete-order]");
    const confirmButton = orderModal?.querySelector("[data-confirm-order-delete]");

    if (panel) panel.hidden = true;
    if (deleteButton) deleteButton.hidden = false;
    if (confirmButton) {
        confirmButton.disabled = false;
        confirmButton.textContent = "Delete order";
    }
};

const deleteOrder = async (id, button) => {
    const order = currentOrders.find((item) => item._id === id);
    const customerName = order ? getOrderCustomerName(order) : "this order";

    if (pendingDeleteOrderId !== id) {
        openOrderDeleteConfirm(id);
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = "Deleting orders...";
    }

    try {
        await apiRequest(`/orders/${id}`, { method: "DELETE" });
        showAdminToast("Order deleted", `${customerName}'s order has been removed.`);
        pendingDeleteOrderId = "";
        closeOrderModal();
        loadOrders({ manual: true });
    } catch (error) {
        showAdminToast("Deleting orders...", "Please try again.");
        if (button) {
            button.disabled = false;
            button.textContent = "Delete order";
        }
        closeOrderDeleteConfirm();
    }
};

const loadOrders = async ({ manual = false } = {}) => {
    if (isLoadingOrders) return;

    isLoadingOrders = true;
    if (ordersRefreshButton) ordersRefreshButton.disabled = true;
    if (ordersStatusEl) ordersStatusEl.textContent = manual ? "Refreshing..." : "Loading recent orders...";
    if (ordersList && !ordersList.querySelector(".admin-order-row")) {
        ordersList.innerHTML = `<p class="admin-empty">Loading recent orders...</p>`;
    }

    try {
        const orders = await apiRequest("/orders");
        const newestOrder = orders[0];
        const newestOrderId = newestOrder?._id || "";

        if (latestOrderId && newestOrderId && newestOrderId !== latestOrderId) {
            const customerName = newestOrder.contact?.name || newestOrder.customer?.name || "Customer";
            showAdminToast("New order received", `${customerName} placed an order for ${formatNaira(newestOrder.total)}.`);
        }

        latestOrderId = newestOrderId || latestOrderId;
        renderOrders(orders);
    } catch (error) {
        if (ordersStatusEl) ordersStatusEl.textContent = "Orders unavailable";
        if (ordersList && !ordersList.querySelector(".admin-order-row")) {
            ordersList.innerHTML = `<p class="admin-empty">We are having problem fetching orders.</p>`;
        }
    } finally {
        isLoadingOrders = false;
        if (ordersRefreshButton) ordersRefreshButton.disabled = false;
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
        setSelectedProductImages(getProductImages(product));
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

        if (isSavingProduct) return;

        const images = getFormProductImages();
        if (!images.length) {
            setProductMessage("Choose at least 1 product image before saving.", "error");
            openImagePicker();
            return;
        }

        const product = {
            name: productForm.name.value,
            price: Number(cleanNumber(productForm.price.value)),
            image: images[0] || productForm.image.value,
            images,
            category: productForm.category.value,
            placement: productForm.placement.value,
            stock: Number(productForm.stock.value || 0),
            featured: productForm.featured.checked
        };
        const placementLabel = placementLabels[product.placement] || "Shop + Lookbook";

        try {
            const path = editingProductId ? `/products/${editingProductId}` : "/products";
            const method = editingProductId ? "PUT" : "POST";
            const mode = editingProductId ? "edit" : "add";
            setProductSaving(true, mode);
            setProductMessage(mode === "edit" ? "Saving product..." : "Adding product...");
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
        } finally {
            setProductSaving(false, editingProductId ? "edit" : "add");
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
imageSummaryInput?.addEventListener("click", openImagePicker);
imagePickButton?.addEventListener("click", openImagePicker);
imagePathInput?.addEventListener("input", () => {
    if (imagePathInput) imagePathInput.dataset.images = "";
    setSelectedProductImages(imagePathInput?.value ? [imagePathInput.value] : []);
});

imageFileInput?.addEventListener("change", () => {
    const files = [...(imageFileInput.files || [])].slice(0, 3);
    if (!files.length) return;

    Promise.all(files.map((file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(reader.result));
        reader.addEventListener("error", () => reject(new Error("Could not read that image. Please choose another file.")));
        reader.readAsDataURL(file);
    }))).then((images) => {
        setSelectedProductImages(images);
        setProductMessage(`Selected ${images.length} image${images.length === 1 ? "" : "s"} from your gallery.`, "success");
    }).catch((error) => {
        setProductMessage(error.message, "error");
    });
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
    if (event.key === "Escape") {
        closeDeleteModal();
        closeOrderModal();
    }
});

if (cancelButton) {
    cancelButton.addEventListener("click", resetProductForm);
}

renderImagePreview();

ordersRefreshButton?.addEventListener("click", () => {
    loadOrders({ manual: true });
});

ordersList?.addEventListener("click", (event) => {
    const row = event.target.closest("[data-order-id]");

    if (row) {
        openOrderModal(row.dataset.orderId);
    }
});

ordersList?.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;

    const row = event.target.closest("[data-order-id]");
    if (row) {
        event.preventDefault();
        openOrderModal(row.dataset.orderId);
    }
});

orderModal?.addEventListener("change", (event) => {
    const selectEl = event.target;
    const id = selectEl.dataset.orderStatus;

    if (id) {
        const order = currentOrders.find((item) => item._id === id);
        const nextStatus = selectEl.value;
        const updateButton = orderModal.querySelector(`[data-update-order-status="${id}"]`);

        selectEl.className = nextStatus;
        if (updateButton) {
            updateButton.disabled = !order || getOrderStatus(order) === nextStatus;
        }
    }
});

orderModal?.addEventListener("click", (event) => {
    if (event.target.matches("[data-order-modal-close]")) {
        closeOrderModal();
        return;
    }

    const id = event.target.dataset.deleteOrder;
    const updateStatusId = event.target.dataset.updateOrderStatus;

    if (updateStatusId) {
        const selectEl = orderModal.querySelector(`[data-order-status="${updateStatusId}"]`);
        if (selectEl) {
            updateOrderStatus(updateStatusId, selectEl.value, selectEl, event.target);
        }
        return;
    }

    if (id) {
        openOrderDeleteConfirm(id);
        return;
    }

    if (event.target.matches("[data-cancel-order-delete]")) {
        closeOrderDeleteConfirm();
        return;
    }

    const confirmDeleteId = event.target.dataset.confirmOrderDelete;

    if (confirmDeleteId) {
        deleteOrder(confirmDeleteId, event.target);
    }
});

verifyAdmin().then(() => {
    loadProducts();
    loadOrders();
    setInterval(loadOrders, 15000);
});
