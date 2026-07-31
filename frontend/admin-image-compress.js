(function () {
    const imageFileInput = document.querySelector("[data-image-file]");
    const imagePathInput = document.querySelector("[data-image-path]");
    const productMessage = document.querySelector("[data-product-message]");

    if (!imageFileInput || !imagePathInput) return;

    const maxSide = 1100;
    const targetBytes = 700 * 1024;
    const minQuality = 0.52;

    const setMessage = (message, type = "") => {
        if (!productMessage) return;
        productMessage.textContent = message;
        productMessage.className = `admin-message ${type}`.trim();
    };

    const loadImage = (file) => new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);

        image.addEventListener("load", () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        });
        image.addEventListener("error", () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Could not read that image. Please choose another file."));
        });
        image.src = objectUrl;
    });

    const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(reader.result));
        reader.addEventListener("error", () => reject(new Error("Could not read that image. Please choose another file.")));
        reader.readAsDataURL(file);
    });

    const dataUrlBytes = (dataUrl) => Math.ceil((String(dataUrl).length * 3) / 4);

    const compressImage = async (file) => {
        if (file.type === "image/svg+xml") {
            return readFileAsDataUrl(file);
        }

        const image = await loadImage(file);
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0, width, height);

        let quality = 0.78;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);

        while (dataUrlBytes(dataUrl) > targetBytes && quality > minQuality) {
            quality = Math.max(minQuality, quality - 0.08);
            dataUrl = canvas.toDataURL("image/jpeg", quality);
        }

        return dataUrl;
    };

    imageFileInput.addEventListener("change", async (event) => {
        const file = imageFileInput.files?.[0];
        if (!file) return;

        event.stopImmediatePropagation();

        if (!file.type.startsWith("image/")) {
            setMessage("Please choose an image file.", "error");
            return;
        }

        setMessage("Optimizing image for upload...");

        try {
            const dataUrl = await compressImage(file);
            imagePathInput.value = dataUrl;
            setMessage(`Selected ${file.name}. Image is ready to upload.`, "success");
        } catch (error) {
            imagePathInput.value = "";
            setMessage(error.message, "error");
        }
    }, true);
})();
