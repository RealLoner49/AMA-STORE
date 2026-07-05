const newsletterForm = document.querySelector("[data-newsletter-form]");
const newsletterMessage = document.querySelector("[data-newsletter-message]");
const isLocalNewsletterFrontend = ["127.0.0.1", "localhost"].includes(window.location.hostname) && window.location.port !== "5000";
const NEWSLETTER_API_BASE = isLocalNewsletterFrontend ? "http://localhost:5000/api" : "/api";

const setNewsletterMessage = (message, type = "") => {
    if (!newsletterMessage) return;
    newsletterMessage.textContent = message;
    newsletterMessage.className = `newsletter-message ${type}`.trim();
};

if (newsletterForm) {
    newsletterForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const submitButton = newsletterForm.querySelector("button[type='submit']");
        if (submitButton) submitButton.disabled = true;
        setNewsletterMessage("Joining list...");

        try {
            const response = await fetch(`${NEWSLETTER_API_BASE}/newsletter`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: newsletterForm.email.value,
                    source: "home"
                })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || "Could not join the updates list.");

            newsletterForm.reset();
            setNewsletterMessage(data.message, "success");
        } catch (error) {
            setNewsletterMessage(error.message, "error");
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
}
