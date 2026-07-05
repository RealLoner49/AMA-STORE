const productGrids = document.querySelectorAll("[data-products-grid]");
const lookbookGallery = document.querySelector("[data-lookbook-gallery]");
const lookbookCollections = document.querySelector("[data-lookbook-collections]");
const isLocalFrontend = ["127.0.0.1", "localhost"].includes(window.location.hostname) && window.location.port !== "5000";
const API_BASES = isLocalFrontend ? ["http://localhost:5000/api", "/api"] : ["/api"];
const pageType = document.body.dataset.productsPage || "";
const filterInputs = document.querySelectorAll("[data-filter-type]");
let availableProducts = [];
let activeProduct = null;
let toastTimer;

const placementLabels = {
    shop: "Shop page",
    lookbook: "Lookbook page",
    both: "Shop + Lookbook"
};

const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatNaira = (price) => {
    const amount = Number(price || 0);
    const nairaAmount = amount > 0 && amount < 1000 ? amount * 1000 : amount;

    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0
    }).format(nairaAmount);
};

const renderProductCard = (product, showCart) => `
    <div class="product-card" data-product-id="${escapeHtml(product._id)}" tabindex="0" role="button" aria-label="View ${escapeHtml(product.name)} details">
        <div class="product-image">
            <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
        </div>
        <h3 class="product-name">${escapeHtml(product.name)}</h3>
        <p class="product-price">${formatNaira(product.price)}</p>
        ${showCart ? `<button class="add-to-cart" type="button">ADD TO CART</button>` : ""}
    </div>
`;

const renderLookbookItem = (product, index) => `
    <div class="lookbook-item ${index === 0 || index === 5 ? "large" : ""}" data-product-id="${escapeHtml(product._id)}" tabindex="0" role="button" aria-label="View ${escapeHtml(product.name)} details">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
        <div class="lookbook-overlay">
            ${index === 0 || index === 5 ? `<h2>${escapeHtml(product.category || "AMA Collection")}</h2><p>${formatNaira(product.price)}</p>` : `<h3>${escapeHtml(product.name)}</h3>`}
            <button type="button" class="${index === 0 || index === 5 ? "lookbook-btn" : "lookbook-link"}">VIEW DETAILS</button>
        </div>
    </div>
`;

const renderCollectionCard = (product) => `
    <div class="collection-card">
        <div class="collection-image">
            <img src="${product.image}" alt="${product.category}">
        </div>
        <h3>${product.category}</h3>
        <p>${product.name} - ${formatNaira(product.price)}</p>
        <a href="shop.html">Explore</a>
    </div>
`;

const renderEmptyState = (message) => `<p class="products-empty">${message}</p>`;

const renderProductModal = () => {
    if (document.querySelector("[data-product-modal]")) return;

    document.body.insertAdjacentHTML("beforeend", `
        <div class="product-modal" data-product-modal hidden>
            <div class="product-modal-backdrop" data-modal-close></div>
            <section class="product-modal-panel" role="dialog" aria-modal="true" aria-labelledby="productModalTitle">
                <button class="product-modal-close" type="button" data-modal-close aria-label="Close product details">&times;</button>
                <div class="product-modal-image">
                    <img data-modal-image alt="">
                </div>
                <div class="product-modal-content">
                    <p class="product-modal-kicker" data-modal-category></p>
                    <h2 id="productModalTitle" data-modal-name></h2>
                    <p class="product-modal-price" data-modal-price></p>
                    <p class="product-modal-copy" data-modal-copy></p>
                    <div class="product-modal-meta">
                        <div>
                            <span>Availability</span>
                            <strong data-modal-availability></strong>
                        </div>
                        <div>
                            <span>Stock</span>
                            <strong data-modal-stock></strong>
                        </div>
                        <div>
                            <span>Collection</span>
                            <strong data-modal-placement></strong>
                        </div>
                        <div>
                            <span>Featured</span>
                            <strong data-modal-featured></strong>
                        </div>
                    </div>
                    <div class="product-modal-actions">
                        <button class="product-modal-primary" type="button" data-modal-add-cart>Add To Cart</button>
                        <button type="button" data-modal-close>Keep Browsing</button>
                    </div>
                </div>
            </section>
        </div>
    `);
};

