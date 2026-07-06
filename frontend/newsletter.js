const newsletterForm = document.querySelector("[data-newsletter-form]");
const newsletterMessage = document.querySelector("[data-newsletter-message]");
const isLocalNewsletterFrontend = ["127.0.0.1", "localhost"].includes(window.location.hostname) && window.location.port !== "5000";
const NEWSLETTER_API_BASE = isLocalNewsletterFrontend ? "http://localhost:5000/api" : "/api";

const setNewsletterMessage = (message, type = "") => {
    if (!newsletterMessage) return;
    newsletterMessage.textContent = message;
    newsletterMessage.className = `newsletter-message ${type}`.trim();
};

const parseApiMessage = async (response) => {
    const responseText = await response.text();

    try {
        const data = JSON.parse(responseText);
        return data.message || "";
    } catch (error) {
        return responseText.trim();
    }
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
                    email: newsletterForm.email.value.trim(),
                    source: "home"
                })
            });

            const message = await parseApiMessage(response);
            if (!response.ok) {
                throw new Error(message || "Could not join the updates list. Check the API and database connection.");
            }

            newsletterForm.reset();
            setNewsletterMessage(message || "You're on the list. We'll send new-drop updates first.", "success");
        } catch (error) {
            const fallbackMessage = isLocalNewsletterFrontend
                ? "Could not reach the local backend. Start it on port 5000, then try again."
                : "Could not join the updates list. Check the database connection, then try again.";
            const message = error instanceof TypeError ? fallbackMessage : error.message || fallbackMessage;
            setNewsletterMessage(message, "error");
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
}