const renderToast = () => {
    if (document.querySelector("[data-toast]")) return;

    document.body.insertAdjacentHTML("beforeend", `
        <div class="cart-toast" data-toast role="status" aria-live="polite" hidden>
            <div class="cart-toast-icon">+</div>
            <div>
                <strong data-toast-title>Added to cart</strong>
                <span data-toast-message></span>
            </div>
            <a href="cart.html">View Cart</a>
        </div>
    `);
};

const setText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
};

const openProductModal = (product) => {
    const modal = document.querySelector("[data-product-modal]");
    if (!modal) return;

    activeProduct = product;
    const image = modal.querySelector("[data-modal-image]");
    if (image) {
        image.src = product.image;
        image.alt = product.name;
    }

    const stock = Number(product.stock || 0);
    setText("[data-modal-category]", product.category || "AMA Collection");
    setText("[data-modal-name]", product.name || "AMA Product");
    setText("[data-modal-price]", formatNaira(product.price));
    setText("[data-modal-copy]", `${product.name} is part of the ${product.category || "AMA"} range, made for clean styling, comfort, and confident everyday movement.`);
    setText("[data-modal-availability]", stock > 0 ? "In stock" : "Out of stock");
    setText("[data-modal-stock]", `${stock} item${stock === 1 ? "" : "s"}`);
    setText("[data-modal-placement]", placementLabels[product.placement] || "Shop + Lookbook");
    setText("[data-modal-featured]", product.featured ? "Yes" : "No");

    modal.hidden = false;
    document.body.classList.add("modal-open");
    modal.querySelector(".product-modal-close")?.focus();
};

const closeProductModal = () => {
    const modal = document.querySelector("[data-product-modal]");
    if (!modal || modal.hidden) return;

    modal.hidden = true;
    document.body.classList.remove("modal-open");
    activeProduct = null;
};

const showToast = (product) => {
    const toast = document.querySelector("[data-toast]");
    if (!toast) return;

    setText("[data-toast-title]", "Added to cart");
    setText("[data-toast-message]", `${product.name} is now in your cart.`);
    toast.hidden = false;
    toast.classList.add("is-visible");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove("is-visible");
        setTimeout(() => {
            toast.hidden = true;
        }, 220);
    }, 2800);
};

const addToCart = (product) => {
    const cart = JSON.parse(localStorage.getItem("amaCart") || "[]");
    const existingItem = cart.find((item) => item._id === product._id);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            _id: product._id,
            name: product.name,
            price: product.price,
            image: product.image,
            category: product.category,
            quantity: 1
        });
    }

    localStorage.setItem("amaCart", JSON.stringify(cart));
    window.updateAmaCartCount?.();
    showToast(product);
};

const uniqueByCategory = (products) => {
    const seen = new Set();

    return products.filter((product) => {
        const category = product.category || "Collection";
        if (seen.has(category)) return false;
        seen.add(category);
        return true;
    });
};

const fetchProducts = async (query) => {
    let lastError;

    for (const apiBase of API_BASES) {
        try {
            const response = await fetch(`${apiBase}/products${query}`);
            if (!response.ok) throw new Error(`Products request failed with ${response.status}.`);
            return response.json();
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("Products request failed.");
};

const getProductValues = (product, key) => {
    const value = product[key];
    if (!value) return [];
    return Array.isArray(value) ? value.map(String) : [String(value)];
};

const getActiveFilters = () => {
    const filters = {
        price: [],
        size: [],
        color: []
    };

    filterInputs.forEach((input) => {
        if (!input.checked) return;

        if (input.dataset.filterType === "price") {
            filters.price.push({
                min: Number(input.dataset.min || 0),
                max: input.dataset.max ? Number(input.dataset.max) : Infinity
            });
        }

        if (input.dataset.filterType === "size") {
            filters.size.push(input.value.toLowerCase());
        }

        if (input.dataset.filterType === "color") {
            filters.color.push(input.value.toLowerCase());
        }
    });

    return filters;
};

const productMatchesFilters = (product, filters) => {
    const price = Number(product.price || 0);
    const productSizes = getProductValues(product, "sizes").map((size) => size.toLowerCase());
    const productColors = getProductValues(product, "colors").concat(getProductValues(product, "color")).map((color) => color.toLowerCase());

    const matchesPrice = !filters.price.length || filters.price.some((range) => price >= range.min && price <= range.max);
    const matchesSize = !filters.size.length || filters.size.some((size) => productSizes.includes(size));
    const matchesColor = !filters.color.length || filters.color.some((color) => productColors.includes(color));

    return matchesPrice && matchesSize && matchesColor;
};

const renderProductGrids = (products) => {
    productGrids.forEach((productsGrid) => {
        const limit = Number(productsGrid.dataset.productsLimit || 0);
        const gridProducts = limit > 0 ? products.slice(0, limit) : products;

        productsGrid.innerHTML = gridProducts.length
            ? gridProducts.map((product) => renderProductCard(product, productsGrid.hasAttribute("data-show-cart"))).join("")
            : renderEmptyState("No products match the selected filters.");
    });
};

const applyFilters = () => {
    if (!filterInputs.length) return;
    const filters = getActiveFilters();
    renderProductGrids(availableProducts.filter((product) => productMatchesFilters(product, filters)));
};

const loadProducts = async () => {
    if (!productGrids.length && !lookbookGallery && !lookbookCollections) return;

    try {
        const query = pageType ? `?page=${encodeURIComponent(pageType)}` : "";
        const products = await fetchProducts(query);
        availableProducts = Array.isArray(products) ? products : [];
        if (!Array.isArray(products) || products.length === 0) {
            productGrids.forEach((productsGrid) => {
                productsGrid.innerHTML = renderEmptyState("No products available yet.");
            });

            if (lookbookGallery) {
                lookbookGallery.innerHTML = renderEmptyState("No lookbook products available yet.");
            }

            if (lookbookCollections) {
                lookbookCollections.innerHTML = renderEmptyState("No featured collections available yet.");
            }

            return;
        }

        renderProductGrids(products);

        if (lookbookGallery) {
            lookbookGallery.innerHTML = products
                .slice(0, 8)
                .map(renderLookbookItem)
                .join("");
        }

        if (lookbookCollections) {
            lookbookCollections.innerHTML = uniqueByCategory(products)
                .slice(0, 3)
                .map(renderCollectionCard)
                .join("");
        }
    } catch (error) {
        productGrids.forEach((productsGrid) => {
            productsGrid.innerHTML = renderEmptyState("Products are temporarily unavailable.");
        });

        if (lookbookGallery) {
            lookbookGallery.innerHTML = renderEmptyState("Lookbook products are temporarily unavailable.");
        }

        if (lookbookCollections) {
            lookbookCollections.innerHTML = renderEmptyState("Featured collections are temporarily unavailable.");
        }
    }
};

renderProductModal();
renderToast();
filterInputs.forEach((input) => input.addEventListener("change", applyFilters));

document.addEventListener("click", (event) => {
    if (event.target.closest("[data-modal-close]")) {
        closeProductModal();
        return;
    }

    if (event.target.closest("[data-modal-add-cart]")) {
        if (activeProduct) addToCart(activeProduct);
        return;
    }

    const card = event.target.closest("[data-product-id]");
    if (!card) return;

    const product = availableProducts.find((item) => item._id === card.dataset.productId);
    if (!product) return;

    if (event.target.closest(".add-to-cart")) {
        addToCart(product);
        return;
    }

    if (product) openProductModal(product);
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeProductModal();
        return;
    }

    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest?.("[data-product-id]");
    if (!card) return;

    event.preventDefault();
    const product = availableProducts.find((item) => item._id === card.dataset.productId);
    if (product) openProductModal(product);
});

loadProducts();
